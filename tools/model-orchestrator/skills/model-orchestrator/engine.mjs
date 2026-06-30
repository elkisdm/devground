#!/usr/bin/env node
// Motor determinístico del model-orchestrator.
// Las INVARIANTES de routing viven AQUÍ, en código probado — no en el juicio del agente
// model-router (que corre en Haiku y puede proponer asignaciones que violan las reglas).
// El agente PROPONE; este motor VALIDA, RECORTA y construye el plan.
//
// Uso (CLI, todo JSON por stdout):
//   node engine.mjs floor   '<task|[tasks]>'                 → asignación(es) de piso
//   node engine.mjs clamp   '<{floor,proposal,task}>'        → asignación final recortada
//   node engine.mjs plan    <tasks.json> [proposals.json]    → routing-plan.json completo
//   node engine.mjs selftest                                 → corre la suite, exit!=0 si falla
//
// Como módulo:  import { matchFloor, clamp, estimateCost, buildPlan } from './engine.mjs'

import fs from 'fs';
import path from 'path';
import url from 'url';

const DIR = path.dirname(url.fileURLToPath(import.meta.url));
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

export const POLICY = readJson(path.join(DIR, 'policy.json'));
export const PRICING = readJson(path.join(DIR, 'pricing.json'));

// Estimación gruesa de tokens por tamaño de tarea. El orquestador puede pasar
// est_tokens explícito; si solo pasa `size`, se usa este mapa.
export const SIZE_TOKENS = {
  small:  { input: 5000,  output: 3000  },
  medium: { input: 15000, output: 10000 },
  large:  { input: 40000, output: 25000 },
};

const CAP = POLICY._meta.capability_order;   // [haiku, sonnet, opus]
const EFF = POLICY._meta.effort_order;       // [low..max]
const ci = (m) => CAP.indexOf(m);
const ei = (e) => EFF.indexOf(e);
const clampIdx = (i) => Math.max(0, Math.min(CAP.length - 1, i));

// ── Paso 2: piso declarativo (primera regla que matchea; AND dentro de la regla) ──
export function matchFloor(task, pol = POLICY) {
  const s = task.signals || {};
  for (const r of pol.rules) {
    const w = r.when; let ok = true;
    if (w.kind && !w.kind.includes(task.kind)) ok = false;
    if (w.type && !w.type.includes(s.type)) ok = false;
    if (w.tier && !w.tier.includes(s.tier)) ok = false;
    if (w.risk && !w.risk.includes(s.risk)) ok = false;
    if ('breaking' in w && w.breaking !== !!s.breaking) ok = false;
    if (ok) return { ...r.assign, rule_id: r.id, locked: !!r.locked };
  }
  return { ...pol.default.assign, rule_id: 'default', locked: false };
}

