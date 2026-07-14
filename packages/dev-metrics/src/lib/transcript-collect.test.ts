import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCollect } from '../commands/collect.js';

// `readFileSync` on `node:fs` is non-configurable in this runtime, so
// `vi.spyOn(fs, 'readFileSync')` fails with "Cannot redefine property". Mock
// the module instead: forward every call to the real implementation while
// counting invocations, so behavior is unchanged but calls are observable.
// `vi.mock` is hoisted above the imports above by vitest's transform.
const { readFileSyncMock } = vi.hoisted(() => ({ readFileSyncMock: vi.fn() }));
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  readFileSyncMock.mockImplementation(actual.readFileSync);
  return { ...actual, readFileSync: readFileSyncMock };
});

let base: string;
let root1: string;
let root2: string;
let outDir: string;
let eventsFile: string;

/** Writes a one-line transcript record into `<root>/<projectDir>/<fileName>`. */
function writeRecord(root: string, projectDir: string, fileName: string, rec: Record<string, unknown>): void {
  const dir = join(root, projectDir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, fileName), JSON.stringify(rec) + '\n', 'utf-8');
}

function assistant(uuid: string, day: string, output: number): Record<string, unknown> {
  return {
    uuid,
    sessionId: `s-${uuid}`,
    type: 'assistant',
    timestamp: `${day}T12:00:00.000Z`,
    message: { model: 'claude-test', usage: { output_tokens: output, input_tokens: 1 } },
  };
}

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'devmetrics-corpus-'));
  root1 = join(base, 'root1');
  root2 = join(base, 'root2');
  outDir = join(base, 'snapshots');
  eventsFile = join(base, 'events.json');
});

afterEach(() => {
  rmSync(base, { recursive: true, force: true });
});

describe('runCollect — single-pass corpus scan (#4)', () => {
  it('reads each .jsonl file exactly once, not three times', () => {
    // 2 roots, 2 projectDirs, a uuid that overlaps across roots (live+backup).
    writeRecord(root1, 'dirA', 's1.jsonl', assistant('a1', '2026-05-20', 100));
    writeRecord(root1, 'dirB', 's2.jsonl', assistant('b1', '2026-05-21', 50));
    writeRecord(root2, 'dirA', 's1.jsonl', assistant('a1', '2026-05-20', 100)); // dup uuid

    readFileSyncMock.mockClear();

    runCollect({
      repos: [],
      emails: [],
      since: null,
      until: null,
      label: null,
      outDir,
      eventsFile,
      transcriptRoots: [root1, root2],
      seedEvents: false,
    });

    const jsonlReads = readFileSyncMock.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].endsWith('.jsonl'),
    );
    // 3 files on disk (s1.jsonl x2 roots + s2.jsonl) -> exactly 3 reads, not 9 (3x).
    expect(jsonlReads).toHaveLength(3);
  });
});

describe('runCollect — output equivalence across the [since,until] window (#14)', () => {
  it('produces identical transcript/attribution/memory metrics as the previous 3-pass implementation', () => {
    const repoDir = repoProjectDir();
    // In-window record.
    writeRecord(root1, repoDir, 'in.jsonl', assistant('in1', '2026-05-20', 100));
    // Out-of-window record (same file scanned, must be excluded from all aggregates).
    writeRecord(root1, repoDir, 'out.jsonl', assistant('out1', '2026-01-01', 999));
    // Duplicate uuid across live+backup roots.
    writeRecord(root1, repoDir, 'dup.jsonl', assistant('dup1', '2026-05-21', 30));
    writeRecord(root2, repoDir, 'dup.jsonl', assistant('dup1', '2026-05-21', 30));

    const outPath = runCollect({
      repos: [],
      emails: [],
      since: '2026-05-01',
      until: '2026-05-31',
      label: null,
      outDir,
      eventsFile,
      transcriptRoots: [root1, root2],
      seedEvents: false,
    });

    const snapshot = JSON.parse(readFileSync(outPath, 'utf-8')) as {
      transcript: { messages: number; duplicatesDropped: number; tokens: { output: number } };
      memory: { contextCost: { sessions: number; earlyOutputTokens: number } };
    };

    // Only in1 + dup1 (deduped once) fall in [2026-05-01, 2026-05-31]; out1 is excluded.
    expect(snapshot.transcript.messages).toBe(2);
    expect(snapshot.transcript.duplicatesDropped).toBeGreaterThanOrEqual(1);
    expect(snapshot.transcript.tokens.output).toBe(130);
    expect(snapshot.memory.contextCost.sessions).toBe(2);
    expect(snapshot.memory.contextCost.earlyOutputTokens).toBe(130);
  });
});

function repoProjectDir(): string {
  // Any stable label works: attribution isn't under test here (no repos passed).
  return 'unattributed-dir';
}
