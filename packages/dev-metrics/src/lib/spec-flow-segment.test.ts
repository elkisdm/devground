import { describe, it, expect } from 'vitest';
import {
  parseCommitDetails,
  daysBetween,
  shiftDate,
  isCodeCommit,
  selectControl,
  spanDays,
  classifyCommit,
  segmentMetrics,
  computeRepoImpact,
  median,
  aggregateImpact,
  MIN_CONTROL_COMMITS,
  MIN_SPECFLOW_COMMITS,
  type CommitDetail,
  type RepoImpact,
} from './spec-flow-segment.js';

const REC = '\x1e';
const SEP = '\x1f';

function rawCommit(hash: string, day: string, subject: string, numstat: Array<[string, string, string]>): string {
  const header = `${REC}${SEP}${hash}${SEP}${day}${SEP}${subject}`;
  const body = numstat.map(([a, d, f]) => `${a}\t${d}\t${f}`).join('\n');
  return body ? `${header}\n${body}` : header;
}

const commit = (over: Partial<CommitDetail> = {}): CommitDetail => ({
  hash: 'h1',
  day: '2026-06-09',
  subject: 'feat: x',
  files: ['src/a.ts'],
  added: 10,
  deleted: 0,
  ...over,
});

describe('parseCommitDetails', () => {
  it('parses multiple commits with files and churn', () => {
    const out = [
      rawCommit('aaa', '2026-06-09', 'feat(api): worker', [
        ['378', '0', 'src/worker.ts'],
        ['149', '0', 'src/worker.test.ts'],
      ]),
      rawCommit('bbb', '2026-06-10', 'fix: bug', [['5', '2', 'src/b.ts']]),
    ].join('');
    const commits = parseCommitDetails(out);
    expect(commits).toHaveLength(2);
    expect(commits[0]).toMatchObject({ hash: 'aaa', added: 527, deleted: 0 });
    expect(commits[0].files).toEqual(['src/worker.ts', 'src/worker.test.ts']);
    expect(commits[1]).toMatchObject({ hash: 'bbb', added: 5, deleted: 2 });
  });

  it('counts binary files as a touch but not as churn', () => {
    const out = rawCommit('aaa', '2026-06-09', 'feat: img', [['-', '-', 'logo.png']]);
    const [c] = parseCommitDetails(out);
    expect(c.added).toBe(0);
    expect(c.files).toEqual(['logo.png']);
  });

  it('returns [] for empty output', () => {
    expect(parseCommitDetails('')).toEqual([]);
  });
});

describe('date helpers', () => {
  it('daysBetween counts whole days', () => {
    expect(daysBetween('2026-06-04', '2026-06-09')).toBe(5);
  });
  it('shiftDate moves backward and forward', () => {
    expect(shiftDate('2026-06-09', -5)).toBe('2026-06-04');
    expect(shiftDate('2026-06-04', 5)).toBe('2026-06-09');
  });
});

describe('isCodeCommit', () => {
  it('accepts code types, rejects docs/chore/test', () => {
    expect(isCodeCommit('feat(api): x')).toBe(true);
    expect(isCodeCommit('fix: y')).toBe(true);
    expect(isCodeCommit('perf: z')).toBe(true);
    expect(isCodeCommit('refactor: r')).toBe(true);
    expect(isCodeCommit('docs: d')).toBe(false);
    expect(isCodeCommit('chore: c')).toBe(false);
    expect(isCodeCommit('test: t')).toBe(false);
  });
});

describe('selectControl', () => {
  const sf = new Set(['s1']);
  const rollout = '2026-06-04';
  const commits: CommitDetail[] = [
    commit({ hash: 's1', day: '2026-06-05', subject: 'feat: sf' }), // spec-flow, excluded
    commit({ hash: 'c1', day: '2026-06-01', subject: 'feat: a' }),
    commit({ hash: 'c2', day: '2026-06-03', subject: 'fix: b' }),
    commit({ hash: 'old', day: '2026-04-01', subject: 'feat: c' }),
    commit({ hash: 'd', day: '2026-06-02', subject: 'docs: d' }), // not code, excluded
  ];
  it('takes the most-recent pre-rollout code commits (recency controls trend)', () => {
    const ctrl = selectControl(commits, sf, rollout, 2);
    expect(ctrl.map((c) => c.hash)).toEqual(['c2', 'c1']); // most recent first, docs/sf/old excluded
  });
  it('keeps all when under target', () => {
    expect(selectControl(commits, sf, rollout).map((c) => c.hash)).toEqual(['c2', 'c1', 'old']);
  });
});

describe('spanDays', () => {
  it('is the inclusive day span, minimum 1', () => {
    expect(spanDays([commit({ day: '2026-06-04' }), commit({ day: '2026-06-09' })])).toBe(6);
    expect(spanDays([commit({ day: '2026-06-04' })])).toBe(1);
    expect(spanDays([])).toBe(1);
  });
});

