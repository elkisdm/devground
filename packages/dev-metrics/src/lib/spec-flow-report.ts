import type { RepoImpact, MetricDelta, ImpactMetricKey } from './spec-flow-segment.js';

/**
 * Renders the spec-flow impact comparison as markdown. The report is honest by
 * construction: it shows per-repo n's and windows, never pools raw counts, and
 * lists repos with no usable baseline instead of silently dropping them.
 */

function pctStr(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

/** Is this metric a 0..1 rate (render as %) or a raw number? */
function isRate(metric: ImpactMetricKey): boolean {
  return metric === 'testCouplingRate' || metric === 'adrCouplingRate' || metric === 'netGrossRatio';
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

export function renderSpecFlowImpact(
  impacts: readonly RepoImpact[],
  aggregate: readonly MetricDelta[],
  frictionByTier: Record<number, number>,
): string {
  const lines: string[] = [];
  lines.push('# spec-flow impact');
  lines.push('');
  lines.push('_Baseline-relative · density-normalized · strict detectors — see ADR-0014._');
  lines.push('');

  // Per-repo
  lines.push('## Per-repo (spec-flow vs same-repo pre-rollout control)');
  lines.push('');
  lines.push('| repo | n_sf | n_ctrl | comparable | ADR sf→ctrl | TEST sf→ctrl | files/commit sf→ctrl | survival sf→ctrl |');
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

  // Aggregate
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

  // Friction
  lines.push('## Friction (mean questions_asked by tier — all spec-flow events)');
  lines.push('');
  lines.push('| tier | mean questions |');
  lines.push('|--:|--:|');
  for (const tier of Object.keys(frictionByTier).map(Number).sort((a, b) => a - b)) {
    lines.push(`| T${tier} | ${frictionByTier[tier].toFixed(2)} |`);
  }
  lines.push('');

  // Honesty footer
  const notComparable = impacts.filter((i) => !i.comparable);
  if (notComparable.length > 0) {
    lines.push('## Not comparable (insufficient pre-rollout control — NOT dropped, just unrankable)');
    lines.push('');
    for (const i of notComparable) {
      lines.push(`- ${i.repo} (n_control=${i.control.commits}, rollout=${i.rolloutDate ?? 'n/a'})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
