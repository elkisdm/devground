export const meta = {
  name: 'deepcheck',
  description: 'Deep multi-agent verification (QA + Validation + Audit) of a flow, with adversarial confirmation of every finding',
  phases: [
    { title: 'Review', detail: '3 roles x N dimensions in parallel, each produces findings' },
    { title: 'Verify', detail: 'adversarial refuters per finding, majority confirms' },
    { title: 'Synthesize', detail: 'group confirmed vs discarded, write the ledger' },
  ],
}

// ---------------------------------------------------------------------------
// Pure helpers — MIRROR de src/lib.ts.
// NOTA: estos helpers son espejo de src/lib.ts (el runtime de Workflow es
// self-contained y no puede importar). Mantener en sync: cualquier cambio de
// lógica aquí debe reflejarse en src/lib.ts (y sus tests) y viceversa.
// ---------------------------------------------------------------------------
const sevRank = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }

// args may arrive as an object OR as a JSON-encoded string depending on how the
// caller serialized it — normalize both so we never silently audit nothing.
function parseArgs(args) {
  const A = typeof args === 'string' ? JSON.parse(args) : (args ?? {})
  return {
    flow: A.flow ?? 'unknown-flow',
    rootDir: A.rootDir ?? '.',
    paths: A.paths ?? [],
    readmePaths: A.readmePaths ?? [],
    adrDir: A.adrDir ?? '',
    priorSkill: A.priorSkill ?? null,
    priorSkillPath: A.priorSkillPath ?? null,
    ledgerPath: A.ledgerPath ?? null,
    stamp: A.stamp ?? 'unstamped',
    distill: A.distill === true,
    skillOutPath: A.skillOutPath ?? null,
    templatePath: A.templatePath ?? null,
    runs: A.runs ?? 1,
  }
}

// confirmed if a MAJORITY of refuters could NOT refute it
function isConfirmed(refutedCount, voteCount) {
  return voteCount > 0 && refutedCount < Math.ceil(voteCount / 2)
}

function partition(findings) {
  const confirmed = findings
    .filter((f) => isConfirmed(f.refutedCount, f.voteCount))
    .sort((a, b) => (sevRank[a.severity] ?? 9) - (sevRank[b.severity] ?? 9))
  const discarded = findings.filter((f) => !isConfirmed(f.refutedCount, f.voteCount))
  return { confirmed, discarded }
}

function formatReport(flow, stamp, confirmed, discarded) {
  const byRole = (role) => confirmed.filter((f) => f.role === role)
  const fmt = (f) =>
    `- **[${f.severity.toUpperCase()}] ${f.title}** (\`${f.dimension}\`)\n  - \`${f.file}:${f.line}\`\n  - Evidencia: ${f.evidence}\n  - Por qué importa: ${f.rationale}`
  const fmtDiscarded = (f) =>
    `- ~~${f.title}~~ (\`${f.dimension}\`, ${f.severity}) — refutado ${f.refutedCount}/${f.voteCount}. Razón: ${f.verdicts.find((v) => v.refuted)?.reason ?? 'n/a'}`

  return `# deepcheck — auditoría de "${flow}"

> Corrida: ${stamp} · ${confirmed.length} hallazgos confirmados · ${discarded.length} descartados

## Resumen por rol

| Rol | Confirmados |
|-----|-------------|
| QA | ${byRole('QA').length} |
| Validación | ${byRole('Validacion').length} |
| Auditoría | ${byRole('Auditoria').length} |

## Hallazgos confirmados

### QA — ¿funciona?
${byRole('QA').map(fmt).join('\n') || '_Sin hallazgos confirmados._'}

### Validación — ¿es lo que se pedía?
${byRole('Validacion').map(fmt).join('\n') || '_Sin hallazgos confirmados._'}

### Auditoría — ¿está bien construida?
${byRole('Auditoria').map(fmt).join('\n') || '_Sin hallazgos confirmados._'}

## Descartados por el filtro adversarial (transparencia)
${discarded.map(fmtDiscarded).join('\n') || '_Ninguno._'}
`
}

