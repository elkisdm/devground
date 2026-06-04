/**
 * deepcheck — pure logic, extracted from workflows/deepcheck.workflow.js.
 *
 * The Workflow runtime is self-contained (no local `import`/`require` and it
 * leans on harness globals like `agent()`, `parallel()`, `log()`), so the
 * workflow script cannot import this module at runtime. Instead it carries a
 * MIRROR copy of these function bodies inline. This module is the single source
 * of truth that gets tested; keep the workflow helpers in sync with it.
 *
 * Everything here is pure: no I/O, no `agent()` calls, no globals.
 */

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/** Severity ordering used to sort confirmed findings (lower = more severe). */
export const sevRank: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

/** A single audit finding produced by a review dimension. */
export interface Finding {
  title: string;
  severity: Severity;
  file: string;
  line: string;
  evidence: string;
  rationale: string;
  /** Primary role that best describes the finding (QA / Validacion / Auditoria). */
  role: string;
  /** Primary dimension key, e.g. "qa-happy". */
  dimension: string;
}

/** One adversarial refuter's vote on a finding. */
export interface Verdict {
  /** true if the finding is NOT real / does not apply / is a false positive. */
  refuted: boolean;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

/** A finding after the adversarial verification stage. */
export interface VerifiedFinding extends Finding {
  refutedCount: number;
  voteCount: number;
  confirmed: boolean;
  verdicts: Verdict[];
}

/** Normalized workflow inputs, with every default applied. */
export interface NormalizedArgs {
  flow: string;
  rootDir: string;
  paths: string[];
  readmePaths: string[];
  adrDir: string;
  priorSkill: string | null;
  priorSkillPath: string | null;
  ledgerPath: string | null;
  stamp: string;
  distill: boolean;
  skillOutPath: string | null;
  templatePath: string | null;
  runs: number;
}

/** Raw shape of `args` as it may arrive (object or JSON string). */
type RawArgs = Partial<Record<keyof NormalizedArgs, unknown>>;

/**
 * Normalize the `args` payload. It may arrive as an object OR as a JSON-encoded
 * string depending on how the caller serialized it — handle both so we never
 * silently audit nothing. Applies all defaults.
 */
export function parseArgs(args: unknown): NormalizedArgs {
  const A: RawArgs =
    typeof args === 'string' ? (JSON.parse(args) as RawArgs) : ((args as RawArgs) ?? {});
  return {
    flow: (A.flow as string) ?? 'unknown-flow',
    rootDir: (A.rootDir as string) ?? '.',
    paths: (A.paths as string[]) ?? [],
    readmePaths: (A.readmePaths as string[]) ?? [],
    adrDir: (A.adrDir as string) ?? '',
    priorSkill: (A.priorSkill as string) ?? null,
    priorSkillPath: (A.priorSkillPath as string) ?? null,
    ledgerPath: (A.ledgerPath as string) ?? null,
    stamp: (A.stamp as string) ?? 'unstamped',
    distill: A.distill === true,
    skillOutPath: (A.skillOutPath as string) ?? null,
    templatePath: (A.templatePath as string) ?? null,
    runs: (A.runs as number) ?? 1,
  };
}

/**
 * Confirmation rule: a finding is confirmed when a MAJORITY of refuters could
 * NOT refute it. With 3 voters: 0-1 refutations confirm, 2-3 discard. With 2
 * voters: requires 0 refutations to confirm. This threshold is CRITICAL.
 */
export function isConfirmed(refutedCount: number, voteCount: number): boolean {
  return voteCount > 0 && refutedCount < Math.ceil(voteCount / 2);
}

/**
 * Split verified findings into confirmed (sorted by severity) and discarded.
 */
export function partition(findings: VerifiedFinding[]): {
  confirmed: VerifiedFinding[];
  discarded: VerifiedFinding[];
} {
  const confirmed = findings
    .filter((f) => isConfirmed(f.refutedCount, f.voteCount))
    .sort((a, b) => (sevRank[a.severity] ?? 9) - (sevRank[b.severity] ?? 9));
  const discarded = findings.filter((f) => !isConfirmed(f.refutedCount, f.voteCount));
  return { confirmed, discarded };
}

/**
 * Render the human-readable ledger markdown from the confirmed/discarded sets.
 */
export function formatReport(
  flow: string,
  stamp: string,
  confirmed: VerifiedFinding[],
  discarded: VerifiedFinding[],
): string {
  const byRole = (role: string): VerifiedFinding[] => confirmed.filter((f) => f.role === role);
  const fmt = (f: VerifiedFinding): string =>
    `- **[${f.severity.toUpperCase()}] ${f.title}** (\`${f.dimension}\`)\n  - \`${f.file}:${f.line}\`\n  - Evidencia: ${f.evidence}\n  - Por qué importa: ${f.rationale}`;
  const fmtDiscarded = (f: VerifiedFinding): string =>
    `- ~~${f.title}~~ (\`${f.dimension}\`, ${f.severity}) — refutado ${f.refutedCount}/${f.voteCount}. Razón: ${f.verdicts.find((v) => v.refuted)?.reason ?? 'n/a'}`;

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
`;
}
