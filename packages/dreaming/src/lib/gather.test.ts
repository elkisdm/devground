import { mkdtempSync, writeFileSync, utimesSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it, expect } from 'vitest';
import { encodeProjectDir, listTranscriptsByMtime } from './gather.js';

describe('encodeProjectDir', () => {
  it('encodes an absolute path like Claude Code does (non-alnum -> "-")', () => {
    expect(encodeProjectDir('/home/alice/proj')).toBe('-home-alice-proj');
    expect(encodeProjectDir('/Users/x/Documents/HCLP -Foo')).toBe('-Users-x-Documents-HCLP--Foo');
  });
  it('is derived at runtime, not the hardcoded author machine default', () => {
    expect(encodeProjectDir('/home/alice/proj')).not.toBe('-Users-macbookpro');
  });
});

describe('listTranscriptsByMtime', () => {
  it('sorts transcripts by mtime descending, stat once per file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dreaming-gather-'));
    const mk = (name: string, epochSec: number) => {
      const p = join(dir, name);
      writeFileSync(p, '{}\n');
      utimesSync(p, epochSec, epochSec);
    };
    mk('old.jsonl', 1000);
    mk('new.jsonl', 3000);
    mk('mid.jsonl', 2000);
    writeFileSync(join(dir, 'ignore.txt'), 'x');
    const ordered = listTranscriptsByMtime(dir).map((e) => e.path.split('/').pop());
    expect(ordered).toEqual(['new.jsonl', 'mid.jsonl', 'old.jsonl']);
  });
});
