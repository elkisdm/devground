import { describe, it, expect } from 'vitest';
import { presetIsValid, tallyExitCode } from './exit.js';
import type { InstallTally } from './tally.js';

describe('presetIsValid', () => {
  it('accepts undefined (no --preset flag)', () => {
    expect(presetIsValid(undefined)).toBe(true);
  });

  it('accepts a known preset', () => {
    expect(presetIsValid('full')).toBe(true);
    expect(presetIsValid('agents-only')).toBe(true);
  });

  it('rejects an unknown preset', () => {
    expect(presetIsValid('bogus')).toBe(false);
  });
});

describe('tallyExitCode', () => {
  it('returns 0 when nothing failed', () => {
    const tally: InstallTally = { installed: 3, skipped: 1, failed: 0 };
    expect(tallyExitCode(tally)).toBe(0);
  });

  it('returns 1 when at least one installer failed', () => {
    const tally: InstallTally = { installed: 2, skipped: 0, failed: 1 };
    expect(tallyExitCode(tally)).toBe(1);
  });
});