// ---------------------------------------------------------------------------
// Inputs (via `args`) — see skills/deepcheck/SKILL.md
//   flow, rootDir, paths[], readmePaths[], adrDir, priorSkill, ledgerPath, stamp
// ---------------------------------------------------------------------------
const {
  flow,
  rootDir,
  paths,
  readmePaths,
  adrDir,
  priorSkill,
  priorSkillPath,
  ledgerPath,
  stamp,
  distill,
  skillOutPath,
  templatePath,
  runs,
} = parseArgs(args)

if (flow === 'unknown-flow' || paths.length === 0) {
  log('⚠️ ADVERTENCIA: flow sin identificar o paths vacío — args no llegó bien. Los agentes explorarán el repo a ciegas.')
}

const pathList = paths.join('\n  - ')
const priorBlock = priorSkill
  ? `\n\nCONOCIMIENTO PREVIO de auditorías anteriores de este flujo (úsalo como piso, pero RE-VERIFICA que siga vigente — el código pudo cambiar):\n${priorSkill}`
  : priorSkillPath
    ? `\n\nHAY una skill de auditoría destilada de corridas anteriores de este flujo en ${priorSkillPath}. LÉELA con Read ANTES de revisar y úsala como piso:\n- RESPETA sus supresiones: NO re-reportes lo que ya está documentado como falso positivo, SALVO que el código haya cambiado y la supresión ya no aplique (revisa el gatillo de re-validación de cada una).\n- Ataca primero sus hotspots.\n- RE-VERIFICA lo que la skill daba por confirmado: si ya lo arreglaron, NO lo reportes; si sigue roto, repórtalo.`
    : ''

// Common context every reviewer gets.
const ctx = `Flujo bajo auditoría: "${flow}".
Raíz del repo: ${rootDir}
Archivos a auditar:
  - ${pathList}
README/docs que declaran los requisitos: ${readmePaths.join(', ') || '(ninguno)'}
ADRs (rúbrica de auditoría): ${adrDir || '(ninguno)'}
Usa las herramientas de lectura (Read/Grep/Bash) sobre las rutas ABSOLUTAS dadas. No inventes código que no leíste.${priorBlock}`

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------
const FINDINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string', description: 'Hallazgo en una frase' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'info'] },
          file: { type: 'string', description: 'Ruta del archivo' },
          line: { type: 'string', description: 'Línea o rango, ej "42" o "10-18"' },
          evidence: { type: 'string', description: 'Cita textual o descripción concreta del código que lo demuestra' },
          rationale: { type: 'string', description: 'Por qué es un problema y qué impacto tiene' },
        },
        required: ['title', 'severity', 'file', 'line', 'evidence', 'rationale'],
      },
    },
  },
  required: ['findings'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    refuted: { type: 'boolean', description: 'true si el hallazgo NO es real / no aplica / es falso positivo' },
    reason: { type: 'string', description: 'Justificación de la refutación o confirmación, citando el código' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['refuted', 'reason', 'confidence'],
}

// Output of the cross-dimension dedup/merge step: one canonical entry per real
// issue, recording every dimension that independently surfaced it.
const DEDUP_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'info'] },
          file: { type: 'string' },
          line: { type: 'string' },
          evidence: { type: 'string' },
          rationale: { type: 'string' },
          role: { type: 'string', description: 'Rol primario que mejor describe el hallazgo' },
          dimension: { type: 'string', description: 'Dimensión primaria' },
          reportedBy: { type: 'array', items: { type: 'string' }, description: 'Todas las dimensiones que lo reportaron, ej ["qa-happy","val-contracts"]' },
        },
        required: ['title', 'severity', 'file', 'line', 'evidence', 'rationale', 'role', 'dimension', 'reportedBy'],
      },
    },
  },
  required: ['findings'],
}

