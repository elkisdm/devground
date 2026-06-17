import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { parseCommitType } from './conventional.js';
import { netGrossRatio, round, median } from './stats.js';
import { isTestFile, isAdrOrSpecFile } from './detectors.js';

export { median };

/**
 * Commit-level segmentation that measures the REAL impact of spec-flow by
 * comparing spec-flow changes against a same-repo pre-rollout control.
 *
 * Three anti-trap rules, learned the hard way in the impact audit, are baked in
 * (see ADR-0014):
 *  (a) STRICT detectors (see ./detectors) — never substring matching.
 *  (b) BASELINE-RELATIVE — every metric compares a repo against its OWN control;
 *      cross-repo aggregation takes the MEDIAN of per-repo deltas, never pools
 *      raw counts (a test-heavy repo would otherwise dominate a test-poor one).
 *  (c) DENSITY-NORMALIZED — we compare per-commit RATES, never absolute totals,
 *      so commit density cannot distort a metric. The control is the K most-RECENT
 *      pre-rollout code commits: recency controls the learning trend (a recent
 *      commit reflects today's skill) without an equal-length calendar window
 *      starving the sample (an early version did exactly that — see ADR-0014).
 *      The audit's fix-follow-up metric is deliberately NOT implemented: it
 *      conflated commit density with fragility.
 */

const SEP = '\x1f'; // unit separator, safe inside commit metadata
const REC = '\x1e'; // record separator, prefixes each commit
const CODE_TYPES: ReadonlySet<string> = new Set(['feat', 'fix', 'perf', 'refactor']);
const SPEC_FLOW_DIR = '.spec-flow/';

/** Minimum control commits for a repo's comparison to be trustworthy. */
export const MIN_CONTROL_COMMITS = 8;
/** Minimum spec-flow commits before a repo's rates mean anything. */
export const MIN_SPECFLOW_COMMITS = 5;
/** How many most-recent pre-rollout code commits to use as the control. */
export const CONTROL_TARGET = 30;

export interface CommitDetail {
  hash: string;
  /** YYYY-MM-DD author date. */
  day: string;
  subject: string;
  files: string[];
  added: number;
  deleted: number;
}

export type Segment = 'spec-flow' | 'control' | 'other';

export interface SegmentMetrics {
  commits: number;
  /** Mean code files touched per commit (excludes `.spec-flow/` telemetry). */
  filesPerCommit: number;
  /** Mean (added + deleted) lines per commit. */
  churnPerCommit: number;
  /** (added - deleted) / (added + deleted) across the segment — code survival. */
  netGrossRatio: number;
  /** Fraction of commits touching ≥1 real test file. */
  testCouplingRate: number;
  /** Fraction of commits touching ≥1 ADR/spec file. */
  adrCouplingRate: number;
  /** Calendar length of the window this segment was measured over. */
  windowDays: number;
  /** commits / windowDays — reported for transparency, never used as an outcome. */
  commitsPerWindowDay: number;
}

// ---------------------------------------------------------------------------
// git shelling (thin; the logic below is pure and unit-tested)
// ---------------------------------------------------------------------------

function safeGit(args: readonly string[], maxBuffer: number): string {
  try {
    return execFileSync('git', args as string[], { encoding: 'utf-8', maxBuffer });
  } catch {
    return '';
  }
}

/** Hashes of commits that touched `.spec-flow/events.jsonl` — the spec-flow changes. */
export function specFlowHashes(repoPath: string): Set<string> {
  const out = safeGit(
    ['-C', repoPath, 'log', '--no-merges', '--format=%H', '--', '.spec-flow/events.jsonl'],
    16 * 1024 * 1024,
  );
  return new Set(out.split('\n').map((l) => l.trim()).filter((l) => l !== ''));
}

