import type { Snapshot, EventAnnotation } from '../types.js';
import { totalTokens } from './transcript.js';
import { eventsInPeriod } from './events.js';
import { aggregateByCohort, type CohortAggregate } from './cohort.js';
import type { Cohort } from './adoption.js';

export interface MetricRow {
  metric: string;
  a: number | null;
  b: number | null;
  delta: number | null;
  pctChange: number | null;
}

function delta(a: number | null, b: number | null): number | null {
  if (a === null || b === null) return null;
  return b - a;
}

function pctChange(a: number | null, b: number | null): number | null {
  if (a === null || b === null || a === 0) return null;
  return ((b - a) / Math.abs(a)) * 100;
}

function row(metric: string, a: number | null, b: number | null): MetricRow {
  return { metric, a, b, delta: delta(a, b), pctChange: pctChange(a, b) };
}

/** Builds the comparison rows between two snapshots. */
export function diffSnapshots(a: Snapshot, b: Snapshot): MetricRow[] {
  return [
    row('git.commits', a.git.commits, b.git.commits),
    row('git.added', a.git.churn.added, b.git.churn.added),
    row('git.deleted', a.git.churn.deleted, b.git.churn.deleted),
    row('git.netGrossRatio', a.git.churn.netGrossRatio, b.git.churn.netGrossRatio),
    row('git.reworkRatio', a.git.reworkRatio, b.git.reworkRatio),
    row('git.oneShotPct', a.git.files.oneShotPct, b.git.files.oneShotPct),
    row('git.reworkedPct', a.git.files.reworkedPct, b.git.files.reworkedPct),
    row('git.commitsPerActiveDay', a.git.commitsPerActiveDay, b.git.commitsPerActiveDay),
    row('tokens.input', a.transcript.tokens.input, b.transcript.tokens.input),
    row('tokens.output', a.transcript.tokens.output, b.transcript.tokens.output),
    row('tokens.total', totalTokens(a.transcript.tokens), totalTokens(b.transcript.tokens)),
    row('tool.Write', a.transcript.toolUse.Write, b.transcript.toolUse.Write),
    row('tool.Edit', a.transcript.toolUse.Edit, b.transcript.toolUse.Edit),
    row('tool.editWriteRatio', a.transcript.editWriteRatio, b.transcript.editWriteRatio),
    row('iter.oneShotPct', a.transcript.fileIteration.oneShotPct, b.transcript.fileIteration.oneShotPct),
    row('iter.iteratedPct', a.transcript.fileIteration.iteratedPct, b.transcript.fileIteration.iteratedPct),
    row('iter.opsPerFile', a.transcript.fileIteration.opsPerFile, b.transcript.fileIteration.opsPerFile),
    row('derived.tokensPerCommit', a.derived.tokensPerCommit, b.derived.tokensPerCommit),
    row('derived.toolCallsPerCommit', a.derived.toolCallsPerCommit, b.derived.toolCallsPerCommit),
    row('derived.churnTokensR2', a.derived.churnTokensR2, b.derived.churnTokensR2),
    row('memory.totalNotes', a.memory?.totalNotes ?? null, b.memory?.totalNotes ?? null),
    row(
      'memory.contextCostMeanEarly',
      a.memory?.contextCost.meanEarlyOutputPerSession ?? null,
      b.memory?.contextCost.meanEarlyOutputPerSession ?? null,
    ),
    row(
      'memory.sessionsReadingMemory',
      a.memory?.reuse.sessionsReadingMemory ?? null,
      b.memory?.reuse.sessionsReadingMemory ?? null,
    ),
  ];
}

/** Picks a cohort's aggregate from a list, or null when absent. */
function findCohort(aggs: readonly CohortAggregate[], cohort: Cohort): CohortAggregate | null {
  return aggs.find((c) => c.cohort === cohort) ?? null;
}

/**
 * Per-cohort diff rows: compares born-standardized vs the rest across the two
 * snapshots. Lets a reader see whether repos that started standardized evolved
 * differently from retrofitted/partial ones.
 */
