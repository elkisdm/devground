import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
  specFlowHashes,
  MIN_CONTROL_COMMITS,
  MIN_SPECFLOW_COMMITS,
  untilGitArg,
  type CommitDetail,
  type RepoImpact,
} from './spec-flow-segment.js';

// F1: `execFileSync` is non-configurable on `node:child_process` in this
// runtime, so `vi.spyOn` fails with "Cannot redefine property" — mock the
// module instead, forwarding every call to the real implementation while
// counting invocations (same pattern as transcript-collect.test.ts).
const { execFileSyncMock } = vi.hoisted(() => ({ execFileSyncMock: vi.fn() }));
vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  execFileSyncMock.mockImplementation(actual.execFileSync);
  return { ...actual, execFileSync: execFileSyncMock };
});

const REC = '\x1e';
const SEP = '\x1f';

function rawCommit(
  hash: string,
  day: string,
  subject: string,
  numstat: Array<[string, string, string]>,
): string {
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
  const followUp = new Set<string>();
  const rollout = '2026-06-04';
  const commits: CommitDetail[] = [
    commit({ hash: 's1', day: '2026-06-05', subject: 'feat: sf' }), // spec-flow, excluded
    commit({ hash: 'c1', day: '2026-06-01', subject: 'feat: a' }),
    commit({ hash: 'c2', day: '2026-06-03', subject: 'fix: b' }),
    commit({ hash: 'old', day: '2026-04-01', subject: 'feat: c' }),
    commit({ hash: 'd', day: '2026-06-02', subject: 'docs: d' }), // not code, excluded
  ];
  it('takes the most-recent pre-rollout code commits (recency controls trend)', () => {
    const ctrl = selectControl(commits, sf, followUp, rollout, 2);
    expect(ctrl.map((c) => c.hash)).toEqual(['c2', 'c1']); // most recent first, docs/sf/old excluded
  });
  it('keeps all when under target', () => {
    expect(selectControl(commits, sf, followUp, rollout).map((c) => c.hash)).toEqual([
      'c2',
      'c1',
      'old',
    ]);
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
  const followUp = new Set(['fuhash']);
  const rollout = '2026-06-04';
  it('tags spec-flow by hash', () => {
    expect(classifyCommit(commit({ hash: 'sfhash' }), sf, followUp, rollout)).toBe('spec-flow');
  });
  it('tags pre-rollout code commits as control', () => {
    expect(
      classifyCommit(
        commit({ hash: 'x', day: '2026-05-30', subject: 'feat: a' }),
        sf,
        followUp,
        rollout,
      ),
    ).toBe('control');
  });
  it('does not treat pre-rollout docs as control', () => {
    expect(
      classifyCommit(
        commit({ hash: 'x', day: '2026-05-30', subject: 'docs: a' }),
        sf,
        followUp,
        rollout,
      ),
    ).toBe('other');
  });
  it('tags post-rollout non-spec-flow as other', () => {
    expect(
      classifyCommit(
        commit({ hash: 'x', day: '2026-06-10', subject: 'feat: a' }),
        sf,
        followUp,
        rollout,
      ),
    ).toBe('other');
  });
  it('L-9: a follow-up commit (review-only) is neither spec-flow nor control', () => {
    expect(
      classifyCommit(commit({ hash: 'fuhash', day: '2026-05-30' }), sf, followUp, rollout),
    ).toBe('follow-up');
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
    const impact = computeRepoImpact({
      repo: 'demo',
      commits,
      sfHashes,
      followUpHashes: new Set(),
      rolloutDate: rollout,
      frictionByTier: { 2: { mean: 0, n: 1 } },
    });
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
    const impact = computeRepoImpact({
      repo: 'r',
      commits,
      sfHashes,
      followUpHashes: new Set(),
      rolloutDate: rollout,
      frictionByTier: {},
    });
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
      specFlow: {
        commits: 5,
        filesPerCommit: 4,
        churnPerCommit: 100,
        netGrossRatio: 0.8,
        testCouplingRate: 0,
        adrCouplingRate: sfAdr,
        windowDays: 10,
        commitsPerWindowDay: 0.5,
      },
      control: {
        commits: 10,
        filesPerCommit: 7,
        churnPerCommit: 200,
        netGrossRatio: 0.6,
        testCouplingRate: 0,
        adrCouplingRate: ctrlAdr,
        windowDays: 10,
        commitsPerWindowDay: 1,
      },
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

describe('untilGitArg (L-8)', () => {
  it('includes the full day, matching the event filter date <= until', () => {
    expect(untilGitArg('2026-09-14')).toBe('--until=2026-09-14T23:59:59');
  });
});

// ---------------------------------------------------------------------------
// F1: specFlowHashes — single-git-process rewrite, spec-rewrite, delete-only
// ---------------------------------------------------------------------------

describe('specFlowHashes (F1)', () => {
  let root: string;

  function git(args: string[], env: Record<string, string> = {}): void {
    execFileSyncMock('git', args, { cwd: root, env: { ...process.env, ...env }, stdio: 'pipe' });
  }

  function commit(message: string, date: string): void {
    git(['add', '-A']);
    git(['commit', '-q', '-m', message], { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date });
  }

  function appendEvent(obj: Record<string, unknown>): void {
    mkdirSync(join(root, '.spec-flow'), { recursive: true });
    appendFileSync(join(root, '.spec-flow', 'events.jsonl'), JSON.stringify(obj) + '\n');
  }

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'devmetrics-sf-hashes-'));
    git(['init', '-q']);
    git(['config', 'user.email', 'test@example.com']);
    git(['config', 'user.name', 'Test']);
    execFileSyncMock.mockClear();
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('a spec REWRITTEN in place (same change, edited fields) is a follow-up, not spec-flow again', () => {
    appendEvent({ event: 'spec', date: '2026-09-14', change: 'x', tier: 1 });
    commit('feat: a', '2026-09-14T10:00:00');

    // Rewrite the same `change` line (e.g. a later field correction).
    writeFileSync(
      join(root, '.spec-flow', 'events.jsonl'),
      JSON.stringify({ event: 'spec', date: '2026-09-14', change: 'x', tier: 2 }) + '\n',
    );
    commit('fix: correct tier', '2026-09-15T10:00:00');

    const { specFlow, followUp } = specFlowHashes(root);
    expect(specFlow.size).toBe(1);
    expect(followUp.size).toBe(1);
  });

  it('a commit that only DELETES lines (no parseable addition) is neither spec-flow nor follow-up', () => {
    appendEvent({ event: 'spec', date: '2026-09-14', change: 'x', tier: 1 });
    commit('feat: a', '2026-09-14T10:00:00');

    writeFileSync(join(root, '.spec-flow', 'events.jsonl'), '');
    commit('chore: wipe telemetry', '2026-09-15T10:00:00');

    const { specFlow, followUp } = specFlowHashes(root);
    expect(specFlow.size).toBe(1); // only the first commit
    expect(followUp.size).toBe(0); // the delete-only commit is neither
  });

  it('makes exactly ONE git process for the whole repo, regardless of commit count', () => {
    appendEvent({ event: 'spec', date: '2026-09-14', change: 'a', tier: 1 });
    commit('feat: a', '2026-09-14T10:00:00');
    appendEvent({ event: 'review', date: '2026-09-15', change: 'a', level: 'high' });
    commit('fix: b', '2026-09-15T10:00:00');
    appendEvent({ event: 'spec', date: '2026-09-16', change: 'c', tier: 1 });
    commit('feat: c', '2026-09-16T10:00:00');

    execFileSyncMock.mockClear();
    const { specFlow, followUp } = specFlowHashes(root);
    expect(specFlow.size).toBe(2);
    expect(followUp.size).toBe(1);
    expect(execFileSyncMock).toHaveBeenCalledTimes(1);
  });
});
