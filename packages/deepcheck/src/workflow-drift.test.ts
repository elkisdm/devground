/**
 * workflows/deepcheck.workflow.js carries a MIRROR copy of the pure helpers in
 * ./lib.ts (sevRank, parseArgs, isConfirmed, partition, formatReport) because
 * the Workflow runtime is self-contained and cannot import local modules at
 * runtime (see the comment at the top of the workflow file). That duplication
 * is intentional — the fix here is NOT to remove it — but nothing enforced
 * that the two copies stay behaviorally equivalent.
 *
 * This is a BEHAVIOR guard, not a text diff: it extracts the mirror block's
 * source directly from workflows/deepcheck.workflow.js, evaluates it with
 * `new Function` (the block is plain top-level JS — no imports/exports, safe
 * to eval), and runs it through the same cases used against lib.ts, asserting
 * identical outputs. A text-normalization diff would only catch drift when
 * the source literally differs; this catches the actual failure mode #11
 * warns about — someone changes the CRITICAL isConfirmed threshold (or
 * sevRank/partition) in one file and forgets the other, so the real run uses
 * logic that was never tested.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import {
  parseArgs as libParseArgs,
  isConfirmed as libIsConfirmed,
  partition as libPartition,
  formatReport as libFormatReport,
  sevRank as libSevRank,
  type VerifiedFinding,
  type Severity,
} from './lib.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKFLOW_PATH = resolve(__dirname, '../workflows/deepcheck.workflow.js');

const START_MARKER = '// lógica aquí debe reflejarse en src/lib.ts (y sus tests) y viceversa.';
const END_MARKER = '// Inputs (via `args`) — see skills/deepcheck/SKILL.md';
const DIVIDER = '// ' + '-'.repeat(75);

/**
 * Extract the mirror helpers' source (sevRank, parseArgs, isConfirmed,
 * partition, formatReport) directly from the workflow file, between its
 * documented MIRROR markers. Throws loudly if the markers move — that's a
 * deliberate signal that this extraction needs to be updated, rather than
 * silently testing nothing.
 */
function extractMirrorSource(): string {
  const source = readFileSync(WORKFLOW_PATH, 'utf8');

  const startMarkerIdx = source.indexOf(START_MARKER);
  if (startMarkerIdx === -1) {
    throw new Error(`Could not find MIRROR start marker in ${WORKFLOW_PATH} — did the comment change?`);
  }
  const dividerAfterStart = source.indexOf(DIVIDER, startMarkerIdx);
  if (dividerAfterStart === -1) {
    throw new Error('Could not find the divider line closing the MIRROR comment block');
  }
  const codeStart = source.indexOf('\n', dividerAfterStart) + 1;

  const endMarkerIdx = source.indexOf(END_MARKER, codeStart);
  if (endMarkerIdx === -1) {
    throw new Error('Could not find the MIRROR end marker (the "Inputs (via `args`)" comment)');
  }
  const dividerBeforeEnd = source.lastIndexOf(DIVIDER, endMarkerIdx);
  if (dividerBeforeEnd === -1 || dividerBeforeEnd <= codeStart) {
    throw new Error('Could not find the divider line preceding the MIRROR end marker');
  }

  return source.slice(codeStart, dividerBeforeEnd);
}

interface MirrorExports {
  sevRank: Record<Severity, number>;
  parseArgs: typeof libParseArgs;
  isConfirmed: typeof libIsConfirmed;
  partition: typeof libPartition;
  formatReport: typeof libFormatReport;
}

let mirror: MirrorExports;

beforeAll(() => {
  const mirrorSource = extractMirrorSource();
  // The mirror block is plain top-level JS (const/function declarations, no
  // imports/exports) — evaluating it and returning the bindings is safe and
  // is exactly how the Workflow runtime treats this same source at runtime.
  mirror = new Function(
    `${mirrorSource}\nreturn { sevRank, parseArgs, isConfirmed, partition, formatReport };`,
  )() as MirrorExports;
});

function vf(overrides: Partial<VerifiedFinding> = {}): VerifiedFinding {
  return {
    title: 'A finding',
    severity: 'high',
    file: 'src/x.ts',
    line: '10',
    evidence: 'some code',
    rationale: 'because reasons',
    role: 'QA',
    dimension: 'qa-happy',
    refutedCount: 0,
    voteCount: 3,
    confirmed: true,
    verdicts: [],
    ...overrides,
  };
}

describe('workflow.js mirror — sevRank', () => {
  it('is identical to lib.ts', () => {
    expect(mirror.sevRank).toEqual(libSevRank);
  });
});

