import type {
  RepoImpact,
  MetricDelta,
  ImpactMetricKey,
  AggregatedReviewLoop,
} from './spec-flow-segment.js';

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

/** One decimal, no trailing float noise — for the review-loop's mean findings. */
function fmtMean(value: number): string {
  return value.toFixed(1);
}

export function renderSpecFlowImpact(
  impacts: readonly RepoImpact[],
  aggregate: readonly MetricDelta[],
  frictionByTier: Record<number, number>,
  reviewLoop?: AggregatedReviewLoop,
  discardedWorktrees?: readonly { path: string; keptAs: string }[],
): string {
  const lines: string[] = [];
  lines.push('# spec-flow impact');
  lines.push('');
  lines.push('_Baseline-relative · density-normalized · strict detectors — see ADR-0014._');
  lines.push('');

  // Per-repo
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
  for (const tier of Object.keys(frictionByTier)
    .map(Number)
    .sort((a, b) => a - b)) {
    lines.push(`| T${tier} | ${frictionByTier[tier].toFixed(2)} |`);
  }
  lines.push('');

  // Review loop (spec-flow 0.6, ADR-0037) — every line carries its OWN n; a
  // line whose metric has no data is omitted rather than shown as 0/—.
  const hasAnyReviewLoopData =
    reviewLoop !== undefined &&
    (reviewLoop.passes !== null ||
      reviewLoop.capped !== null ||
      reviewLoop.induced !== null ||
      reviewLoop.redesigned !== null ||
      reviewLoop.unclosed !== null ||
      reviewLoop.open !== null ||
      reviewLoop.firstPassFindings.premortem !== null ||
      reviewLoop.firstPassFindings.compliance !== null ||
      reviewLoop.firstPassFindings.baseline05 !== null);

  if (reviewLoop && hasAnyReviewLoopData) {
    lines.push(`## Review loop (mediana entre ${reviewLoop.repos} repos)`);
    lines.push('');

    if (reviewLoop.passes) {
      lines.push(
        `- pasadas: mediana ${reviewLoop.passes.median} · ≤2: ${pctStr(reviewLoop.passes.sharePassesAtMost2)} (n=${reviewLoop.passes.n})`,
      );
    }
    if (reviewLoop.capped) {
      lines.push(
        `- tope alcanzado en la 1ª pasada: ${pctStr(reviewLoop.capped.rate)} (n=${reviewLoop.capped.n} que lo reportan)`,
      );
    }
    if (reviewLoop.induced || reviewLoop.redesigned) {
      const parts: string[] = [];
      if (reviewLoop.induced) {
        parts.push(
          `hallazgos inducidos: ${pctStr(reviewLoop.induced.rate)} (n=${reviewLoop.induced.n})`,
        );
      }
      if (reviewLoop.redesigned) {
        parts.push(
          `rediseños: ${pctStr(reviewLoop.redesigned.rate)} (n=${reviewLoop.redesigned.n})`,
        );
      }
      lines.push(`- ${parts.join(' · ')}`);
    }
    if (reviewLoop.unclosed) {
      lines.push(
        `- reviews sin cierre: ${reviewLoop.unclosed.count} de ${reviewLoop.unclosed.n} specs 0.6`,
      );
    }
    if (reviewLoop.open) {
      lines.push(
        `- deuda abierta: ${reviewLoop.open.sum} en total · mediana ${reviewLoop.open.median} (n=${reviewLoop.open.n})`,
      );
    }

    const { premortem, compliance, baseline05 } = reviewLoop.firstPassFindings;
    if (premortem || compliance || baseline05) {
      const parts: string[] = [];
      parts.push(`con pre-mortem ${fmtArm(premortem)}`);
      parts.push(`pre-mortem de cumplimiento ${fmtArm(compliance)}`);
      parts.push(
        baseline05
          ? `línea base 0.5 ${fmtMean(baseline05.mean)} (n=${baseline05.n}; contaba todas las pasadas, tope desconocido)`
          : 'línea base 0.5 —',
      );
      lines.push(`- hallazgos 1ª pasada (sin censurados): ${parts.join(' · ')}`);
    }
    lines.push('');
  }

  // Discarded worktrees (causa C #8) — never silently double-count a repo.
  if (discardedWorktrees && discardedWorktrees.length > 0) {
    lines.push('## Worktrees descartados (mismo repo, no cuentan dos veces)');
    lines.push('');
    for (const d of discardedWorktrees) {
      lines.push(`- ${d.path} → ya contado como ${d.keptAs}`);
    }
    lines.push('');
  }

  // Honesty footer
  const notComparable = impacts.filter((i) => !i.comparable);
  if (notComparable.length > 0) {
    lines.push(
      '## Not comparable (insufficient pre-rollout control — NOT dropped, just unrankable)',
    );
    lines.push('');
    for (const i of notComparable) {
      lines.push(`- ${i.repo} (n_control=${i.control.commits}, rollout=${i.rolloutDate ?? 'n/a'})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/** Renders a `FirstPassArm`-shaped bucket, or `—` when the arm has no data. */
function fmtArm(arm: { mean: number; n: number; cappedShare: number | null } | null): string {
  if (arm === null) return '—';
  const capped = arm.cappedShare !== null ? `, ${pctStr(arm.cappedShare)} censurados` : '';
  return `${fmtMean(arm.mean)} (n=${arm.n}${capped})`;
}
