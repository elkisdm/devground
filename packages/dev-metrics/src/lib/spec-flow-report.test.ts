import { describe, it, expect } from 'vitest';
import { renderSpecFlowImpact } from './spec-flow-report.js';
import type { RepoImpact, MetricDelta, AggregatedReviewLoop } from './spec-flow-segment.js';

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
  firstPassFindings: { premortem: null, compliance: null, baseline05: null },
};

describe('renderSpecFlowImpact', () => {
  it('renders rates as percentages and references the ADR', () => {
    const out = renderSpecFlowImpact([impact()], agg, { 1: 0.25, 3: 1.66 });
    expect(out).toContain('ADR-0014');
    expect(out).toContain('18%→2%'); // adr coupling sf→ctrl
    expect(out).toContain('T3 | 1.66');
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

  it('renders the Review loop block with the n of EACH line, real data', () => {
    const reviewLoop: AggregatedReviewLoop = {
      repos: 4,
      passes: { median: 2, sharePassesAtMost2: 0.83, n: 12, repos: 4 },
      capped: { rate: 0.33, n: 9, repos: 3 },
      induced: { rate: 0.17, n: 12, repos: 4 },
      redesigned: { rate: 0.08, n: 12, repos: 4 },
      unclosed: { count: 2, n: 14, repos: 3 },
      open: { sum: 5, median: 0, n: 12, repos: 4 },
      firstPassFindings: {
        premortem: { mean: 3.5, n: 8, cappedShare: 0.25, repos: 2 },
        compliance: null,
        baseline05: { mean: 9, n: 40, cappedShare: null, repos: 4 },
      },
    };

    const out = renderSpecFlowImpact([impact()], agg, {}, reviewLoop);

    expect(out).toContain('## Review loop (mediana entre 4 repos)');
    expect(out).toContain('pasadas: mediana 2 · ≤2: 83% (n=12)');
    expect(out).toContain('tope alcanzado en la 1ª pasada: 33% (n=9 que lo reportan)');
    expect(out).toContain('hallazgos inducidos: 17% (n=12) · rediseños: 8% (n=12)');
    expect(out).toContain('reviews sin cierre: 2 de 14 specs 0.6');
    expect(out).toContain('deuda abierta: 5 en total · mediana 0 (n=12)');
    expect(out).toContain(
      'hallazgos 1ª pasada (sin censurados): con pre-mortem 3.5 (n=8, 25% censurados) · ' +
        'pre-mortem de cumplimiento — · línea base 0.5 9.0 (n=40; contaba todas las pasadas, tope desconocido)',
    );
    // T0 falso (causa D) nunca debe aparecer en la fila de fricción real
    expect(out).not.toContain('T0 |');
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
    expect(out).not.toContain('tope alcanzado');
    expect(out).not.toContain('hallazgos inducidos');
    expect(out).not.toContain('reviews sin cierre');
    expect(out).not.toContain('deuda abierta');
    expect(out).not.toContain('hallazgos 1ª pasada');
  });

  it('lista los worktrees descartados sin que cuenten dos veces', () => {
    const out = renderSpecFlowImpact([impact()], agg, {}, undefined, [
      { path: '/repos/atlas-wt', keptAs: '/repos/atlas' },
    ]);
    expect(out).toContain('Worktrees descartados');
    expect(out).toContain('/repos/atlas-wt → ya contado como /repos/atlas');
  });
});
