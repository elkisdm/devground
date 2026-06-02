import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import type { GitMetrics } from '../types.js';
import { parseCommitType, emptyTypeCounts, reworkRatio } from './conventional.js';
import { netGrossRatio, pct, round } from './stats.js';
import { touchDistribution, bump } from './distribution.js';

export interface GitCollectOptions {
  repoPath: string;
  authorEmails: string[];
  since: string | null;
  until: string | null;
}

export interface GitCommit {
  hash: string;
  authorEmail: string;
  /** YYYY-MM-DD of the author date. */
  day: string;
  subject: string;
}

/** Per-repo result: aggregated metrics plus raw totals for correlation. */
export interface GitRepoResult {
  path: string;
  metrics: GitMetrics;
  churnGross: number;
}

const SEP = '\x1f'; // unit separator, safe inside commit metadata

/** True when `dir` looks like a git working tree. */
export function isGitRepo(dir: string): boolean {
  return existsSync(join(dir, '.git'));
}

/**
 * Runs git and returns stdout, or '' when git fails (e.g. an empty repo with
 * no commits yet). Such repos simply contribute no metrics rather than aborting
 * the whole collection.
 */
function safeGitText(args: readonly string[], maxBuffer: number): string {
  try {
    return execFileSync('git', args as string[], { encoding: 'utf-8', maxBuffer });
  } catch {
    return '';
  }
}

function gitLog(opts: GitCollectOptions): GitCommit[] {
  const args = [
    '-C',
    opts.repoPath,
    'log',
    `--pretty=format:%H${SEP}%ae${SEP}%ad${SEP}%s`,
    '--date=format:%Y-%m-%d',
    '--no-merges',
  ];
  for (const email of opts.authorEmails) args.push(`--author=${email}`);
  if (opts.since) args.push(`--since=${opts.since}`);
  if (opts.until) args.push(`--until=${opts.until}`);

  const out = safeGitText(args, 64 * 1024 * 1024);
  const commits: GitCommit[] = [];
  for (const line of out.split('\n')) {
    if (line.trim() === '') continue;
    const [hash, authorEmail, day, ...rest] = line.split(SEP);
    commits.push({
      hash: hash ?? '',
      authorEmail: authorEmail ?? '',
      day: day ?? '',
      subject: rest.join(SEP),
    });
  }
  return commits;
}

interface NumstatTotals {
  added: number;
  deleted: number;
  /** file path -> times it appeared in a numstat (re-touch count). */
  fileTouches: Map<string, number>;
}

function gitNumstat(opts: GitCollectOptions): NumstatTotals {
  const args = [
    '-C',
    opts.repoPath,
    'log',
    '--numstat',
    '--pretty=format:',
    '--no-merges',
  ];
  for (const email of opts.authorEmails) args.push(`--author=${email}`);
  if (opts.since) args.push(`--since=${opts.since}`);
  if (opts.until) args.push(`--until=${opts.until}`);

  const out = safeGitText(args, 256 * 1024 * 1024);
  const fileTouches = new Map<string, number>();
  let added = 0;
  let deleted = 0;

  for (const line of out.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '') continue;
    const parts = trimmed.split('\t');
    if (parts.length < 3) continue;
    const [a, d, ...pathParts] = parts;
    const file = pathParts.join('\t');
    // Binary files report "-"; skip them for line churn but still count touch.
    if (a !== '-') added += Number(a) || 0;
    if (d !== '-') deleted += Number(d) || 0;
    bump(fileTouches, file);
  }

  return { added, deleted, fileTouches };
}

/** Aggregates commits + numstat into `GitMetrics` for one repo. */
export function aggregateGit(commits: GitCommit[], numstat: NumstatTotals): GitMetrics {
  const commitsByAuthor: Record<string, number> = {};
  const typeCounts = emptyTypeCounts();
  const activeDays = new Set<string>();

  for (const c of commits) {
    commitsByAuthor[c.authorEmail] = (commitsByAuthor[c.authorEmail] ?? 0) + 1;
    typeCounts[parseCommitType(c.subject).type]++;
    if (c.day) activeDays.add(c.day);
  }

  const dist = touchDistribution(numstat.fileTouches, 5);
  const days = activeDays.size;

  return {
    commits: commits.length,
    commitsByAuthor,
    churn: {
      added: numstat.added,
      deleted: numstat.deleted,
      netGrossRatio: round(netGrossRatio(numstat.added, numstat.deleted)),
    },
    commitTypes: typeCounts,
    reworkRatio: roundNullable(reworkRatio(typeCounts)),
    files: {
      touched: dist.files,
      oneShotPct: round(dist.oneShotPct, 2),
      reworkedPct: round(dist.heavyPct, 2),
    },
    commitsPerActiveDay: days === 0 ? 0 : round(commits.length / days, 3),
  };
}

function roundNullable(value: number | null): number | null {
  return value === null ? null : round(value);
}

/** Collects git metrics for a single repo. */
export function collectGitRepo(opts: GitCollectOptions): GitRepoResult {
  const commits = gitLog(opts);
  const numstat = gitNumstat(opts);
  const metrics = aggregateGit(commits, numstat);
  return {
    path: opts.repoPath,
    metrics,
    churnGross: numstat.added + numstat.deleted,
  };
}

/** Merges per-repo `GitMetrics` into a single aggregate. */
export function mergeGitMetrics(results: readonly GitRepoResult[]): GitMetrics {
  const merged = aggregateGit([], { added: 0, deleted: 0, fileTouches: new Map() });
  const typeCounts = emptyTypeCounts();
  const commitsByAuthor: Record<string, number> = {};
  let added = 0;
  let deleted = 0;
  let commits = 0;
  let touched = 0;
  let oneShotFiles = 0;
  let reworkedFiles = 0;
  // Weighted commits-per-active-day is not additive; approximate by summing
  // commits and weighting by each repo's own active-day implied count.
  let activeDayWeightedCommits = 0;
  let activeDaysTotal = 0;

  for (const r of results) {
    const m = r.metrics;
    commits += m.commits;
    added += m.churn.added;
    deleted += m.churn.deleted;
    touched += m.files.touched;
    oneShotFiles += Math.round((m.files.oneShotPct / 100) * m.files.touched);
    reworkedFiles += Math.round((m.files.reworkedPct / 100) * m.files.touched);
    for (const [t, n] of Object.entries(m.commitTypes)) {
      typeCounts[t as keyof typeof typeCounts] += n;
    }
    for (const [email, n] of Object.entries(m.commitsByAuthor)) {
      commitsByAuthor[email] = (commitsByAuthor[email] ?? 0) + n;
    }
    if (m.commitsPerActiveDay > 0) {
      const days = m.commits / m.commitsPerActiveDay;
      activeDaysTotal += days;
      activeDayWeightedCommits += m.commits;
    }
  }

  merged.commits = commits;
  merged.commitsByAuthor = commitsByAuthor;
  merged.churn = {
    added,
    deleted,
    netGrossRatio: round(netGrossRatio(added, deleted)),
  };
  merged.commitTypes = typeCounts;
  merged.reworkRatio = roundNullable(reworkRatio(typeCounts));
  merged.files = {
    touched,
    oneShotPct: round(pct(oneShotFiles, touched), 2),
    reworkedPct: round(pct(reworkedFiles, touched), 2),
  };
  merged.commitsPerActiveDay =
    activeDaysTotal === 0 ? 0 : round(activeDayWeightedCommits / activeDaysTotal, 3);

  return merged;
}

/** Short, human-friendly repo name from a path. */
export function repoName(path: string): string {
  return basename(path);
}
