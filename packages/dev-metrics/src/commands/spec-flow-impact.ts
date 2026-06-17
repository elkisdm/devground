import { join } from 'node:path';
import { isGitRepo, repoName } from '../lib/git.js';
import {
  readSpecFlowEvents,
  rolloutDate as rolloutOf,
  frictionByTier as frictionOf,
  type SpecFlowEvent,
} from '../lib/spec-flow-events.js';
import {
  specFlowHashes,
  collectCommitDetails,
  computeRepoImpact,
  aggregateImpact,
  type RepoImpact,
} from '../lib/spec-flow-segment.js';
import { renderSpecFlowImpact } from '../lib/spec-flow-report.js';

export interface SpecFlowImpactArgs {
  repos: string[];
  emails: string[];
  /** Optional analysis floor; commits before this are still used for control. */
  since: string | null;
  until: string | null;
}

/** Computes the impact comparison for one repo, or null when it has no spec-flow telemetry. */
export function impactForRepo(repoPath: string, emails: readonly string[], until: string | null): RepoImpact | null {
  if (!isGitRepo(repoPath)) return null;
  const events = readSpecFlowEvents(join(repoPath, '.spec-flow', 'events.jsonl'));
  const rollout = rolloutOf(events);
  if (rollout === null) return null; // repo never used spec-flow → nothing to compare

  const sfHashes = specFlowHashes(repoPath);
  // Collect the full history (no `since`) so the pre-rollout control is available.
  const commits = collectCommitDetails(repoPath, emails, null, until);

  return computeRepoImpact({
    repo: repoName(repoPath),
    commits,
    sfHashes,
    rolloutDate: rollout,
    frictionByTier: frictionOf(events),
  });
}

/** Runs the spec-flow-impact analysis across repos and returns a markdown report. */
export function runSpecFlowImpact(args: SpecFlowImpactArgs): string {
  const impacts: RepoImpact[] = [];
  const allEvents: SpecFlowEvent[] = [];

  for (const repoPath of args.repos) {
    const impact = impactForRepo(repoPath, args.emails, args.until);
    if (impact) {
      impacts.push(impact);
      allEvents.push(...readSpecFlowEvents(join(repoPath, '.spec-flow', 'events.jsonl')));
    }
  }

  // Sort by comparability then ADR-coupling lift, so the strongest signal is on top.
  impacts.sort((a, b) => {
    if (a.comparable !== b.comparable) return a.comparable ? -1 : 1;
    return b.specFlow.adrCouplingRate - a.specFlow.adrCouplingRate;
  });

  const aggregate = aggregateImpact(impacts);
  const friction = frictionOf(allEvents);
  return renderSpecFlowImpact(impacts, aggregate, friction);
}