// ── Paso 3: clamp determinístico de la propuesta del agente ──
// Devuelve { model, effort, adjustment, reason }. La invariante se garantiza acá.
export function clamp(floor, proposal, task, pol = POLICY) {
  const esc = pol.escalation;
  // Propuesta inválida → se mantiene el piso.
  const valid = proposal && CAP.includes(proposal.model) && EFF.includes(proposal.effort)
    && typeof proposal.reason === 'string' && proposal.reason.trim().length > 0;
  if (!valid) {
    return { model: floor.model, effort: floor.effort, adjustment: 0,
             reason: 'propuesta del router inválida, se mantiene el piso' };
  }
  let model = proposal.model, effort = proposal.effort;
  let note = '';

  // 1) ±max_levels niveles respecto al piso
  let delta = ci(model) - ci(floor.model);
  if (Math.abs(delta) > esc.max_levels) note = `recortado a ±${esc.max_levels} nivel; `;
  delta = Math.max(-esc.max_levels, Math.min(esc.max_levels, delta));
  model = CAP[clampIdx(ci(floor.model) + delta)];

  // 2) piso bloqueado: nunca por debajo del piso (modelo ni effort)
  if (floor.locked) {
    if (ci(model) < ci(floor.model)) { model = floor.model; note += 'piso locked, no desescala; '; }
    if (ei(effort) < ei(floor.effort)) effort = floor.effort;
  }

  // 3) PISO DE DESESCALADA POR KIND — la invariante que el agente ignora:
  //    lógica nueva (feat/fix/perf/…) no baja del modelo mínimo, pida lo que pida el agente.
  if (!esc.deescalation_floor.no_new_logic_kinds.includes(task.kind)) {
    const fm = esc.deescalation_floor.min_model_with_new_logic;
    if (ci(model) < ci(fm)) { model = fm; note += `${task.kind} = lógica nueva, no baja de ${fm}; `; }
  }

  // 4) el effort acompaña al escalar el modelo
  delta = ci(model) - ci(floor.model);
  if (esc.escalation_effort.raise_effort_with_model && delta > 0 && ei(effort) <= ei(floor.effort)) {
    effort = EFF[Math.min(EFF.length - 1, ei(floor.effort) + 1)];
  }

  // 5) acotar el effort a ±max_effort_levels respecto al piso, SOLO si el modelo no cambió.
  //    Cuando el modelo se movió (±1), el effort re-ancla con el nuevo tier y queda libre
  //    (p.ej. un rename que baja a haiku/low no debe heredar el 'high' del piso sonnet).
  //    Con el modelo intacto, evita que el agente colapse high→low o lo dispare a max.
  delta = ci(model) - ci(floor.model);
  if (delta === 0) {
    const maxEff = esc.max_effort_levels ?? EFF.length;
    const eLo = Math.max(0, ei(floor.effort) - maxEff);
    const eHi = Math.min(EFF.length - 1, ei(floor.effort) + maxEff);
    let eIdx = Math.max(eLo, Math.min(eHi, ei(effort)));
    if (floor.locked) eIdx = Math.max(eIdx, ei(floor.effort)); // locked no baja el effort del piso
    if (eIdx !== ei(effort)) note += `effort recortado a ±${maxEff} del piso; `;
    effort = EFF[eIdx];
  }

  const adjustment = ci(model) - ci(floor.model);
  const reason = note ? `router pidió ${proposal.model}/${proposal.effort}; ${note}final ${model}/${effort}`
                      : proposal.reason;
  return { model, effort, adjustment, reason };
}

// ── Paso 4: costo (honesto o null) ──
export function estimateCost(model, estTokens, price = PRICING) {
  const m = price.models[model];
  if (!m || m.input == null || m.output == null) return null;
  if (!estTokens) return null;
  return +((estTokens.input / 1e6) * m.input + (estTokens.output / 1e6) * m.output).toFixed(4);
}

export function pricingStatus(models, price = PRICING) {
  const used = [...new Set(models)];
  const known = (m) => price.models[m] && price.models[m].input != null && price.models[m].output != null;
  if (!price.models) return 'unavailable';
  if (used.every(known)) return 'complete';
  if (used.some(known)) return 'partial';
  return 'unavailable';
}

// ── Construcción del plan completo (conforme a routing-plan.schema.json) ──
export function buildPlan({ change, spec_flow_tier, tasks, proposals = {}, generated = null },
                          pol = POLICY, price = PRICING) {
  const planTasks = tasks.map((t) => {
    const floor = matchFloor(t, pol);
    const assigned = clamp(floor, proposals[t.id] ?? null, t, pol);
    const est_tokens = t.est_tokens ?? (t.size ? SIZE_TOKENS[t.size] : null) ?? null;
    const est_cost_usd = estimateCost(assigned.model, est_tokens, price);
    return {
      id: t.id, title: t.title, kind: t.kind,
      signals: t.signals,
      floor, assigned: { model: assigned.model, effort: assigned.effort },
      adjustment: assigned.adjustment, reason: assigned.reason,
      depends_on: t.depends_on ?? [],
      est_tokens, est_cost_usd,
    };
  });
  const by_model = { opus: 0, sonnet: 0, haiku: 0 };
  for (const t of planTasks) by_model[t.assigned.model]++;
  const status = pricingStatus(planTasks.map((t) => t.assigned.model), price);
  const anyPending = planTasks.some((t) => t.est_cost_usd == null);
  const total = anyPending ? null
    : +planTasks.reduce((a, t) => a + (t.est_cost_usd || 0), 0).toFixed(4);
  return {
    change, generated, spec_flow_tier,
    pricing_status: status,
    tasks: planTasks,
    totals: { est_cost_usd: total, by_model },
  };
}

