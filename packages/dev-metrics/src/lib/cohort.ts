import type { Snapshot, RepoBreakdown, RepoAdoption } from '../types.js';
import type { Cohort } from './adoption.js';

/** Aggregated metrics for one cohort of repos within a snapshot. */
export interface CohortAggregate {
  cohort: Cohort;
  repos: number;
  commits: number;
  churnGross: number;
  /** Sum of REAL measured total tokens across the cohort's repos. */
  totalTokens: number;
  /** Sum of measured output tokens (repos without a dir contribute 0). */
  outputTokens: number;
  /** totalTokens / commits, or null when there are no commits. */
  tokensPerCommit: number | null;
}

/**
 * Splits a snapshot's repos by cohort and aggregates git+token metrics per
 * cohort. Pure given the snapshot. Repos present in `adoption` but absent from
 * `repoBreakdown` (or vice versa) are matched by path; unmatched repos are
 * skipped so the aggregate never double counts.
 */
export function aggregateByCohort(snapshot: Snapshot): CohortAggregate[] {
  return aggregateByCohortFrom(snapshot.repoBreakdown, snapshot.adoption);
}

/** Same as `aggregateByCohort` but takes the raw arrays (easier to test). */
export function aggregateByCohortFrom(
  repoBreakdown: readonly RepoBreakdown[],
  adoption: readonly RepoAdoption[],
): CohortAggregate[] {
  const cohortByPath = new Map<string, Cohort>();
  for (const a of adoption) cohortByPath.set(a.path, a.cohort);

  const cohorts: Cohort[] = ['born-standardized', 'retrofitted', 'partial'];
  const acc = new Map<Cohort, CohortAggregate>();
  for (const c of cohorts) {
    acc.set(c, {
      cohort: c,
      repos: 0,
      commits: 0,
      churnGross: 0,
      totalTokens: 0,
      outputTokens: 0,
      tokensPerCommit: null,
    });
  }

  for (const repo of repoBreakdown) {
    const cohort = cohortByPath.get(repo.path);
    if (cohort === undefined) continue; // no adoption record -> skip
    const a = acc.get(cohort) as CohortAggregate;
    a.repos++;
    a.commits += repo.commits;
    a.churnGross += repo.churnGross;
    a.totalTokens += repo.totalTokens;
    a.outputTokens += repo.outputTokens ?? 0;
  }

  for (const a of acc.values()) {
    a.tokensPerCommit = a.commits === 0 ? null : a.totalTokens / a.commits;
  }

  // Only return cohorts that have at least one repo (keeps reports clean).
  return cohorts.map((c) => acc.get(c) as CohortAggregate).filter((a) => a.repos > 0);
}
