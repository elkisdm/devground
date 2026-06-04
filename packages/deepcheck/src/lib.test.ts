import { describe, it, expect } from 'vitest';
import {
  parseArgs,
  isConfirmed,
  partition,
  formatReport,
  sevRank,
  type VerifiedFinding,
  type Severity,
} from './lib.js';

// Helper to build a VerifiedFinding with sensible defaults.
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

describe('isConfirmed — adversarial majority threshold (CRITICAL)', () => {
  it('confirms with 3 votes and 0 or 1 refutations', () => {
    // ceil(3/2) = 2, so refuted must be < 2.
    expect(isConfirmed(0, 3)).toBe(true);
    expect(isConfirmed(1, 3)).toBe(true);
  });

  it('discards with 3 votes and 2 or 3 refutations', () => {
    expect(isConfirmed(2, 3)).toBe(false);
    expect(isConfirmed(3, 3)).toBe(false);
  });

  it('with 2 votes requires 0 refutations (a single skeptic discards)', () => {
    // ceil(2/2) = 1, so refuted must be < 1 → only 0 confirms.
    expect(isConfirmed(0, 2)).toBe(true);
    expect(isConfirmed(1, 2)).toBe(false);
    expect(isConfirmed(2, 2)).toBe(false);
  });

  it('never confirms with zero votes (no evidence either way)', () => {
    expect(isConfirmed(0, 0)).toBe(false);
  });

  it('with 1 vote requires 0 refutations', () => {
    // ceil(1/2) = 1, so refuted must be < 1.
    expect(isConfirmed(0, 1)).toBe(true);
    expect(isConfirmed(1, 1)).toBe(false);
  });
});

describe('parseArgs', () => {
  it('normalizes a plain object and applies defaults', () => {
    const out = parseArgs({ flow: 'login', paths: ['a.ts', 'b.ts'] });
    expect(out.flow).toBe('login');
    expect(out.paths).toEqual(['a.ts', 'b.ts']);
    // Defaults filled in:
    expect(out.rootDir).toBe('.');
    expect(out.readmePaths).toEqual([]);
    expect(out.adrDir).toBe('');
    expect(out.priorSkill).toBeNull();
    expect(out.ledgerPath).toBeNull();
    expect(out.stamp).toBe('unstamped');
    expect(out.distill).toBe(false);
    expect(out.runs).toBe(1);
  });

  it('parses a JSON-encoded string', () => {
    const out = parseArgs(JSON.stringify({ flow: 'signup', stamp: '2026-06-03', distill: true, runs: 4 }));
    expect(out.flow).toBe('signup');
    expect(out.stamp).toBe('2026-06-03');
    expect(out.distill).toBe(true);
    expect(out.runs).toBe(4);
  });

  it('returns all-default args for undefined/empty', () => {
    const fromUndefined = parseArgs(undefined);
    const fromEmpty = parseArgs({});
    for (const out of [fromUndefined, fromEmpty]) {
      expect(out.flow).toBe('unknown-flow');
      expect(out.paths).toEqual([]);
      expect(out.distill).toBe(false);
      expect(out.runs).toBe(1);
    }
  });

  it('treats distill as boolean true only when strictly true', () => {
    expect(parseArgs({ distill: 'true' }).distill).toBe(false);
    expect(parseArgs({ distill: 1 }).distill).toBe(false);
    expect(parseArgs({ distill: true }).distill).toBe(true);
  });
});

describe('partition', () => {
  it('separates confirmed from discarded using the majority rule', () => {
    const findings: VerifiedFinding[] = [
      vf({ title: 'confirmed-a', refutedCount: 1, voteCount: 3 }),
      vf({ title: 'discarded-a', refutedCount: 2, voteCount: 3 }),
      vf({ title: 'confirmed-b', refutedCount: 0, voteCount: 3 }),
      vf({ title: 'discarded-b', refutedCount: 0, voteCount: 0 }),
    ];
    const { confirmed, discarded } = partition(findings);
    expect(confirmed.map((f) => f.title).sort()).toEqual(['confirmed-a', 'confirmed-b']);
    expect(discarded.map((f) => f.title).sort()).toEqual(['discarded-a', 'discarded-b']);
  });

  it('sorts confirmed findings by severity (critical first, info last)', () => {
    const severities: Severity[] = ['info', 'critical', 'low', 'high', 'medium'];
    const findings = severities.map((s) =>
      vf({ title: s, severity: s, refutedCount: 0, voteCount: 3 }),
    );
    const { confirmed } = partition(findings);
    expect(confirmed.map((f) => f.severity)).toEqual([
      'critical',
      'high',
      'medium',
      'low',
      'info',
    ]);
    // And matches sevRank ordering explicitly.
    const ranks = confirmed.map((f) => sevRank[f.severity]);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  it('does not sort discarded findings (only confirmed are ordered)', () => {
    const { confirmed, discarded } = partition([
      vf({ title: 'x', severity: 'low', refutedCount: 3, voteCount: 3 }),
    ]);
    expect(confirmed).toHaveLength(0);
    expect(discarded).toHaveLength(1);
  });
});

describe('formatReport', () => {
  const confirmed: VerifiedFinding[] = [
    vf({ title: 'QA bug', role: 'QA', dimension: 'qa-happy', severity: 'critical', file: 'a.ts', line: '5' }),
    vf({ title: 'Val gap', role: 'Validacion', dimension: 'val-contracts', severity: 'high' }),
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

  it('includes the flow, stamp and totals header', () => {
    const md = formatReport('checkout', '2026-06-03', confirmed, discarded);
    expect(md).toContain('# deepcheck — auditoría de "checkout"');
    expect(md).toContain('Corrida: 2026-06-03 · 3 hallazgos confirmados · 1 descartados');
  });

  it('groups confirmed findings by role with per-role counts', () => {
    const md = formatReport('checkout', '2026-06-03', confirmed, discarded);
    expect(md).toContain('| QA | 1 |');
    expect(md).toContain('| Validación | 1 |');
    expect(md).toContain('| Auditoría | 1 |');
    expect(md).toContain('**[CRITICAL] QA bug** (`qa-happy`)');
    expect(md).toContain('`a.ts:5`');
    expect(md).toContain('**[HIGH] Val gap** (`val-contracts`)');
    expect(md).toContain('**[HIGH] Sec hole** (`aud-security`)');
  });

  it('renders the discarded section with the refuter reason', () => {
    const md = formatReport('checkout', '2026-06-03', confirmed, discarded);
    expect(md).toContain('## Descartados por el filtro adversarial');
    expect(md).toContain('~~false positive~~ (`aud-perf`, low) — refutado 2/3. Razón: no real impact here');
  });

  it('shows placeholder text when a role or the discarded section is empty', () => {
    const md = formatReport('checkout', '2026-06-03', [], []);
    expect(md).toContain('_Sin hallazgos confirmados._');
    expect(md).toContain('## Descartados por el filtro adversarial (transparencia)\n_Ninguno._');
    expect(md).toContain('| QA | 0 |');
  });
});
