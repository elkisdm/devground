import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { impactForRepo, runSpecFlowImpact } from './spec-flow-impact.js';

const EMAIL = 'test@example.com';

let root: string;

function git(args: string[], env: Record<string, string> = {}): void {
  execFileSync('git', args, { cwd: root, env: { ...process.env, ...env }, stdio: 'pipe' });
}

function commit(message: string, date: string, env: Record<string, string> = {}): void {
  git(['add', '-A']);
  git(['commit', '-q', '-m', message], {
    GIT_AUTHOR_DATE: date,
    GIT_COMMITTER_DATE: date,
    ...env,
  });
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'devmetrics-sf-impact-'));
  git(['init', '-q']);
  git(['config', 'user.email', EMAIL]);
  git(['config', 'user.name', 'Test']);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/**
 * L-9: a commit that only ADDS `review`/`assumption_reversed` lines is a
 * follow-up of an earlier change — it must count as neither spec-flow nor
 * control, so the spec-flow population is not inflated by its own closing.
 */
describe('L-9: specFlowHashes / impactForRepo over a real git repo', () => {
  it('n_sf counts only the commit that adds the spec line', () => {
    // C: pre-rollout control commit (plain code, no telemetry).
    writeFileSync(join(root, 'src.txt'), 'v1\n');
    commit('feat: c', '2026-09-01T10:00:00');

    // A: the spec-flow commit — adds the spec line + touches code.
    mkdirSync(join(root, '.spec-flow'), { recursive: true });
    appendFileSync(
      join(root, '.spec-flow', 'events.jsonl'),
      JSON.stringify({ event: 'spec', date: '2026-09-10', change: 'x', tier: 2 }) + '\n',
    );
    writeFileSync(join(root, 'src.txt'), 'v2\n');
    commit('feat: a', '2026-09-10T10:00:00');

    // B: a follow-up commit — adds ONLY the closing review line + a fix.
    appendFileSync(
      join(root, '.spec-flow', 'events.jsonl'),
      JSON.stringify({ event: 'review', date: '2026-09-11', change: 'x', level: 'high' }) + '\n',
    );
    writeFileSync(join(root, 'src.txt'), 'v3\n');
    commit('fix: b', '2026-09-11T10:00:00');

    const result = impactForRepo(root, [EMAIL], null);
    expect(result).not.toBeNull();
    expect(result!.impact.specFlow.commits).toBe(1); // only A
    expect(result!.impact.control.commits).toBe(1); // only C, B excluded from both
    expect(result!.log.specs).toHaveLength(1);
    expect(result!.log.reviews).toHaveLength(1);
  });
});

describe('L-8: --until validation', () => {
  it('rejects a non-YYYY-MM-DD string with a clear error', () => {
    expect(() =>
      runSpecFlowImpact({ repos: [root], emails: [EMAIL], since: null, until: 'not-a-date' }),
    ).toThrow(/YYYY-MM-DD/);
  });

  it('rejects an unreal calendar date (e.g. 2026-02-30)', () => {
    expect(() =>
      runSpecFlowImpact({ repos: [root], emails: [EMAIL], since: null, until: '2026-02-30' }),
    ).toThrow(/real calendar date/);
  });

  it('accepts a real date and does not throw', () => {
    expect(() =>
      runSpecFlowImpact({ repos: [root], emails: [EMAIL], since: null, until: '2026-09-14' }),
    ).not.toThrow();
  });
});
