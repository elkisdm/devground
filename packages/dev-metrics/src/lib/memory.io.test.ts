import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { computeMemorySignals, listMemoryNotes } from './memory.js';

let dir: string;

function write(name: string, records: Record<string, unknown>[]): string {
  const file = join(dir, name);
  writeFileSync(file, records.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf-8');
  return file;
}

function assistant(uuid: string, session: string, output: number): Record<string, unknown> {
  return {
    uuid,
    sessionId: session,
    type: 'assistant',
    timestamp: '2026-05-20T12:00:00.000Z',
    message: { usage: { output_tokens: output } },
  };
}

function readMemory(uuid: string, session: string, path: string): Record<string, unknown> {
  return {
    uuid,
    sessionId: session,
    type: 'assistant',
    timestamp: '2026-05-20T12:00:00.000Z',
    message: { content: [{ type: 'tool_use', name: 'Read', input: { file_path: path } }] },
  };
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'devmetrics-mem-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('computeMemorySignals', () => {
  it('sums only the first N output tokens per session as context cost', () => {
    const file = write('s.jsonl', [
      assistant('1', 'A', 10),
      assistant('2', 'A', 20),
      assistant('3', 'A', 30),
      assistant('4', 'A', 40), // beyond firstN=3 -> excluded
    ]);
    const out = computeMemorySignals({ files: [file], since: null, until: null, firstN: 3 });
    expect(out.contextCost.sessions).toBe(1);
    expect(out.contextCost.earlyOutputTokens).toBe(60);
    expect(out.contextCost.meanEarlyOutputPerSession).toBe(60);
  });

  it('averages early output across multiple sessions', () => {
    const file = write('s.jsonl', [
      assistant('1', 'A', 10),
      assistant('2', 'B', 30),
    ]);
    const out = computeMemorySignals({ files: [file], since: null, until: null, firstN: 3 });
    expect(out.contextCost.sessions).toBe(2);
    expect(out.contextCost.meanEarlyOutputPerSession).toBe(20);
  });

  it('detects Read ops on /memory/ paths as a reuse signal', () => {
    const file = write('s.jsonl', [
      readMemory('1', 'A', '/Users/x/.claude/projects/p/memory/note.md'),
      readMemory('2', 'A', '/Users/x/.claude/projects/p/memory/other.md'),
      readMemory('3', 'B', '/some/other/path.ts'), // not memory
    ]);
    const out = computeMemorySignals({ files: [file], since: null, until: null });
    expect(out.reuse.memoryReadOps).toBe(2);
    expect(out.reuse.sessionsReadingMemory).toBe(1);
  });

  it('returns null mean when there are no sessions', () => {
    const file = write('empty.jsonl', []);
    const out = computeMemorySignals({ files: [file], since: null, until: null });
    expect(out.contextCost.meanEarlyOutputPerSession).toBeNull();
  });
});

describe('listMemoryNotes (MEJORA D)', () => {
  it('takes the date from created: frontmatter, not mtime', () => {
    const memDir = join(dir, 'proj-a', 'memory');
    mkdirSync(memDir, { recursive: true });
    writeFileSync(
      join(memDir, 'with-created.md'),
      ['---', 'name: x', 'created: 2026-01-15', '---', '# body'].join('\n'),
      'utf-8',
    );
    writeFileSync(join(memDir, 'no-created.md'), '# no frontmatter\n', 'utf-8');
    writeFileSync(join(memDir, 'MEMORY.md'), '# index\n', 'utf-8'); // excluded

    const notes = listMemoryNotes(dir);
    const byFile = Object.fromEntries(notes.map((n) => [n.file.split('/').pop(), n]));

    expect(notes).toHaveLength(2); // MEMORY.md excluded
    expect(byFile['with-created.md']?.date).toBe('2026-01-15');
    expect(byFile['with-created.md']?.dateSource).toBe('frontmatter');
    expect(byFile['no-created.md']?.dateSource).toBe('mtime');
  });
});
