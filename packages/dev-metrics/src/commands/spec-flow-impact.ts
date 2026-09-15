import { join } from 'node:path';
import { isGitRepo, repoName } from '../lib/git.js';
import {
  readSpecFlowLog,
  rolloutDate as rolloutOf,
  frictionByTier as frictionOf,
  type SpecFlowEvent,
  type SpecFlowLog,
} from '../lib/spec-flow-events.js';
import { reviewLoopStats, aggregateReviewLoop } from '../lib/spec-flow-review-loop.js';
import {
  specFlowHashes,
  collectCommitDetails,
  computeRepoImpact,
  aggregateImpact,
  type RepoImpact,
} from '../lib/spec-flow-segment.js';
import { dedupeWorktrees } from '../lib/repo-discovery.js';
import { renderSpecFlowImpact } from '../lib/spec-flow-report.js';

export interface SpecFlowImpactArgs {
  repos: string[];
  emails: string[];
  /** Optional analysis floor; commits before this are still used for control. */
  since: string | null;
  until: string | null;
}

/** One repo's impact comparison plus its `until`-filtered spec-flow log (read once). */
export interface RepoImpactResult {
  impact: RepoImpact;
  log: SpecFlowLog;
}

/** Computes the impact comparison for one repo, or null when it has no spec-flow telemetry. */
export function impactForRepo(
  repoPath: string,
  emails: readonly string[],
  until: string | null,
): RepoImpactResult | null {
  if (!isGitRepo(repoPath)) return null;
  const rawLog = readSpecFlowLog(join(repoPath, '.spec-flow', 'events.jsonl'));
  // `until` bounds the events, same as it bounds the commits below — a run
  // asked for history up to a date must not read spec/review events past it.
  const specs = until ? rawLog.specs.filter((e) => e.date <= until) : rawLog.specs;
  const reviews = until ? rawLog.reviews.filter((e) => e.date <= until) : rawLog.reviews;
  const reversals = until ? rawLog.reversals.filter((e) => e.date <= until) : rawLog.reversals;

  const rollout = rolloutOf(specs);
  if (rollout === null) return null; // repo never used spec-flow → nothing to compare

  const classification = specFlowHashes(repoPath);
  // Collect the full history (no `since`) so the pre-rollout control is available.
  const commits = collectCommitDetails(repoPath, emails, null, until);

  const impact = computeRepoImpact({
    repo: repoName(repoPath),
    commits,
    sfHashes: classification.specFlow,
    followUpHashes: classification.followUp,
    rolloutDate: rollout,
    frictionByTier: frictionOf(specs),
  });

  return { impact, log: { specs, reviews, reversals } };
}

/** L-8: `--until` must be a real calendar date, or the git/event clocks silently disagree. */
function assertValidUntil(until: string | null): void {
  if (until === null) return;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(until);
  if (m === null) throw new Error(`--until must be YYYY-MM-DD, got "${until}"`);
  const [, y, mo, d] = m;
  const parsed = new Date(`${until}T00:00:00Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== Number(y) ||
    parsed.getUTCMonth() + 1 !== Number(mo) ||
    parsed.getUTCDate() !== Number(d)
  ) {
    throw new Error(`--until must be a real calendar date, got "${until}"`);
  }
}

/** Runs the spec-flow-impact analysis across repos and returns a markdown report. */
export function runSpecFlowImpact(args: SpecFlowImpactArgs): string {
  assertValidUntil(args.until);
  // Two repo paths that are worktrees of the same repository would otherwise
  // double-count that repo's spec-flow history in every aggregate below.
  const { kept, discarded } = dedupeWorktrees(args.repos);

  const impacts: RepoImpact[] = [];
  const allSpecs: SpecFlowEvent[] = [];
  const perRepoReviewLoop = [];

  for (const repoPath of kept) {
    const result = impactForRepo(repoPath, args.emails, args.until);
    if (result) {
      impacts.push(result.impact);
      allSpecs.push(...result.log.specs);
      perRepoReviewLoop.push(
        reviewLoopStats(result.log.specs, result.log.reviews, result.log.reversals),
      );
    }
  }

  // Sort by comparability then ADR-coupling lift, so the strongest signal is on top.
  impacts.sort((a, b) => {
    if (a.comparable !== b.comparable) return a.comparable ? -1 : 1;
    return b.specFlow.adrCouplingRate - a.specFlow.adrCouplingRate;
  });

  const aggregate = aggregateImpact(impacts);
  const friction = frictionOf(allSpecs);
  const reviewLoop = aggregateReviewLoop(perRepoReviewLoop);
  return renderSpecFlowImpact(impacts, aggregate, friction, reviewLoop, discarded);
}
