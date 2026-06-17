import { describe, it, expect } from 'vitest';
import {
  orientationForSession,
  orientationShare,
  aggregateOrientation,
  computeOrientation,
  renderOrientation,
  type SessionOrientation,
  type SessionSource,
} from './orientation.js';
import type { TranscriptRecord } from './transcript.js';

function assistant(
  uuid: string,
  output: number,
  tools: Array<{ name: string; file_path?: string }> = [],
): TranscriptRecord {
  return {
    uuid,
    type: 'assistant',
    sessionId: 's1',
    message: {
      usage: { output_tokens: output },
      content: tools.map((t) => ({ type: 'tool_use', name: t.name, input: { file_path: t.file_path } })),
    },
  };
}

describe('orientationForSession', () => {
  it('separates pre-edit orientation tokens from total session output', () => {
    const recs = [
      assistant('1', 100, [{ name: 'Read', file_path: 'src/a.ts' }]),
      assistant('2', 30, [{ name: 'Edit', file_path: 'src/a.ts' }]), // first edit
      assistant('3', 200, [{ name: 'Edit' }]), // post-edit: counts to total, not orientation
    ];
    const o = orientationForSession('s1', 'dir', recs);
    expect(o.orientationOutputTokens).toBe(130); // 100 + 30
    expect(o.totalOutputTokens).toBe(330); // + 200
    expect(o.reachedEdit).toBe(true);
    expect(orientationShare(o)).toBeCloseTo(130 / 330, 5);
  });

  it('marks a session that never edits as non-coding', () => {
    const o = orientationForSession('s1', 'dir', [assistant('1', 100, [{ name: 'Bash' }])]);
    expect(o.reachedEdit).toBe(false);
  });

  it('detects a codemap Read only before the first edit', () => {
    const before = orientationForSession('s1', 'dir', [
      assistant('1', 20, [{ name: 'Read', file_path: '/repo/docs/codemap.md' }]),
      assistant('2', 10, [{ name: 'Write', file_path: 'src/a.ts' }]),
    ]);
    expect(before.readCodemap).toBe(true);

    const after = orientationForSession('s1', 'dir', [
      assistant('1', 20, [{ name: 'Edit', file_path: 'src/a.ts' }]),
      assistant('2', 10, [{ name: 'Read', file_path: 'docs/codemap.md' }]),
    ]);
    expect(after.readCodemap).toBe(false);
  });
});

describe('aggregateOrientation', () => {
  const s = (over: Partial<SessionOrientation>): SessionOrientation => ({
    sessionId: 'x',
    projectDir: 'repoA',
    orientationOutputTokens: 0,
    totalOutputTokens: 1000,
    reachedEdit: true,
    readCodemap: false,
    ...over,
  });

  it('restricts the codemap comparison to codemap-having repos', () => {
    const report = aggregateOrientation(
      [
        s({ projectDir: 'repoA', orientationOutputTokens: 100, readCodemap: true }),
        s({ projectDir: 'repoA', orientationOutputTokens: 200, readCodemap: false }),
        s({ projectDir: 'repoB', orientationOutputTokens: 999, readCodemap: false }), // repoB has no codemap → excluded from comparison
        s({ reachedEdit: false, orientationOutputTokens: 9999 }), // non-coding → excluded
      ],
      new Set(['repoA']),
    );
    expect(report.codingSessions).toBe(3);
    expect(report.nonCodingSessions).toBe(1);
    expect(report.codemapRepoSessions).toBe(2); // only repoA sessions
    expect(report.withCodemap.medianTokens).toBe(100);
    expect(report.withoutCodemap.medianTokens).toBe(200);
  });

  it('reports the size-robust median share', () => {
    const report = aggregateOrientation(
      [s({ orientationOutputTokens: 250, totalOutputTokens: 1000, readCodemap: true })],
      new Set(['repoA']),
    );
    expect(report.withCodemap.medianShare).toBe(0.25);
  });
});

describe('computeOrientation', () => {
  it('groups sources by session, carries projectDir, dedups by uuid', () => {
    const sources: SessionSource[] = [
      { sessionId: 'a', projectDir: 'repoA', record: assistant('1', 100, [{ name: 'Read', file_path: 'docs/codemap.md' }]) },
      { sessionId: 'a', projectDir: 'repoA', record: assistant('2', 50, [{ name: 'Edit', file_path: 'x.ts' }]) },
      { sessionId: 'a', projectDir: 'repoA', record: assistant('2', 50, [{ name: 'Edit' }]) }, // dup uuid
    ];
    const report = computeOrientation(sources, new Set(['repoA']));
    expect(report.codingSessions).toBe(1);
    expect(report.withCodemap.medianTokens).toBe(150); // dup dropped
  });
});

describe('renderOrientation', () => {
  it('renders tokens + share and the correlational caveat', () => {
    const out = renderOrientation({
      codingSessions: 4,
      nonCodingSessions: 1,
      overall: { sessions: 4, medianTokens: 350, medianShare: 0.2 },
      codemapRepoSessions: 4,
      withCodemap: { sessions: 2, medianTokens: 150, medianShare: 0.1 },
      withoutCodemap: { sessions: 2, medianTokens: 600, medianShare: 0.3 },
    });
    expect(out).toContain('read codemap.md first | 2 | 150 tok | 10%');
    expect(out).toContain('CORRELATIONAL');
    expect(out).toContain('ADR-0015');
  });
});
