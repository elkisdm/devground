import type { RepoImpact, MetricDelta, ImpactMetricKey } from './spec-flow-segment.js';
import type { TierFriction } from './spec-flow-events.js';
import type { AggregatedReviewLoop, AggregatedFirstPassArm } from './spec-flow-review-loop.js';
import type { DiscardedRepo } from './repo-discovery.js';

/**
 * Renders the spec-flow impact comparison as markdown. The report is honest by
 * construction: it shows per-repo n's and windows, never pools raw counts, and
 * lists repos with no usable baseline instead of silently dropping them. Pure —
 * nothing here writes to stdout (L-11); the caller decides what to do with the
 * returned string.
 */

function pctStr(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

/** Is this metric a 0..1 rate (render as %) or a raw number? */
function isRate(metric: ImpactMetricKey): boolean {
  return (
    metric === 'testCouplingRate' || metric === 'adrCouplingRate' || metric === 'netGrossRatio'
  );
}

function fmt(metric: ImpactMetricKey, value: number | null): string {
  if (value === null) return '—';
  if (metric === 'netGrossRatio') return value.toFixed(2);
  if (isRate(metric)) return pctStr(value);
  return String(Math.round(value * 100) / 100); // raw numbers: 2 decimals, no float noise
}

const METRIC_LABEL: Record<ImpactMetricKey, string> = {
  adrCouplingRate: 'ADR/spec-coupling',
  testCouplingRate: 'test-coupling',
  filesPerCommit: 'files/commit',
  churnPerCommit: 'churn/commit',
  netGrossRatio: 'survival (net/gross)',
};

function renderPerRepo(impacts: readonly RepoImpact[]): string[] {
  const lines: string[] = [];
  lines.push('## Per-repo (spec-flow vs same-repo pre-rollout control)');
  lines.push('');
  lines.push(
    '| repo | n_sf | n_ctrl | comparable | ADR sf→ctrl | TEST sf→ctrl | files/commit sf→ctrl | survival sf→ctrl |',
  );
  lines.push('|---|--:|--:|:--:|---|---|---|---|');
  for (const i of impacts) {
    const s = i.specFlow;
    const c = i.control;
    lines.push(
      `| ${i.repo} | ${s.commits} | ${c.commits} | ${i.comparable ? '✓' : '—'} | ` +
        `${pctStr(s.adrCouplingRate)}→${pctStr(c.adrCouplingRate)} | ` +
        `${pctStr(s.testCouplingRate)}→${pctStr(c.testCouplingRate)} | ` +
        `${s.filesPerCommit}→${c.filesPerCommit} | ` +
        `${s.netGrossRatio.toFixed(2)}→${c.netGrossRatio.toFixed(2)} |`,
    );
  }
  lines.push('');
  return lines;
}

function renderAggregate(aggregate: readonly MetricDelta[]): string[] {
  const lines: string[] = [];
  const repos = aggregate[0]?.repos ?? 0;
  lines.push(`## Aggregate (median of per-repo deltas — ${repos} comparable repos)`);
  lines.push('');
  lines.push('| metric | median spec-flow | median control | median Δ |');
  lines.push('|---|---|---|---|');
  for (const a of aggregate) {
    lines.push(
      `| ${METRIC_LABEL[a.metric]} | ${fmt(a.metric, a.medianSpecFlow)} | ` +
        `${fmt(a.metric, a.medianControl)} | ${fmt(a.metric, a.medianDelta)} |`,
    );
  }
  lines.push('');
  return lines;
}

/** L-2/L-11: tiers with no valid `tier` never appear here — never a false T0 row. */
function renderFriction(frictionByTier: Record<number, TierFriction>): string[] {
  const lines: string[] = [];
  lines.push('## Friction (mean questions_asked by tier — all spec-flow events)');
  lines.push('');
  lines.push('| tier | mean questions |');
  lines.push('|--:|--:|');
  for (const tier of Object.keys(frictionByTier)
    .map(Number)
    .sort((a, b) => a - b)) {
    const f = frictionByTier[tier]!;
    lines.push(`| T${tier} | ${f.mean.toFixed(2)} (n=${f.n}) |`);
  }
  lines.push('');
  return lines;
}

function hasAnyReviewLoopData(r: AggregatedReviewLoop): boolean {
  return (
    r.passes !== null ||
    r.capped !== null ||
    r.induced !== null ||
    r.redesigned !== null ||
    r.unclosed !== null ||
    r.open !== null ||
    r.firstPassFindings.premortem !== null ||
    r.firstPassFindings.compliance !== null ||
    r.firstPassFindings.undeclared !== null ||
    r.firstPassFindings.baseline05 !== null ||
    r.reversalRate !== null ||
    r.gateAdoption !== null ||
    r.verifiedShare !== null ||
    r.resolvedShare !== null
  );
}

/** L-3: renders one arm, `—` (with n=0) when it has no data — never a bare 0. */
function fmtArm(label: string, arm: AggregatedFirstPassArm | null): string {
  if (arm === null) return `${label} — (n=0)`;
  const mean = arm.meanExact === null ? '—' : arm.meanExact.toFixed(1);
  const capped = arm.cappedShare !== null ? `, ${pctStr(arm.cappedShare)} censurados` : '';
  return `${label} ${mean} (n=${arm.nTotal}${capped})`;
}

function renderFirstPassFindings(loop: AggregatedReviewLoop): string[] {
  const { premortem, compliance, undeclared, baseline05 } = loop.firstPassFindings;
  if (!premortem && !compliance && !undeclared && !baseline05) return [];
  const parts = [
    fmtArm('con pre-mortem', premortem),
    fmtArm('cumplimiento', compliance),
    fmtArm('sin declarar', undeclared),
    baseline05
      ? `línea base 0.5 ${baseline05.meanExact === null ? '—' : baseline05.meanExact.toFixed(1)} (n=${baseline05.nTotal}; contaba todas las pasadas, sin flag)`
      : 'línea base 0.5 — (n=0)',
  ];
  return [`- hallazgos 1ª pasada (media solo de exactos): ${parts.join(' · ')}`];
}

/** L-10: the fields written by the parser but never read before this rewrite. */
function renderInferenceQuality(loop: AggregatedReviewLoop): string[] {
  const parts: string[] = [];
  if (loop.reversalRate) {
    parts.push(
      `reversiones ${loop.reversalRate.ratio.toFixed(2)} por supuesto (n=${loop.reversalRate.n} cambios)`,
    );
  }
  if (loop.gateAdoption) {
    parts.push(
      `gate: ${pctStr(loop.gateAdoption.ratio)} de huecos adoptados (n=${loop.gateAdoption.n})`,
    );
  }
  const lines = parts.length > 0 ? [`- calidad de inferencia: ${parts.join(' · ')}`] : [];

  const t2parts: string[] = [];
  if (loop.verifiedShare) {
    t2parts.push(
      `tests verificados en T2+: ${pctStr(loop.verifiedShare.rate)} (n=${loop.verifiedShare.n})`,
    );
  }
  if (loop.resolvedShare) {
    t2parts.push(
      `resueltos/encontrados: ${pctStr(loop.resolvedShare.ratio)} (n=${loop.resolvedShare.n})`,
    );
  }
  if (t2parts.length > 0) lines.push(`- ${t2parts.join(' · ')}`);
  return lines;
}

/** L-1..L-11: the review-loop block, omitted entirely when there is no reviewed data at all. */
function renderReviewLoop(loop: AggregatedReviewLoop | undefined): string[] {
  if (!loop || !hasAnyReviewLoopData(loop)) return [];
  const lines: string[] = [];
  lines.push(`## Review loop (mediana entre ${loop.repos} repos)`);
  lines.push('');

  if (loop.passes) {
    lines.push(
      `- pasadas: mediana ${loop.passes.median} · ≤2: ${pctStr(loop.passes.sharePassesAtMost2)} (n=${loop.passes.n})`,
    );
  }
  if (loop.capped) {
    lines.push(
      `- tope en la 1ª pasada: ${pctStr(loop.capped.rate)} (n=${loop.capped.n} declaran el flag)`,
    );
  }
  const parts: string[] = [];
  if (loop.induced) parts.push(`inducidos: ${pctStr(loop.induced.rate)} (n=${loop.induced.n})`);
  if (loop.redesigned)
    parts.push(`rediseños: ${pctStr(loop.redesigned.rate)} (n=${loop.redesigned.n})`);
  if (loop.open)
    parts.push(
      `deuda abierta: ${loop.open.sum} en total, mediana ${loop.open.median} (n=${loop.open.n})`,
    );
  if (parts.length > 0) lines.push(`- ${parts.join(' · ')}`);
  if (loop.unclosed)
    lines.push(
      `- sin cierre: mediana ${pctStr(loop.unclosed.rate)} entre ${loop.unclosed.repos} repos ` +
        `(${loop.unclosed.count} de ${loop.unclosed.n} cambios en total)`,
    );

  lines.push(...renderFirstPassFindings(loop));
  lines.push(...renderInferenceQuality(loop));
  lines.push('');
  return lines;
}

function renderDiscardedWorktrees(
  discardedWorktrees: readonly DiscardedRepo[] | undefined,
): string[] {
  if (!discardedWorktrees || discardedWorktrees.length === 0) return [];
  const lines: string[] = ['## Worktrees descartados (mismo repo, no cuentan dos veces)', ''];
  for (const d of discardedWorktrees) {
    const reason =
      d.reason === 'orphaned-worktree'
        ? 'worktree huérfano (gitdir inexistente)'
        : `mismo repositorio que ${d.keptAs}; solo se cuenta una copia (la telemetría de ramas sin fusionar entra al fusionarse)`;
    lines.push(`- ${d.path} → ${reason}`);
  }
  lines.push('');
  return lines;
}

function renderNotComparable(impacts: readonly RepoImpact[]): string[] {
  const notComparable = impacts.filter((i) => !i.comparable);
  if (notComparable.length === 0) return [];
  const lines: string[] = [
    '## Not comparable (insufficient pre-rollout control — NOT dropped, just unrankable)',
    '',
  ];
  for (const i of notComparable) {
    lines.push(`- ${i.repo} (n_control=${i.control.commits}, rollout=${i.rolloutDate ?? 'n/a'})`);
  }
  lines.push('');
  return lines;
}

export function renderSpecFlowImpact(
  impacts: readonly RepoImpact[],
  aggregate: readonly MetricDelta[],
  frictionByTier: Record<number, TierFriction>,
  reviewLoop?: AggregatedReviewLoop,
  discardedWorktrees?: readonly DiscardedRepo[],
): string {
  const lines: string[] = [
    '# spec-flow impact',
    '',
    '_Baseline-relative · density-normalized · strict detectors — see ADR-0014._',
    '',
  ];
  lines.push(...renderPerRepo(impacts));
  lines.push(...renderAggregate(aggregate));
  lines.push(...renderFriction(frictionByTier));
  lines.push(...renderReviewLoop(reviewLoop));
  lines.push(...renderDiscardedWorktrees(discardedWorktrees));
  lines.push(...renderNotComparable(impacts));
  return lines.join('\n');
}
