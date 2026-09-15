import { describe, it, expect } from 'vitest';
import { renderSpecFlowImpact } from './spec-flow-report.js';
import type { RepoImpact, MetricDelta } from './spec-flow-segment.js';
import type { AggregatedReviewLoop } from './spec-flow-review-loop.js';

const seg = (over: Partial<RepoImpact['specFlow']> = {}) => ({
  commits: 5,
  filesPerCommit: 4,
  churnPerCommit: 100,
  netGrossRatio: 0.8,
  testCouplingRate: 0.7,
  adrCouplingRate: 0.18,
  windowDays: 10,
  commitsPerWindowDay: 0.5,
  ...over,
});

const impact = (over: Partial<RepoImpact> = {}): RepoImpact => ({
  repo: 'atlas',
  rolloutDate: '2026-06-04',
  specFlow: seg(),
  control: seg({ adrCouplingRate: 0.02, testCouplingRate: 0.65, filesPerCommit: 7 }),
  comparable: true,
  frictionByTier: {},
  ...over,
});

const agg: MetricDelta[] = [
  {
    metric: 'adrCouplingRate',
    medianSpecFlow: 0.18,
    medianControl: 0.02,
    medianDelta: 0.16,
    repos: 1,
  },
];

const EMPTY_REVIEW_LOOP: AggregatedReviewLoop = {
  repos: 0,
  passes: null,
  capped: null,
  induced: null,
  redesigned: null,
  unclosed: null,
  open: null,
  firstPassFindings: { premortem: null, compliance: null, undeclared: null, baseline05: null },
  reversalRate: null,
  gateAdoption: null,
  verifiedShare: null,
  resolvedShare: null,
};

const FULL_REVIEW_LOOP: AggregatedReviewLoop = {
  repos: 4,
  passes: { median: 2, sharePassesAtMost2: 0.83, n: 12, repos: 4 },
  capped: { rate: 0.33, n: 9, repos: 3 },
  induced: { rate: 0.17, n: 12, repos: 4 },
  redesigned: { rate: 0.08, n: 12, repos: 4 },
  unclosed: { rate: 0.2, count: 2, n: 14, repos: 3 },
  open: { sum: 5, median: 0, n: 12, repos: 4 },
  firstPassFindings: {
    premortem: {
      meanExact: 3.5,
      nTotal: 8,
      nExact: 6,
      nCensored: 2,
      nUnknownCap: 0,
      cappedShare: 0.25,
      repos: 2,
    },
    compliance: null,
    undeclared: null,
    baseline05: {
      meanExact: 9,
      nTotal: 40,
      nExact: 40,
      nCensored: 0,
      nUnknownCap: 0,
      cappedShare: null,
      repos: 4,
    },
  },
  reversalRate: { ratio: 0.12, n: 30, repos: 3 },
  gateAdoption: { ratio: 0.67, n: 6, repos: 2 },
  verifiedShare: { rate: 0.75, n: 8, repos: 2 },
  resolvedShare: { ratio: 0.92, n: 10, repos: 3 },
};

describe('renderSpecFlowImpact', () => {
  it('renders rates as percentages and references the ADR', () => {
    const out = renderSpecFlowImpact([impact()], agg, {
      1: { mean: 0.25, n: 4 },
      3: { mean: 1.66, n: 3 },
    });
    expect(out).toContain('ADR-0014');
    expect(out).toContain('18%→2%'); // adr coupling sf→ctrl
    expect(out).toContain('T3 | 1.66 (n=3)');
    // L-2: never a false T0 row
    expect(out).not.toContain('T0 |');
  });

  it('lists non-comparable repos instead of dropping them (no silent caps)', () => {
    const out = renderSpecFlowImpact(
      [impact({ repo: 'tiny', comparable: false, control: seg({ commits: 3 }) })],
      agg,
      {},
    );
    expect(out).toContain('Not comparable');
    expect(out).toContain('tiny (n_control=3');
  });

  it('renders the Review loop header/passes/induced/unclosed lines (L-11)', () => {
    const out = renderSpecFlowImpact([impact()], agg, {}, FULL_REVIEW_LOOP);

    expect(out).toContain('## Review loop (mediana entre 4 repos)');
    expect(out).toContain('pasadas: mediana 2 · ≤2: 83% (n=12)');
    expect(out).toContain('tope en la 1ª pasada: 33% (n=9 declaran el flag)');
    expect(out).toContain('inducidos: 17% (n=12)');
    expect(out).toContain('rediseños: 8% (n=12)');
    expect(out).toContain('deuda abierta: 5 en total, mediana 0 (n=12)');
    expect(out).toContain('sin cierre: mediana 20% entre 3 repos (2 de 14 cambios en total)');
  });

  it('renders the first-pass-findings arms and the L-10 inference-quality lines', () => {
    const out = renderSpecFlowImpact([impact()], agg, {}, FULL_REVIEW_LOOP);

    expect(out).toContain('con pre-mortem 3.5 (n=8, 25% censurados)');
    expect(out).toContain('cumplimiento — (n=0)');
    expect(out).toContain('línea base 0.5 9.0 (n=40; contaba todas las pasadas, sin flag)');
    expect(out).toContain('reversiones 0.12 por supuesto (n=30 cambios)');
    expect(out).toContain('gate: 67% de huecos adoptados (n=6)');
    expect(out).toContain('tests verificados en T2+: 75% (n=8)');
    expect(out).toContain('resueltos/encontrados: 92% (n=10)');
  });

  it('omits the Review loop block entirely when there is no reviewed data', () => {
    const withoutArg = renderSpecFlowImpact([impact()], agg, {});
    expect(withoutArg).not.toContain('Review loop');

    const withZero = renderSpecFlowImpact([impact()], agg, {}, EMPTY_REVIEW_LOOP);
    expect(withZero).not.toContain('Review loop');
  });

  it('una metrica sin datos se omite en vez de mostrar 0/— (cada linea con su propio n)', () => {
    const reviewLoop: AggregatedReviewLoop = {
      ...EMPTY_REVIEW_LOOP,
      repos: 2,
      passes: { median: 1, sharePassesAtMost2: 1, n: 2, repos: 2 },
      // capped/induced/redesigned/unclosed/open/firstPassFindings sin datos
    };
    const out = renderSpecFlowImpact([impact()], agg, {}, reviewLoop);
    expect(out).toContain('pasadas: mediana 1');
    expect(out).not.toContain('tope en la 1ª pasada');
    expect(out).not.toContain('inducidos');
    expect(out).not.toContain('sin cierre');
    expect(out).not.toContain('deuda abierta');
    expect(out).not.toContain('hallazgos 1ª pasada');
    expect(out).not.toContain('calidad de inferencia');
  });

  it('lista los worktrees descartados sin que cuenten dos veces (L-7)', () => {
    const out = renderSpecFlowImpact([impact()], agg, {}, undefined, [
      { path: '/repos/atlas-wt', reason: 'same-repo', keptAs: '/repos/atlas' },
    ]);
    expect(out).toContain('Worktrees descartados');
    expect(out).toContain('/repos/atlas-wt → mismo repositorio que /repos/atlas');
  });

  it('F10(b): un worktree huerfano se lista con su propio motivo, no como "mismo repositorio"', () => {
    const out = renderSpecFlowImpact([impact()], agg, {}, undefined, [
      { path: '/repos/orphan', reason: 'orphaned-worktree' },
    ]);
    expect(out).toContain('/repos/orphan → worktree huérfano (gitdir inexistente)');
  });
});