/** Collects per-commit detail (files + churn) for the given authors. */
export function collectCommitDetails(
  repoPath: string,
  authorEmails: readonly string[],
  since: string | null,
  until: string | null,
): CommitDetail[] {
  const args = [
    '-C',
    repoPath,
    'log',
    '--no-merges',
    '--numstat',
    '--date=format:%Y-%m-%d',
    `--pretty=format:${REC}${SEP}%H${SEP}%ad${SEP}%s`,
  ];
  for (const email of authorEmails) args.push(`--author=${email}`);
  if (since) args.push(`--since=${since}`);
  if (until) args.push(`--until=${until}`);
  return parseCommitDetails(safeGit(args, 256 * 1024 * 1024));
}

/** Parses `git log --numstat` output (REC-prefixed) into commit details. Pure. */
export function parseCommitDetails(out: string): CommitDetail[] {
  const commits: CommitDetail[] = [];
  for (const record of out.split(REC)) {
    if (record.trim() === '') continue;
    const lines = record.split('\n');
    const header = lines[0] ?? '';
    const [, hash, day, ...rest] = header.split(SEP);
    if (!hash) continue;
    const detail: CommitDetail = {
      hash,
      day: day ?? '',
      subject: rest.join(SEP),
      files: [],
      added: 0,
      deleted: 0,
    };
    for (const line of lines.slice(1)) {
      const trimmed = line.trim();
      if (trimmed === '') continue;
      const parts = trimmed.split('\t');
      if (parts.length < 3) continue;
      const [a, d, ...pathParts] = parts;
      const file = pathParts.join('\t');
      if (a !== '-') detail.added += Number(a) || 0; // binary files report "-"
      if (d !== '-') detail.deleted += Number(d) || 0;
      detail.files.push(file);
    }
    commits.push(detail);
  }
  return commits;
}

// ---------------------------------------------------------------------------
// pure segmentation + metrics
// ---------------------------------------------------------------------------

/** Whole days between two YYYY-MM-DD dates (b - a). */
export function daysBetween(a: string, b: string): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** Shifts a YYYY-MM-DD date by `days` (may be negative). */
export function shiftDate(date: string, days: number): string {
  const t = Date.parse(`${date}T00:00:00Z`) + days * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

/** Is this commit subject a code-type change (feat/fix/perf/refactor)? */
export function isCodeCommit(subject: string): boolean {
  return CODE_TYPES.has(parseCommitType(subject).type);
}

/**
 * Selects the control: the K most-recent pre-rollout code commits. Recency
 * (not an equal-length calendar window) controls the learning trend without
 * starving the sample — see the module doc, rule (c).
 */
export function selectControl(
  commits: readonly CommitDetail[],
  sfHashes: ReadonlySet<string>,
  rollout: string,
  target: number = CONTROL_TARGET,
): CommitDetail[] {
  return commits
    .filter((c) => classifyCommit(c, sfHashes, rollout) === 'control' && c.day !== '')
    .sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0)) // most recent first
    .slice(0, target);
}

/** Calendar span (days) covered by a set of commits, minimum 1. */
export function spanDays(commits: readonly CommitDetail[]): number {
  const days = commits.map((c) => c.day).filter((d) => d !== '').sort();
  if (days.length === 0) return 1;
  return Math.max(daysBetween(days[0]!, days[days.length - 1]!) + 1, 1);
}

/** Classifies a commit into a segment given the spec-flow hashes and rollout date. */
export function classifyCommit(
  commit: CommitDetail,
  sfHashes: ReadonlySet<string>,
  rollout: string,
): Segment {
  if (sfHashes.has(commit.hash)) return 'spec-flow';
  if (commit.day < rollout && isCodeCommit(commit.subject)) return 'control';
  return 'other';
}

