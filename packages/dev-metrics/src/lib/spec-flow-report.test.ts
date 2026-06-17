import { describe, it, expect } from 'vitest';
import { renderSpecFlowImpact } from './spec-flow-report.js';
import type { RepoImpact, MetricDelta } from './spec-flow-segment.js';

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
  { metric: 'adrCouplingRate', medianSpecFlow: 0.18, medianControl: 0.02, medianDelta: 0.16, repos: 1 },
];

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
});
