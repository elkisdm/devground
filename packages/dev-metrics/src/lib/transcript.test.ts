import { describe, it, expect } from 'vitest';
import {
  parseTranscriptLine,
  dedupByUuid,
  classifyTool,
  addUsage,
  emptyTokenUsage,
  totalTokens,
  extractToolUses,
  type TranscriptRecord,
} from './transcript.js';

describe('parseTranscriptLine', () => {
  it('parses a valid JSON line', () => {
    const r = parseTranscriptLine('{"type":"assistant","uuid":"a"}');
    expect(r?.type).toBe('assistant');
    expect(r?.uuid).toBe('a');
  });

  it('returns null for blank lines', () => {
    expect(parseTranscriptLine('   ')).toBeNull();
  });

  it('returns null for malformed JSON (never throws)', () => {
    expect(parseTranscriptLine('{not json')).toBeNull();
  });
});

describe('dedupByUuid', () => {
  it('drops later duplicates and keeps first-seen order', () => {
    const records = [{ uuid: 'a' }, { uuid: 'b' }, { uuid: 'a' }, { uuid: 'c' }];
    const { kept, dropped } = dedupByUuid(records);
    expect(kept.map((r) => r.uuid)).toEqual(['a', 'b', 'c']);
    expect(dropped).toBe(1);
  });

  it('keeps records without a uuid (cannot prove duplicate)', () => {
    const records = [{ uuid: undefined }, { uuid: undefined }, { uuid: 'x' }];
    const { kept, dropped } = dedupByUuid(records);
    expect(kept).toHaveLength(3);
    expect(dropped).toBe(0);
  });

  it('treats empty-string uuid as missing', () => {
    const records = [{ uuid: '' }, { uuid: '' }];
    const { kept, dropped } = dedupByUuid(records);
    expect(kept).toHaveLength(2);
    expect(dropped).toBe(0);
  });

  it('simulates live+backup overlap (same uuids appear twice)', () => {
    const live = [{ uuid: '1' }, { uuid: '2' }, { uuid: '3' }];
    const backup = [{ uuid: '1' }, { uuid: '2' }];
    const { kept, dropped } = dedupByUuid([...live, ...backup]);
    expect(kept).toHaveLength(3);
    expect(dropped).toBe(2);
  });
});

describe('classifyTool', () => {
  it('maps MultiEdit to Edit', () => {
    expect(classifyTool('MultiEdit')).toBe('Edit');
    expect(classifyTool('Edit')).toBe('Edit');
  });

  it('maps known tools directly', () => {
    expect(classifyTool('Write')).toBe('Write');
    expect(classifyTool('Read')).toBe('Read');
    expect(classifyTool('Bash')).toBe('Bash');
  });

  it('maps unknown/MCP tools to Other', () => {
    expect(classifyTool('mcp__supabase__execute_sql')).toBe('Other');
  });
});

describe('token usage', () => {
  it('accumulates usage fields from a record', () => {
    const acc = emptyTokenUsage();
    const record: TranscriptRecord = {
      message: {
        usage: {
          input_tokens: 10,
          output_tokens: 20,
          cache_creation_input_tokens: 5,
          cache_read_input_tokens: 7,
        },
      },
    };
    addUsage(acc, record);
    expect(acc).toEqual({ input: 10, output: 20, cacheCreation: 5, cacheRead: 7 });
    expect(totalTokens(acc)).toBe(42);
  });

  it('ignores records without usage', () => {
    const acc = emptyTokenUsage();
    addUsage(acc, { message: {} });
    expect(totalTokens(acc)).toBe(0);
  });
});

describe('extractToolUses', () => {
  it('pulls tool_use blocks with file_path', () => {
    const record: TranscriptRecord = {
      message: {
        content: [
          { type: 'text', text: 'hi' },
          { type: 'tool_use', name: 'Write', input: { file_path: '/a.ts' } },
          { type: 'tool_use', name: 'Bash', input: { command: 'ls' } },
        ],
      },
    };
    const ops = extractToolUses(record);
    expect(ops).toEqual([
      { name: 'Write', filePath: '/a.ts' },
      { name: 'Bash', filePath: null },
    ]);
  });

  it('returns empty when content is not an array', () => {
    expect(extractToolUses({ message: { content: 'string' } })).toEqual([]);
    expect(extractToolUses({})).toEqual([]);
  });
});