// ── Reconciliación: costo REAL (de tokens reales) vs estimado ──
// El orquestador, tras ejecutar un sub-agente, conoce sus tokens reales (de la
// notificación del Workflow/Agent). Esto cierra el lazo: ¿el routing acertó el costo?
export function reconcile(model, est_cost_usd, actualTokens, price = PRICING) {
  const actual_cost_usd = estimateCost(model, actualTokens, price); // misma fórmula, tokens reales
  if (actual_cost_usd == null) return { actual_cost_usd: null, delta_usd: null, delta_pct: null };
  const delta_usd = est_cost_usd == null ? null : +(actual_cost_usd - est_cost_usd).toFixed(4);
  const delta_pct = (est_cost_usd == null || est_cost_usd === 0) ? null
    : +(((actual_cost_usd - est_cost_usd) / est_cost_usd) * 100).toFixed(1);
  return { actual_cost_usd, delta_usd, delta_pct };
}

// ── Agregador de métricas sobre decisions.jsonl (insumo para dev-metrics) ──
// Mide si el balance precio/calidad funcionó: desviación estimado↔real, reparto,
// y AHORRO vs el baseline "todo en Opus" (cuánto valió rutear).
export function metrics(decisions, price = PRICING) {
  const by_model = { opus: 0, sonnet: 0, haiku: 0 };
  let est = 0, act = 0, actKnown = 0, pending = 0, escalated = 0, deescalated = 0;
  let opusBaseline = 0, absPctSum = 0, absPctN = 0;
  for (const d of decisions) {
    const m = d.assigned?.model ?? d.model;
    if (m in by_model) by_model[m]++;
    if (d.adjustment > 0) escalated++; else if (d.adjustment < 0) deescalated++;
    if (d.est_cost_usd != null) est += d.est_cost_usd; else pending++;
    if (d.actual_cost_usd != null) { act += d.actual_cost_usd; actKnown++; }
    if (d.actual_tokens) { const ob = estimateCost('opus', d.actual_tokens, price); if (ob != null) opusBaseline += ob; }
    if (d.est_cost_usd != null && d.est_cost_usd > 0 && d.actual_cost_usd != null) {
      absPctSum += Math.abs((d.actual_cost_usd - d.est_cost_usd) / d.est_cost_usd) * 100; absPctN++;
    }
  }
  return {
    tasks: decisions.length, by_model,
    est_cost_usd: +est.toFixed(4),
    actual_cost_usd: actKnown ? +act.toFixed(4) : null,
    cost_delta_usd: actKnown ? +(act - est).toFixed(4) : null,
    mean_abs_error_pct: absPctN ? +(absPctSum / absPctN).toFixed(1) : null,
    pending_pricing: pending, escalated, deescalated,
    opus_baseline_usd: opusBaseline ? +opusBaseline.toFixed(4) : null,
    savings_vs_all_opus_usd: (opusBaseline && actKnown) ? +(opusBaseline - act).toFixed(4) : null,
    savings_pct: (opusBaseline && actKnown) ? +(((opusBaseline - act) / opusBaseline) * 100).toFixed(1) : null,
  };
}

