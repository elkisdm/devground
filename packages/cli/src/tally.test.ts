import { describe, it, expect } from 'vitest';
import { formatTally } from './tally.js';

describe('formatTally', () => {
  it('reports only the installed count when nothing was skipped or failed', () => {
    expect(formatTally({ installed: 3, skipped: 0, failed: 0 })).toBe('3 configured.');
  });

  it('separates skipped from configured instead of counting skips as successes', () => {
    expect(formatTally({ installed: 2, skipped: 1, failed: 0 })).toBe(
      '2 configured, 1 skipped (already present).',
    );
  });

  it('includes failures when present', () => {
    expect(formatTally({ installed: 1, skipped: 2, failed: 3 })).toBe(
      '1 configured, 2 skipped (already present), 3 failed.',
    );
  });

  it('omits the skipped and failed clauses when both are zero', () => {
    expect(formatTally({ installed: 0, skipped: 0, failed: 0 })).toBe('0 configured.');
  });
});