export function diffByCohort(a: Snapshot, b: Snapshot): MetricRow[] {
  const aCohorts = a.adoption ? aggregateByCohort(a) : [];
  const bCohorts = b.adoption ? aggregateByCohort(b) : [];
  const cohorts: Cohort[] = ['born-standardized', 'retrofitted', 'partial'];
  const rows: MetricRow[] = [];
  for (const c of cohorts) {
    const ca = findCohort(aCohorts, c);
    const cb = findCohort(bCohorts, c);
    if (ca === null && cb === null) continue;
    rows.push(row(`${c}.tokensPerCommit`, ca?.tokensPerCommit ?? null, cb?.tokensPerCommit ?? null));
    rows.push(row(`${c}.churnGross`, ca?.churnGross ?? null, cb?.churnGross ?? null));
    rows.push(row(`${c}.commits`, ca?.commits ?? null, cb?.commits ?? null));
  }
  return rows;
}

function fmt(n: number | null): string {
  if (n === null) return 'n/a';
  return Number.isInteger(n) ? n.toLocaleString('en-US') : n.toFixed(4);
}

function signed(n: number | null, suffix = ''): string {
  if (n === null) return 'n/a';
  const s = Number.isInteger(n) ? n.toLocaleString('en-US') : n.toFixed(4);
  return `${n > 0 ? '+' : ''}${s}${suffix}`;
}

/**
 * Returns the union of events spanning both snapshot periods. These align the
 * pre/post boundary so a transition wave can be told apart from regime change
 * (ADR-0006 caveat 4).
 */
function spanningEvents(a: Snapshot, b: Snapshot): EventAnnotation[] {
  const all = [...a.events, ...b.events];
  const seen = new Set<string>();
  const unique: EventAnnotation[] = [];
  for (const e of all) {
    const key = `${e.date} ${e.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(e);
  }
  const lo = a.period.since ?? b.period.since;
  const hi = b.period.until ?? a.period.until;
  return eventsInPeriod(unique, lo, hi);
}

/** Renders the diff between two snapshots as a markdown table. */
export function renderDiff(a: Snapshot, b: Snapshot): string {
  const rows = diffSnapshots(a, b);
  const lines: string[] = [];

  lines.push(`# dev-metrics diff`);
  lines.push('');
  lines.push(`- **A**: ${a.label ?? '(none)'} | ${a.period.since ?? '...'} -> ${a.period.until ?? '...'}`);
  lines.push(`- **B**: ${b.label ?? '(none)'} | ${b.period.since ?? '...'} -> ${b.period.until ?? '...'}`);
  lines.push('');
  lines.push(`| Metric | A | B | Delta | % change |`);
  lines.push(`| --- | --- | --- | --- | --- |`);
  for (const r of rows) {
    lines.push(
      `| ${r.metric} | ${fmt(r.a)} | ${fmt(r.b)} | ${signed(r.delta)} | ${signed(r.pctChange, '%')} |`,
    );
  }
  lines.push('');

  const cohortRows = diffByCohort(a, b);
  if (cohortRows.length > 0) {
    lines.push(`## By cohort (born-standardized vs the rest)`);
    lines.push('');
    lines.push(`| Metric | A | B | Delta | % change |`);
    lines.push(`| --- | --- | --- | --- | --- |`);
    for (const r of cohortRows) {
      lines.push(
        `| ${r.metric} | ${fmt(r.a)} | ${fmt(r.b)} | ${signed(r.delta)} | ${signed(r.pctChange, '%')} |`,
      );
    }
    lines.push('');
  }

  const events = spanningEvents(a, b);
  if (events.length > 0) {
    lines.push(`## Events between A and B`);
    lines.push('');
    lines.push(
      `> A standard/tool adoption inflates rework and tokens/commit temporarily (transition cost != degradation). Read deltas above against these events.`,
    );
    lines.push('');
    lines.push(`| Date | Label | Description |`);
    lines.push(`| --- | --- | --- |`);
    for (const e of events) {
      lines.push(`| ${e.date} | ${e.label} | ${e.description ?? ''} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