// ---------------------------------------------------------------------------
// Dimensions — keep in sync with skills/deepcheck/references/roles.md
// ---------------------------------------------------------------------------
const DIMENSIONS = [
  // QA — ¿funciona?
  { role: 'QA', key: 'qa-happy', ask: 'Revisa el CAMINO FELIZ de cada modo de uso del flujo (ej: --yes, presets, interactivo). ¿Produce el resultado esperado? Busca lógica que no haga lo que dice.' },
  { role: 'QA', key: 'qa-edge', ask: 'Busca EDGE CASES mal manejados: entradas vacías/ausentes, selección vacía, archivos preexistentes, un sub-paso que lanza, rutas raras. ¿Qué pasa cuándo algo no es el caso ideal?' },
  { role: 'QA', key: 'qa-errors', ask: 'Audita el MANEJO DE ERRORES y los CÓDIGOS DE SALIDA. ¿Falla con gracia? ¿Los mensajes son claros y accionables? ¿Los exit codes son correctos? ¿Hay catch que se traga errores?' },
  // Validación — ¿es lo que se pedía?
  { role: 'Validacion', key: 'val-requirements', ask: 'Compara el comportamiento REAL del código contra lo que el README/docs PROMETEN explícitamente. Busca claims incumplidos (ej: "no sobreescribe nada existente" — ¿de verdad chequea antes de escribir?).' },
  { role: 'Validacion', key: 'val-contracts', ask: 'Audita el CONTRATO EXTERNO: flags/opciones del CLI, versión que reporta, forma de la salida. ¿Es coherente y honesto? Busca desalineaciones (ej: versión hardcodeada distinta a la del package.json).' },
  // Auditoría — ¿está bien construida?
  { role: 'Auditoria', key: 'aud-security', ask: 'SEGURIDAD (ADR 0007-0009): inyección de comandos (ej: execSync con strings construidos), path traversal, manejo de secretos, validación de entrada externa. Este es el punto más crítico.' },
  { role: 'Auditoria', key: 'aud-perf', ask: 'PERFORMANCE: I/O bloqueante innecesario, trabajo redundante, complejidad algorítmica. Sé proporcional: en un CLI de scaffolding el I/O sync suele ser aceptable — solo reporta lo que de verdad importa.' },
  { role: 'Auditoria', key: 'aud-limits', ask: 'LÍMITES (ADR 0010): tamaño de módulo/función, complejidad ciclomática excesiva, funciones que hacen demasiado.' },
  { role: 'Auditoria', key: 'aud-types', ask: 'TIPOS EN FRONTERAS (ADR 0011): uso de `any` o tipos laxos en límites externos (entrada de usuario, parsing, retornos públicos). En Swift: force-unwrap (`!`)/`try!` en fronteras y errores no tipados donde un `enum` acotado corresponde (typed throws).' },
  { role: 'Auditoria', key: 'aud-tests', ask: 'COBERTURA DE TESTS EN RUTAS CRÍTICAS (ADR 0012): ¿qué comportamiento crítico NO está cubierto por tests? Lee los tests existentes (`.test.ts` o `*Tests.swift`) y contrasta contra la lógica crítica.' },
  { role: 'Auditoria', key: 'aud-concurrency', ask: 'CONCURRENCIA (SOLO flujos Swift — si el flujo no es Swift, NO reportes nada aquí): `@unchecked Sendable` sin justificación escrita, tipos no-`Sendable` cruzando fronteras de aislamiento, `.defaultIsolation(MainActor.self)` aplicado a capas base portables (antipatrón: hops de actor, rompe Sendable), y `Domain`/capas base que importan UIKit/SwiftUI (rompe la frontera de portabilidad). Rúbrica: ADRs de dominio Swift (isolation por capa, core puro).' },
]

// ---------------------------------------------------------------------------
// Pipeline: each dimension reviews, then each of its findings is adversarially
// verified — no barrier, so a dimension's findings verify while others review.
// ---------------------------------------------------------------------------
log(`deepcheck "${flow}": ${DIMENSIONS.length} dimensiones, 3 roles. priorSkill=${priorSkill || priorSkillPath ? 'sí' : 'no'}`)

// Three independent refutation lenses (was two — with only two voters the
// "majority" rule collapsed to unanimity, killing real findings on a single
// skeptic). Three makes the majority real.
const REFUTE_LENSES = [
  'CORRECTITUD: ¿el código realmente se comporta como dice el hallazgo? Lee el código citado y verifica línea por línea.',
  'CONTEXTO: ¿el hallazgo ignora una salvaguarda, un test, o una convención del proyecto que lo neutraliza? ¿aplica en este flujo?',
  'IMPACTO: aunque sea técnicamente cierto, ¿tiene impacto real para el usuario/operación, o es teórico/cosmético en este flujo? Refuta si el impacto es nulo.',
]

