import { describe, it, expect } from 'vitest';
import { isValidPreset, selectPresetValues, resolveInstall, VALID_PRESETS } from './select.js';

const ALL = ['prettier', 'eslint', 'tsconfig', 'commitlint', 'lint-staged', 'husky', 'agents-md', 'architecture-guide'];

describe('isValidPreset', () => {
  it('accepts the documented presets', () => {
    expect(isValidPreset('full')).toBe(true);
    expect(isValidPreset('agents-only')).toBe(true);
  });

  it('rejects typos and unknown values', () => {
    for (const bad of ['fll', 'agents', 'foo', '', 'FULL']) {
      expect(isValidPreset(bad)).toBe(false);
    }
  });

  it('exposes exactly two valid presets', () => {
    expect(VALID_PRESETS).toEqual(['full', 'agents-only']);
  });
});

describe('selectPresetValues', () => {
  it('--yes selects everything', () => {
    expect(selectPresetValues(ALL, { yes: true })).toEqual(ALL);
  });

  it('--preset full selects everything', () => {
    expect(selectPresetValues(ALL, { preset: 'full' })).toEqual(ALL);
  });

  it('--preset agents-only selects just agents-md', () => {
    expect(selectPresetValues(ALL, { preset: 'agents-only' })).toEqual(['agents-md']);
  });

  it('returns null (interactive) when no preset or yes is given', () => {
    expect(selectPresetValues(ALL, {})).toBeNull();
  });
});

describe('resolveInstall', () => {
  it('honors an explicit preset/yes regardless of TTY (not flagged as defaulted)', () => {
    expect(resolveInstall(ALL, { yes: true }, false)).toEqual({ kind: 'install', values: ALL, defaulted: false });
    expect(resolveInstall(ALL, { preset: 'agents-only' }, true)).toEqual({
      kind: 'install',
      values: ['agents-md'],
      defaulted: false,
    });
  });

  it('defaults to the full preset in a non-interactive environment (no more hard error)', () => {
    expect(resolveInstall(ALL, {}, false)).toEqual({ kind: 'install', values: ALL, defaulted: true });
  });

  it('falls through to an interactive prompt only with a TTY and no flags', () => {
    expect(resolveInstall(ALL, {}, true)).toEqual({ kind: 'prompt' });
  });
});