describe('workflow.js mirror — isConfirmed (the CRITICAL adversarial majority threshold)', () => {
  const cases: Array<[number, number]> = [
    [0, 3],
    [1, 3],
    [2, 3],
    [3, 3],
    [0, 2],
    [1, 2],
    [2, 2],
    [0, 0],
    [0, 1],
    [1, 1],
  ];

  it.each(cases)('isConfirmed(%i, %i) gives the same result in both copies', (refutedCount, voteCount) => {
    expect(mirror.isConfirmed(refutedCount, voteCount)).toBe(libIsConfirmed(refutedCount, voteCount));
  });

  it('agrees with lib.ts on the documented boundary behavior', () => {
    // Majority could NOT refute -> confirmed.
    expect(mirror.isConfirmed(0, 3)).toBe(libIsConfirmed(0, 3));
    expect(mirror.isConfirmed(0, 3)).toBe(true);
    expect(mirror.isConfirmed(1, 3)).toBe(libIsConfirmed(1, 3));
    expect(mirror.isConfirmed(1, 3)).toBe(true);
    // Majority refuted (tie goes to discard, ceil(2/2)=1) -> discarded.
    expect(mirror.isConfirmed(1, 2)).toBe(libIsConfirmed(1, 2));
    expect(mirror.isConfirmed(1, 2)).toBe(false);
    expect(mirror.isConfirmed(2, 3)).toBe(libIsConfirmed(2, 3));
    expect(mirror.isConfirmed(2, 3)).toBe(false);
    // Zero votes never confirms.
    expect(mirror.isConfirmed(0, 0)).toBe(libIsConfirmed(0, 0));
    expect(mirror.isConfirmed(0, 0)).toBe(false);
  });
});

describe('workflow.js mirror — partition', () => {
  it('splits confirmed/discarded and sorts by severity identically to lib.ts', () => {
    const severities: Severity[] = ['info', 'critical', 'low', 'high', 'medium'];
    const findings: VerifiedFinding[] = [
      ...severities.map((s) => vf({ title: `confirmed-${s}`, severity: s, refutedCount: 0, voteCount: 3 })),
      vf({ title: 'discarded-a', refutedCount: 2, voteCount: 3 }),
      vf({ title: 'discarded-b', refutedCount: 0, voteCount: 0 }),
    ];

    const libResult = libPartition(findings);
    const mirrorResult = mirror.partition(findings);

    expect(mirrorResult.confirmed.map((f) => f.title)).toEqual(libResult.confirmed.map((f) => f.title));
    expect(mirrorResult.confirmed.map((f) => f.severity)).toEqual(libResult.confirmed.map((f) => f.severity));
    expect(mirrorResult.discarded.map((f) => f.title).sort()).toEqual(
      libResult.discarded.map((f) => f.title).sort(),
    );
  });
});

describe('workflow.js mirror — parseArgs', () => {
  it('applies the same defaults as lib.ts for undefined/empty input', () => {
    expect(mirror.parseArgs(undefined)).toEqual(libParseArgs(undefined));
    expect(mirror.parseArgs({})).toEqual(libParseArgs({}));
  });

  it('normalizes a plain object identically', () => {
    const input = { flow: 'login', paths: ['a.ts', 'b.ts'], distill: true, runs: 4 };
    expect(mirror.parseArgs(input)).toEqual(libParseArgs(input));
  });

  it('parses a JSON-encoded string identically', () => {
    const input = JSON.stringify({ flow: 'signup', stamp: '2026-06-03', distill: true, runs: 4 });
    expect(mirror.parseArgs(input)).toEqual(libParseArgs(input));
  });

  it('treats distill as boolean true only when strictly true, identically', () => {
    expect(mirror.parseArgs({ distill: 'true' }).distill).toBe(libParseArgs({ distill: 'true' }).distill);
    expect(mirror.parseArgs({ distill: 1 }).distill).toBe(libParseArgs({ distill: 1 }).distill);
    expect(mirror.parseArgs({ distill: true }).distill).toBe(libParseArgs({ distill: true }).distill);
  });
});

describe('workflow.js mirror — formatReport', () => {
  it('renders byte-identical markdown to lib.ts for the same inputs', () => {
    const confirmed: VerifiedFinding[] = [
      vf({ title: 'QA bug', role: 'QA', dimension: 'qa-happy', severity: 'critical', file: 'a.ts', line: '5' }),
      vf({ title: 'Sec hole', role: 'Auditoria', dimension: 'aud-security', severity: 'high' }),
    ];
    const discarded: VerifiedFinding[] = [
      vf({
        title: 'false positive',
        dimension: 'aud-perf',
        severity: 'low',
        refutedCount: 2,
        voteCount: 3,
        verdicts: [
          { refuted: false, reason: 'real', confidence: 'low' },
          { refuted: true, reason: 'no real impact here', confidence: 'high' },
        ],
      }),
    ];

    const libMd = libFormatReport('checkout', '2026-06-03', confirmed, discarded);
    const mirrorMd = mirror.formatReport('checkout', '2026-06-03', confirmed, discarded);
    expect(mirrorMd).toBe(libMd);
  });
});
