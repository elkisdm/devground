import { describe, it, expect } from 'vitest';
import { parseCommitType, reworkRatio, emptyTypeCounts } from './conventional.js';

describe('parseCommitType', () => {
  it('parses a plain conventional type', () => {
    const r = parseCommitType('feat: add login');
    expect(r.type).toBe('feat');
    expect(r.known).toBe(true);
    expect(r.scope).toBeNull();
    expect(r.breaking).toBe(false);
  });

  it('captures the scope', () => {
    const r = parseCommitType('fix(auth): handle expired token');
    expect(r.type).toBe('fix');
    expect(r.scope).toBe('auth');
  });

  it('detects breaking change marker', () => {
    const r = parseCommitType('feat(api)!: drop v1 endpoints');
    expect(r.type).toBe('feat');
    expect(r.scope).toBe('api');
    expect(r.breaking).toBe(true);
  });

  it('is case-insensitive on the type', () => {
    expect(parseCommitType('FEAT: shout').type).toBe('feat');
  });

  it('collapses unknown conventional-looking types to other', () => {
    const r = parseCommitType('wip: something');
    expect(r.type).toBe('other');
    expect(r.known).toBe(false);
  });

  it('collapses non-conventional subjects to other', () => {
    expect(parseCommitType('just a normal message').type).toBe('other');
  });

  it('trims leading/trailing whitespace', () => {
    expect(parseCommitType('  docs: readme  ').type).toBe('docs');
  });

  it('recognizes all canonical types', () => {
    for (const t of ['feat', 'fix', 'refactor', 'chore', 'docs', 'test', 'style', 'perf', 'build', 'ci', 'revert']) {
      expect(parseCommitType(`${t}: x`).type).toBe(t);
    }
  });
});

describe('reworkRatio', () => {
  it('computes (fix + refactor) / feat', () => {
    const counts = emptyTypeCounts();
    counts.feat = 4;
    counts.fix = 2;
    counts.refactor = 2;
    expect(reworkRatio(counts)).toBe(1);
  });

  it('returns null when there are no feat commits', () => {
    const counts = emptyTypeCounts();
    counts.fix = 3;
    expect(reworkRatio(counts)).toBeNull();
  });

  it('returns 0 when no fix/refactor but feat present', () => {
    const counts = emptyTypeCounts();
    counts.feat = 5;
    expect(reworkRatio(counts)).toBe(0);
  });
});