// ───────────────────────────── CLI ─────────────────────────────
function main(argv) {
  const [cmd, a, b] = argv;
  const out = (o) => process.stdout.write(JSON.stringify(o, null, 2) + '\n');
  try {
    if (cmd === 'floor') {
      const inp = JSON.parse(a);
      out(Array.isArray(inp) ? inp.map((t) => matchFloor(t)) : matchFloor(inp));
    } else if (cmd === 'clamp') {
      const { floor, proposal, task } = JSON.parse(a);
      out(clamp(floor, proposal, task));
    } else if (cmd === 'plan') {
      const tasks = readJson(a);
      const proposals = b ? readJson(b) : {};
      out(buildPlan({ ...tasks, proposals }));
    } else if (cmd === 'reconcile') {
      const { model, est_cost_usd = null, actual_tokens } = JSON.parse(a);
      out(reconcile(model, est_cost_usd, actual_tokens));
    } else if (cmd === 'metrics') {
      const lines = fs.readFileSync(a, 'utf8').split('\n').filter((l) => l.trim());
      out(metrics(lines.map((l) => JSON.parse(l))));
    } else if (cmd === 'selftest') {
      process.exit(selftest() ? 0 : 1);
    } else {
      process.stderr.write('comandos: floor | clamp | plan | reconcile | metrics | selftest\n');
      process.exit(2);
    }
  } catch (e) {
    process.stderr.write('error: ' + e.message + '\n');
    process.exit(1);
  }
}