describe('classifyCommit', () => {
  const sf = new Set(['sfhash']);
  const rollout = '2026-06-04';
  it('tags spec-flow by hash', () => {
    expect(classifyCommit(commit({ hash: 'sfhash' }), sf, rollout)).toBe('spec-flow');
  });
  it('tags pre-rollout code commits as control', () => {
    expect(classifyCommit(commit({ hash: 'x', day: '2026-05-30', subject: 'feat: a' }), sf, rollout)).toBe('control');
  });
  it('does not treat pre-rollout docs as control', () => {
    expect(classifyCommit(commit({ hash: 'x', day: '2026-05-30', subject: 'docs: a' }), sf, rollout)).toBe('other');
  });
  it('tags post-rollout non-spec-flow as other', () => {
    expect(classifyCommit(commit({ hash: 'x', day: '2026-06-10', subject: 'feat: a' }), sf, rollout)).toBe('other');
  });
});

describe('segmentMetrics', () => {
  it('excludes .spec-flow telemetry from file counts', () => {
    const m = segmentMetrics([commit({ files: ['src/a.ts', '.spec-flow/events.jsonl'] })], 1);
    expect(m.filesPerCommit).toBe(1); // events.jsonl excluded
  });

  it('computes coupling rates with strict detectors (no false positives)', () => {
    const commits = [
      commit({ files: ['src/routes/test.ts'] }), // feature, NOT a test
      commit({ files: ['src/a.ts', 'src/a.test.ts'] }), // real test
      commit({ files: ['docs/adr/0001-x.md', 'src/b.ts'] }), // adr
    ];
    const m = segmentMetrics(commits, 3);
    expect(m.testCouplingRate).toBe(round1of3()); // 1 of 3
    expect(m.adrCouplingRate).toBe(round1of3());
  });

  it('survival ratio reflects net/gross', () => {
    const m = segmentMetrics([commit({ added: 80, deleted: 20 })], 1);
    expect(m.netGrossRatio).toBe(0.6);
  });
});

function round1of3(): number {
  return Math.round((1 / 3) * 1000) / 1000; // 0.333
}

describe('computeRepoImpact', () => {
  it('uses most-recent pre-rollout control and needs both n floors to be comparable', () => {
    const rollout = '2026-06-04';
    const sfHashes = new Set(['s1', 's2']);
    const commits: CommitDetail[] = [
      commit({ hash: 's1', day: '2026-06-04', subject: 'feat: a' }),
      commit({ hash: 's2', day: '2026-06-06', subject: 'feat: b' }),
      commit({ hash: 'c1', day: '2026-06-02', subject: 'feat: c' }),
      commit({ hash: 'c2', day: '2026-06-03', subject: 'fix: d' }),
      commit({ hash: 'old', day: '2026-04-01', subject: 'feat: e' }), // now KEPT (recency, no window starve)
    ];
    const impact = computeRepoImpact({ repo: 'demo', commits, sfHashes, rolloutDate: rollout, frictionByTier: { 2: 0 } });
    expect(impact.specFlow.commits).toBe(2);
    expect(impact.control.commits).toBe(3); // c1, c2, old — no longer starved by a calendar window
    expect(impact.comparable).toBe(false); // n_sf (2) < MIN_SPECFLOW_COMMITS
  });

  it('is comparable only when BOTH spec-flow and control meet their floors', () => {
    const rollout = '2026-06-15';
    const sfHashes = new Set<string>();
    const commits: CommitDetail[] = [];
    for (let i = 0; i < MIN_SPECFLOW_COMMITS; i++) {
      const h = `s${i}`;
      sfHashes.add(h);
      commits.push(commit({ hash: h, day: '2026-06-20', subject: 'feat: a' }));
    }
    for (let i = 0; i < MIN_CONTROL_COMMITS; i++) {
      commits.push(commit({ hash: `c${i}`, day: '2026-06-10', subject: 'feat: x' }));
    }
    const impact = computeRepoImpact({ repo: 'r', commits, sfHashes, rolloutDate: rollout, frictionByTier: {} });
    expect(impact.specFlow.commits).toBe(MIN_SPECFLOW_COMMITS);
    expect(impact.control.commits).toBe(MIN_CONTROL_COMMITS);
    expect(impact.comparable).toBe(true);
  });
});

describe('median', () => {
  it('handles odd and even lengths', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe('aggregateImpact', () => {
  it('takes per-repo deltas medianed across comparable repos only (baseline-relative)', () => {
    const mk = (sfAdr: number, ctrlAdr: number, comparable: boolean): RepoImpact => ({
      repo: 'r',
      rolloutDate: '2026-06-01',
      specFlow: { commits: 5, filesPerCommit: 4, churnPerCommit: 100, netGrossRatio: 0.8, testCouplingRate: 0, adrCouplingRate: sfAdr, windowDays: 10, commitsPerWindowDay: 0.5 },
      control: { commits: 10, filesPerCommit: 7, churnPerCommit: 200, netGrossRatio: 0.6, testCouplingRate: 0, adrCouplingRate: ctrlAdr, windowDays: 10, commitsPerWindowDay: 1 },
      comparable,
      frictionByTier: {},
    });
    const impacts = [mk(0.18, 0.02, true), mk(0.12, 0.0, true), mk(0.99, 0.99, false)]; // last one ignored
    const agg = aggregateImpact(impacts);
    const adr = agg.find((a) => a.metric === 'adrCouplingRate')!;
    expect(adr.repos).toBe(2);
    expect(adr.medianDelta).toBeCloseTo(0.14, 5); // median of [0.16, 0.12]
  });
});
