import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { attributeTokensByRepo, repoPathToProjectDir } from './repo-attribution.js';

let root: string;
let transcriptsRoot: string;

/** Writes a one-line assistant transcript record into a project dir. */
function writeRecord(
  projectDir: string,
  fileName: string,
  rec: Record<string, unknown>,
): void {
  const dir = join(transcriptsRoot, projectDir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, fileName), JSON.stringify(rec) + '\n', 'utf-8');
}

function assistant(uuid: string, day: string, output: number): Record<string, unknown> {
  return {
    uuid,
    type: 'assistant',
    timestamp: `${day}T12:00:00.000Z`,
    message: { model: 'claude-test', usage: { output_tokens: output, input_tokens: 1 } },
  };
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'devmetrics-attr-'));
  transcriptsRoot = join(root, 'projects');
  mkdirSync(transcriptsRoot, { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('attributeTokensByRepo', () => {
  it('attributes tokens to the repo whose <DIR> matches', () => {
    const repoPath = '/Users/x/Documents/repoA';
    const dir = repoPathToProjectDir(repoPath);
    writeRecord(dir, 's1.jsonl', assistant('a1', '2026-05-20', 100));
    writeRecord(dir, 's2.jsonl', assistant('a2', '2026-05-21', 50));

    const res = attributeTokensByRepo({
      repoPaths: [repoPath],
      roots: [transcriptsRoot],
      since: null,
      until: null,
    });

    expect(res.byRepo).toHaveLength(1);
    expect(res.byRepo[0]?.found).toBe(true);
    expect(res.byRepo[0]?.tokens.output).toBe(150);
    expect(res.unattributed.output).toBe(0);
  });

  it('puts tokens from non-matching dirs into the unattributed bucket (never redistributed)', () => {
    const repoPath = '/Users/x/Documents/repoA';
    writeRecord(repoPathToProjectDir(repoPath), 's.jsonl', assistant('a1', '2026-05-20', 100));
    // A subagents dir that maps to no repo.
    writeRecord('subagents', 'sa.jsonl', assistant('z1', '2026-05-20', 999));

    const res = attributeTokensByRepo({
      repoPaths: [repoPath],
      roots: [transcriptsRoot],
      since: null,
      until: null,
    });

    expect(res.byRepo[0]?.tokens.output).toBe(100);
    expect(res.unattributed.output).toBe(999);
    expect(res.unattributedDirs).toBe(1);
  });

  it('filters by period', () => {
    const repoPath = '/Users/x/Documents/repoA';
    const dir = repoPathToProjectDir(repoPath);
    writeRecord(dir, 'old.jsonl', assistant('a1', '2026-04-01', 100));
    writeRecord(dir, 'new.jsonl', assistant('a2', '2026-05-20', 30));

    const res = attributeTokensByRepo({
      repoPaths: [repoPath],
      roots: [transcriptsRoot],
      since: '2026-05-01',
      until: null,
    });
    expect(res.byRepo[0]?.tokens.output).toBe(30);
  });

  it('dedups the same uuid across two roots (live + backup overlap)', () => {
    const repoPath = '/Users/x/Documents/repoA';
    const dir = repoPathToProjectDir(repoPath);
    const liveRoot = join(root, 'projects');
    const backupRoot = join(root, 'backup', 'projects');
    mkdirSync(join(backupRoot, dir), { recursive: true });
    writeRecord(dir, 's.jsonl', assistant('dup', '2026-05-20', 200)); // live
    writeFileSync(
      join(backupRoot, dir, 's.jsonl'),
      JSON.stringify(assistant('dup', '2026-05-20', 200)) + '\n',
      'utf-8',
    );

    const res = attributeTokensByRepo({
      repoPaths: [repoPath],
      roots: [liveRoot, backupRoot],
      since: null,
      until: null,
    });
    // Counted once, not twice.
    expect(res.byRepo[0]?.tokens.output).toBe(200);
  });

  it('reports found=false and zero tokens when the repo has no transcript dir', () => {
    const res = attributeTokensByRepo({
      repoPaths: ['/Users/x/Documents/ghost'],
      roots: [transcriptsRoot],
      since: null,
      until: null,
    });
    expect(res.byRepo[0]?.found).toBe(false);
    expect(res.byRepo[0]?.tokens.output).toBe(0);
  });
});