// Suite mínima embebida (la fuente de verdad ejecutable de las invariantes).
export function selftest() {
  let pass = 0, fail = 0;
  const eq = (name, got, exp) => {
    const ok = JSON.stringify(got) === JSON.stringify(exp);
    ok ? pass++ : fail++;
    if (!ok) process.stderr.write(`✗ ${name}: got ${JSON.stringify(got)} exp ${JSON.stringify(exp)}\n`);
  };
  const F = (kind, signals) => matchFloor({ kind, signals });
  // pisos
  eq('decision→opus/max', F('decision', { type: 'feat', tier: 1 }).model, 'opus');
  eq('docs en tier2→haiku', F('docs', { type: 'docs', tier: 2 }).model, 'haiku');
  eq('test tier2→sonnet/low', F('test', { type: 'test', tier: 2 }).effort, 'low');
  eq('high-risk test→opus', F('test', { type: 'test', tier: 2, risk: 'high' }).model, 'opus');
  eq('feat tier1→sonnet', F('feat', { type: 'feat', tier: 1 }).model, 'sonnet');
  // clamps (propuestas reales del agente que validamos)
  const c = (floor, proposal, task) => clamp(floor, proposal, task);
  const r = (reason = 'x') => reason;
  eq('feat: agente haiku → sonnet',
     c({ model: 'sonnet', effort: 'medium', locked: false }, { model: 'haiku', effort: 'low', reason: r() }, { kind: 'feat' }).model, 'sonnet');
  eq('rename: agente haiku → haiku',
     c({ model: 'sonnet', effort: 'high', locked: false }, { model: 'haiku', effort: 'low', reason: r() }, { kind: 'refactor' }).model, 'haiku');
  eq('transferencia: opus +effort high',
     c({ model: 'sonnet', effort: 'medium', locked: false }, { model: 'opus', effort: 'high', reason: r() }, { kind: 'feat' }).effort, 'high');
  eq('locked: agente sonnet → opus',
     c({ model: 'opus', effort: 'max', locked: true }, { model: 'sonnet', effort: 'low', reason: r() }, { kind: 'decision' }).model, 'opus');
  eq('abuso +5 → +1 (opus)',
     c({ model: 'sonnet', effort: 'medium', locked: false }, { model: 'opus', effort: 'low', reason: r() }, { kind: 'feat' }).adjustment, 1);
  eq('escalar sube effort',
     c({ model: 'sonnet', effort: 'medium', locked: false }, { model: 'opus', effort: 'low', reason: r() }, { kind: 'feat' }).effort, 'high');
  eq('propuesta inválida → piso',
     c({ model: 'sonnet', effort: 'medium', locked: false }, { model: 'gpt', effort: 'low', reason: r() }, { kind: 'feat' }).model, 'sonnet');
  eq('sin reason → piso',
     c({ model: 'sonnet', effort: 'medium', locked: false }, { model: 'opus', effort: 'high', reason: '' }, { kind: 'feat' }).adjustment, 0);
  // effort clamp: modelo intacto → effort acotado ±1; modelo movido → effort libre
  eq('effort: feat high→low recortado a medium (modelo intacto)',
     c({ model: 'sonnet', effort: 'high', locked: false }, { model: 'sonnet', effort: 'low', reason: r() }, { kind: 'feat' }).effort, 'medium');
  eq('effort: rename baja a haiku/low (modelo movido, effort libre)',
     c({ model: 'sonnet', effort: 'high', locked: false }, { model: 'haiku', effort: 'low', reason: r() }, { kind: 'refactor' }), { model: 'haiku', effort: 'low', adjustment: -1, reason: r() });
  eq('effort: feat pide low desde piso medium → low (dentro de ±1)',
     c({ model: 'sonnet', effort: 'medium', locked: false }, { model: 'sonnet', effort: 'low', reason: r() }, { kind: 'feat' }).effort, 'low');
  eq('effort: salto a max recortado (piso medium →high)',
     c({ model: 'sonnet', effort: 'medium', locked: false }, { model: 'sonnet', effort: 'max', reason: r() }, { kind: 'feat' }).effort, 'high');
  // costo honesto
  eq('haiku tiene costo', typeof estimateCost('haiku', SIZE_TOKENS.small), 'number');
  eq('sonnet5 ya tiene tarifa', typeof estimateCost('sonnet', SIZE_TOKENS.small), 'number');
  eq('modelo sin tarifa → costo null', estimateCost('inexistente', SIZE_TOKENS.small), null);
  // plan
  const plan = buildPlan({
    change: 't', spec_flow_tier: 2, generated: '2026-06-30T00:00:00-04:00',
    tasks: [
      { id: 1, title: 'decidir', kind: 'decision', size: 'medium', signals: { type: 'feat', tier: 2, risk: 'med' }, depends_on: [] },
      { id: 2, title: 'README', kind: 'docs', size: 'small', signals: { type: 'docs', tier: 2, risk: 'med' }, depends_on: [1] },
    ],
    proposals: { 1: { model: 'haiku', effort: 'low', reason: 'parece simple' } },
  });
  eq('plan: decisión locked ignora propuesta haiku', plan.tasks[0].assigned.model, 'opus');
  eq('plan: README haiku', plan.tasks[1].assigned.model, 'haiku');
  eq('plan: by_model', plan.totals.by_model, { opus: 1, sonnet: 0, haiku: 1 });
  // reconciliación: haiku $1/$5; 1M in + 1M out = $6 real; estimado $4 → delta +$2 (+50%)
  const rec = reconcile('haiku', 4.0, { input: 1e6, output: 1e6 });
  eq('reconcile actual_cost', rec.actual_cost_usd, 6.0);
  eq('reconcile delta_usd', rec.delta_usd, 2.0);
  eq('reconcile delta_pct', rec.delta_pct, 50.0);
  eq('reconcile sin tarifa → null', reconcile('opus', 1, null).actual_cost_usd, null);
  // métricas: 2 tareas con tokens reales; ahorro vs todo-opus
  const mx = metrics([
    { model: 'haiku', adjustment: -1, est_cost_usd: 0.02, actual_cost_usd: 0.024, actual_tokens: { input: 5000, output: 3000 } },
    { model: 'opus', adjustment: 0, est_cost_usd: 0.325, actual_cost_usd: 0.30, actual_tokens: { input: 15000, output: 10000 } },
  ]);
  eq('metrics by_model', mx.by_model, { opus: 1, sonnet: 0, haiku: 1 });
  eq('metrics savings>0 (rutear ahorró vs todo-opus)', mx.savings_vs_all_opus_usd > 0, true);
  eq('metrics deescalated', mx.deescalated, 1);
  process.stdout.write(`\n${pass} pasaron, ${fail} fallaron\n`);
  return fail === 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(url.fileURLToPath(import.meta.url))) {
  main(process.argv.slice(2));
}
