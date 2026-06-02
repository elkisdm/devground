import { describe, it, expect } from 'vitest';
import { aggregateByCohortFrom } from './cohort.js';
import type { RepoBreakdown, RepoAdoption } from '../types.js';

function repo(path: string, commits: number, churn: number, total: number, output: number | null): RepoBreakdown {
  return {
    path,
    commits,
    churnGross: churn,
    outputTokens: output,
    totalTokens: total,
    transcriptDirFound: output !== null,
  };
}

function adoption(path: string, cohort: RepoAdoption['cohort']): RepoAdoption {
  return {
    path,
    markers: {
      born: null,
      tsconfig: null,
      tsconfigStrict: false,
      huskyPreCommit: null,
      eslintFlatConfig: null,
      firstTest: null,
      firstConventionalCommit: null,
    },
    cohort,
    retrofitLagDays: null,
    missingKeyMarkers: [],
  };
}

describe('aggregateByCohortFrom', () => {
  it('groups repos by cohort and sums git+token metrics', () => {
    const breakdown = [
      repo('/a', 10, 100, 1000, 500),
      repo('/b', 5, 50, 600, 300),
      repo('/c', 20, 400, 2000, 800),
    ];
    const adopt = [
      adoption('/a', 'born-standardized'),
      adoption('/b', 'born-standardized'),
      adoption('/c', 'retrofitted'),
    ];
    const out = aggregateByCohortFrom(breakdown, adopt);

    const born = out.find((c) => c.cohort === 'born-standardized');
    expect(born?.repos).toBe(2);
    expect(born?.commits).toBe(15);
    expect(born?.churnGross).toBe(150);
    expect(born?.totalTokens).toBe(1600);
    expect(born?.tokensPerCommit).toBeCloseTo(1600 / 15, 10);

    const retro = out.find((c) => c.cohort === 'retrofitted');
    expect(retro?.repos).toBe(1);
    expect(retro?.tokensPerCommit).toBeCloseTo(2000 / 20, 10);
  });

  it('omits cohorts with no repos', () => {
    const out = aggregateByCohortFrom([repo('/a', 1, 1, 1, 1)], [adoption('/a', 'partial')]);
    expect(out.map((c) => c.cohort)).toEqual(['partial']);
  });

  it('treats a repo with no transcript dir (null output) as 0 output', () => {
    const out = aggregateByCohortFrom(
      [repo('/a', 4, 10, 0, null)],
      [adoption('/a', 'born-standardized')],
    );
    expect(out[0]?.outputTokens).toBe(0);
    expect(out[0]?.totalTokens).toBe(0);
    expect(out[0]?.tokensPerCommit).toBe(0);
  });

  it('skips breakdown repos that have no adoption record', () => {
    const out = aggregateByCohortFrom([repo('/orphan', 9, 9, 9, 9)], []);
    expect(out).toEqual([]);
  });

  it('returns null tokensPerCommit when a cohort has zero commits', () => {
    const out = aggregateByCohortFrom([repo('/a', 0, 5, 5, 5)], [adoption('/a', 'partial')]);
    expect(out[0]?.tokensPerCommit).toBeNull();
  });
});
