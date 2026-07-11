import { describe, it, expect } from 'vitest';
import { isNoiseUser, textFromContent, errorSignals, distillRecords } from './distill.js';

describe('isNoiseUser', () => {
  it('flags local-command and command wrappers', () => {
    expect(isNoiseUser('<local-command-caveat>Caveat: ...')).toBe(true);
    expect(isNoiseUser('<command-name>/model</command-name>')).toBe(true);
    expect(isNoiseUser('  <local-command-stdout>foo')).toBe(true);
  });
  it('keeps real user typing', () => {
    expect(isNoiseUser('descarga y analicemos este video')).toBe(false);
    expect(isNoiseUser('todo, quiero que lo hagamos real')).toBe(false);
  });
});

describe('textFromContent', () => {
  it('returns a string as-is', () => {
    expect(textFromContent('hola')).toBe('hola');
  });
  it('joins text blocks and ignores thinking/tool_use', () => {
    const content = [
      { type: 'thinking', text: 'secret' },
      { type: 'text', text: 'visible one' },
      { type: 'tool_use', name: 'Bash' },
      { type: 'text', text: 'visible two' },
    ];
    expect(textFromContent(content)).toBe('visible one\nvisible two');
  });
  it('handles non-content gracefully', () => {
    expect(textFromContent(undefined)).toBe('');
    expect(textFromContent(42)).toBe('');
  });
});

describe('errorSignals', () => {
  it('extracts only is_error tool_result blocks, trimmed', () => {
    const content = [
      { type: 'tool_result', is_error: false, content: 'ok output' },
      { type: 'tool_result', is_error: true, content: 'File has not been read yet.' },
      { type: 'tool_result', is_error: true, content: [{ text: 'Exit code 1' }] },
    ];
    expect(errorSignals(content)).toEqual(['File has not been read yet.', 'Exit code 1']);
  });
  it('returns [] for non-arrays', () => {
    expect(errorSignals('nope')).toEqual([]);
  });
});

describe('distillRecords', () => {
  const mk = (over: Record<string, unknown>) => ({ type: 'user', ...over });

  it('keeps real user turns, drops noise, collects metadata', () => {
    const recs = [
      mk({ timestamp: '2026-07-01T10:00:00Z', aiTitle: 'T', gitBranch: 'main', cwd: '/x', message: { content: 'real ask' } }),
      mk({ timestamp: '2026-07-01T10:01:00Z', message: { content: '<command-name>/model' } }),
      { type: 'assistant', timestamp: '2026-07-01T10:02:00Z', message: { content: [{ type: 'text', text: 'reply' }] } },
    ];
    const d = distillRecords('sess', recs as never, null);
    expect(d).not.toBeNull();
    expect(d!.userTurns.map((t) => t.text)).toEqual(['real ask']);
    expect(d!.assistantTurns.map((t) => t.text)).toEqual(['reply']);
    expect(d!.title).toBe('T');
    expect(d!.branch).toBe('main');
    expect(d!.firstTs).toBe('2026-07-01T10:00:00Z');
    expect(d!.lastTs).toBe('2026-07-01T10:02:00Z');
  });

  it('returns null when last activity predates the window', () => {
    const recs = [mk({ timestamp: '2026-06-01T00:00:00Z', message: { content: 'old' } })];
    const d = distillRecords('sess', recs as never, new Date('2026-07-01T00:00:00Z'));
    expect(d).toBeNull();
  });

  it('keeps a session with only tool errors (no user turns)', () => {
    const recs = [
      mk({
        timestamp: '2026-07-02T00:00:00Z',
        message: { content: [{ type: 'tool_result', is_error: true, content: 'boom' }] },
      }),
    ];
    const d = distillRecords('sess', recs as never, null);
    expect(d).not.toBeNull();
    expect(d!.errors).toEqual(['boom']);
    expect(d!.userTurns).toEqual([]);
  });

  it('returns null for an empty session', () => {
    expect(distillRecords('sess', [], null)).toBeNull();
  });
});