/** Computes segment metrics over a window of `windowDays` calendar days. */
export function segmentMetrics(commits: readonly CommitDetail[], windowDays: number): SegmentMetrics {
  const n = commits.length;
  if (n === 0) {
    return {
      commits: 0,
      filesPerCommit: 0,
      churnPerCommit: 0,
      netGrossRatio: 0,
      testCouplingRate: 0,
      adrCouplingRate: 0,
      windowDays,
      commitsPerWindowDay: 0,
    };
  }
  let files = 0;
  let added = 0;
  let deleted = 0;
  let withTest = 0;
  let withAdr = 0;
  for (const c of commits) {
    const codeFiles = c.files.filter((f) => !f.startsWith(SPEC_FLOW_DIR));
    files += codeFiles.length;
    added += c.added;
    deleted += c.deleted;
    if (codeFiles.some(isTestFile)) withTest++;
    if (codeFiles.some(isAdrOrSpecFile)) withAdr++;
  }
  return {
    commits: n,
    filesPerCommit: round(files / n, 2),
    churnPerCommit: round((added + deleted) / n, 1),
    netGrossRatio: round(netGrossRatio(added, deleted)),
    testCouplingRate: round(withTest / n, 3),
    adrCouplingRate: round(withAdr / n, 3),
    windowDays,
    commitsPerWindowDay: windowDays > 0 ? round(n / windowDays, 2) : 0,
  };
}

export interface RepoImpact {
  repo: string;
  rolloutDate: string | null;
  specFlow: SegmentMetrics;
  control: SegmentMetrics;
  /** True when the control window has enough commits to trust the comparison. */
  comparable: boolean;
  /** Mean questionsAsked per tier (the friction gauge). */
  frictionByTier: Record<number, number>;
}

/**
 * Computes a repo's impact comparison from already-collected commits + spec-flow
 * metadata. Pure, so the methodology is fully testable without shelling git.
 */
export function computeRepoImpact(args: {
  repo: string;
  commits: readonly CommitDetail[];
  sfHashes: ReadonlySet<string>;
  rolloutDate: string | null;
  frictionByTier: Record<number, number>;
}): RepoImpact {
  const { repo, commits, sfHashes, rolloutDate, frictionByTier } = args;

  const sf = commits.filter((c) => sfHashes.has(c.hash));
  const control = rolloutDate ? selectControl(commits, sfHashes, rolloutDate) : [];

  return {
    repo,
    rolloutDate,
    specFlow: segmentMetrics(sf, spanDays(sf)),
    control: segmentMetrics(control, spanDays(control)),
    comparable: sf.length >= MIN_SPECFLOW_COMMITS && control.length >= MIN_CONTROL_COMMITS,
    frictionByTier,
  };
}

// ---------------------------------------------------------------------------
// baseline-relative aggregation (rule b)
// ---------------------------------------------------------------------------

export type ImpactMetricKey =
  | 'filesPerCommit'
  | 'churnPerCommit'
  | 'netGrossRatio'
  | 'testCouplingRate'
  | 'adrCouplingRate';

export const IMPACT_METRICS: readonly ImpactMetricKey[] = [
  'adrCouplingRate',
  'testCouplingRate',
  'filesPerCommit',
  'churnPerCommit',
  'netGrossRatio',
];

export interface MetricDelta {
  metric: ImpactMetricKey;
  /** Median of each repo's spec-flow value. */
  medianSpecFlow: number | null;
  /** Median of each repo's control value. */
  medianControl: number | null;
  /** Median of each repo's (spec-flow − control) delta. */
  medianDelta: number | null;
  /** Repos that contributed (comparable only). */
  repos: number;
}

/**
 * Aggregates across repos the BASELINE-RELATIVE way: per-metric median of
 * per-repo deltas, using only comparable repos. Never pools raw counts.
 */
export function aggregateImpact(impacts: readonly RepoImpact[]): MetricDelta[] {
  const comparable = impacts.filter((i) => i.comparable);
  return IMPACT_METRICS.map((metric) => {
    const sf = comparable.map((i) => i.specFlow[metric]);
    const ctrl = comparable.map((i) => i.control[metric]);
    const deltas = comparable.map((i) => i.specFlow[metric] - i.control[metric]);
    return {
      metric,
      medianSpecFlow: median(sf),
      medianControl: median(ctrl),
      medianDelta: median(deltas),
      repos: comparable.length,
    };
  });
}