// --- Stage 1: Review (BARRIER) — collect every dimension's raw findings ---
phase('Review')
const rawByDim = await parallel(
  DIMENSIONS.map((d) => () =>
    agent(
      `${ctx}\n\nTU DIMENSIÓN [${d.role} / ${d.key}]: ${d.ask}\n\nReporta SOLO hallazgos con evidencia concreta del código. Si no hay nada real en tu dimensión, devuelve findings vacío. No inventes para llenar.`,
      { label: `review:${d.key}`, phase: 'Review', schema: FINDINGS_SCHEMA },
    ).then((r) => (r?.findings ?? []).map((f) => ({ ...f, role: d.role, dimension: d.key }))),
  ),
)
const rawFindings = rawByDim.filter(Boolean).flat()
log(`${rawFindings.length} hallazgos crudos de ${DIMENSIONS.length} dimensiones`)

// --- Dedup/merge across dimensions (the same bug surfaces in several lenses) ---
// Barrier is required here: we need ALL findings before merging, and merging
// before verification avoids paying refuters 3x for the same issue.
let canonical = rawFindings
if (rawFindings.length > 1) {
  const merged = await agent(
    `Te paso ${rawFindings.length} hallazgos crudos de una auditoría multi-dimensional del flujo "${flow}". Varios describen el MISMO problema desde dimensiones distintas. Fusiónalos: devuelve UNA entrada canónica por problema real, con la mejor evidencia/severidad (la más alta) y \`reportedBy\` listando todas las dimensiones que lo reportaron. NO inventes hallazgos nuevos ni descartes ninguno: solo agrupa duplicados.\n\nHALLAZGOS CRUDOS (JSON):\n${JSON.stringify(rawFindings.map((f, i) => ({ i, ...f })), null, 1)}`,
    { label: 'dedup', phase: 'Review', schema: DEDUP_SCHEMA },
  )
  if (merged?.findings?.length) canonical = merged.findings
}
log(`${canonical.length} hallazgos únicos tras dedup (de ${rawFindings.length} crudos)`)

// --- Stage 2: Verify (3 adversarial refuters per canonical finding) ---
phase('Verify')
const all = (
  await parallel(
    canonical.map((f) => () =>
      parallel(
        REFUTE_LENSES.map((lens) => () =>
          agent(
            `${ctx}\n\nINTENTA REFUTAR este hallazgo reportado sobre el flujo. Eres escéptico: tu trabajo es demostrar que es un FALSO POSITIVO si lo es. Ante la duda razonable, refuta (refuted=true).\n\nLente de refutación — ${lens}\n\nHALLAZGO:\n- Título: ${f.title}\n- Severidad: ${f.severity}\n- Archivo: ${f.file}:${f.line}\n- Evidencia: ${f.evidence}\n- Razón: ${f.rationale}`,
            { label: `verify:${f.dimension}`, phase: 'Verify', schema: VERDICT_SCHEMA },
          ),
        ),
      ).then((votes) => {
        const valid = votes.filter(Boolean)
        const refutedCount = valid.filter((v) => v.refuted).length
        return {
          ...f,
          refutedCount,
          voteCount: valid.length,
          confirmed: isConfirmed(refutedCount, valid.length),
          verdicts: valid,
        }
      }),
    ),
  )
).filter(Boolean)

const { confirmed, discarded } = partition(all)

log(`Hallazgos: ${all.length} únicos → ${confirmed.length} confirmados, ${discarded.length} descartados por el filtro adversarial`)

// ---------------------------------------------------------------------------
// Synthesis — write a human-readable ledger entry.
// ---------------------------------------------------------------------------
phase('Synthesize')

const report = formatReport(flow, stamp, confirmed, discarded)

if (ledgerPath) {
  await agent(
    `Escribe EXACTAMENTE el siguiente contenido markdown en el archivo ${ledgerPath} usando la herramienta Write (crea los directorios padre si hace falta vía Bash mkdir -p). No alteres el contenido. Confirma con la ruta escrita.\n\n---CONTENIDO---\n${report}`,
    { label: 'write-ledger', phase: 'Synthesize' },
  )
}

// --- Distillation (self-improvement): write/update the per-flow audit skill ---
// The accumulated knowledge of THIS flow lives in the skill, so the next run
// starts from a higher floor instead of re-discovering everything.
let distilled = null
if (distill && skillOutPath && templatePath) {
  const suppressions = discarded.map((f) => ({
    title: f.title,
    dimension: f.dimension,
    reason: f.verdicts.find((v) => v.refuted)?.reason?.slice(0, 200) ?? 'n/a',
  }))
  distilled = await agent(
    `Eres el DESTILADOR de deepcheck. Tu trabajo es escribir/actualizar una skill de auditoría específica para el flujo "${flow}" que haga MÁS AFILADA la próxima corrida.\n\n` +
      `1. Lee la plantilla en ${templatePath} (tiene placeholders {{FLOW}}, {{STAMP}}, {{RUNS}}, {{FLOW_MAP}}, {{INVARIANTS}}, {{HOTSPOTS}}, {{SUPPRESSIONS}}, {{EDGE_CASES}}).\n` +
      (priorSkill
        ? `2. YA EXISTE una skill previa (te la paso abajo). FUSIONA: conserva lo que sigue vigente, actualiza lo que cambió. RE-VALIDA las supresiones viejas — si una supresión ya no aplica (el código cambió), quítala. No acumules supresiones ciegamente: una skill que solo dice "ignora esto" se vuelve ciega a regresiones reales.\n`
        : priorSkillPath
          ? `2. YA EXISTE una skill previa en ${priorSkillPath}. LÉELA con Read y FUSIONA: conserva lo que sigue vigente, actualiza lo que cambió, SUBE el contador {{RUNS}}. RE-VALIDA las supresiones viejas — si una ya no aplica (el código cambió), quítala. No acumules supresiones ciegamente: una skill que solo dice "ignora esto" se vuelve ciega a regresiones reales.\n`
          : `2. Es la PRIMERA corrida: destila desde cero.\n`) +
      `3. Rellena los placeholders con conocimiento REAL de esta corrida:\n` +
      `   - {{FLOW}}=${flow}, {{STAMP}}=${stamp}, {{RUNS}}=${runs}\n` +
      `   - {{FLOW_MAP}}: 2-4 líneas de cómo funciona el flujo (archivos y responsabilidades clave).\n` +
      `   - {{INVARIANTS}}: cosas que SON verdad del flujo y no hay que re-verificar desde cero.\n` +
      `   - {{HOTSPOTS}}: por dimensión, dónde mirar primero (aprendido de los hallazgos confirmados).\n` +
      `   - {{SUPPRESSIONS}}: filas de tabla "| hallazgo | razón | ${stamp} | re-validar si cambia <archivo> |" para cada falso positivo descartado.\n` +
      `   - {{EDGE_CASES}}: edge cases descubiertos.\n` +
      `4. Escribe el resultado final (sin placeholders sin resolver) en ${skillOutPath} con Write (mkdir -p el directorio padre). Confirma la ruta.\n\n` +
      `HALLAZGOS CONFIRMADOS (JSON):\n${JSON.stringify(confirmed.map((f) => ({ title: f.title, severity: f.severity, file: f.file, line: f.line, dimension: f.dimension, rationale: f.rationale })), null, 1)}\n\n` +
      `SUPRESIONES (descartados, para falsos positivos conocidos):\n${JSON.stringify(suppressions, null, 1)}` +
      (priorSkill ? `\n\nSKILL PREVIA A FUSIONAR:\n${priorSkill}` : ''),
    { label: 'distill', phase: 'Synthesize' },
  )
  log(`Skill destilada escrita en ${skillOutPath}`)
}

return {
  distilled: distilled ? skillOutPath : null,
  flow,
  stamp,
  totals: { all: all.length, confirmed: confirmed.length, discarded: discarded.length },
  confirmed,
  discarded,
  ledgerPath,
}
