import { describe, it, expect } from 'vitest';
import { isValidPreset, selectPresetValues, resolveInstall, VALID_PRESETS } from './select.js';

const OPT_IN = ['rueditas'];
const ALL = [
  'prettier',
  'eslint',
  'tsconfig',
  'commitlint',
  'lint-staged',
  'husky',
  'agents-md',
  'architecture-guide',
  'rueditas',
];
const BASE = ALL.filter((v) => !OPT_IN.includes(v));

describe('isValidPreset', () => {
  it('accepts the documented presets', () => {
    expect(isValidPreset('full')).toBe(true);
    expect(isValidPreset('agents-only')).toBe(true);
    expect(isValidPreset('rueditas')).toBe(true);
  });

  it('rejects typos and unknown values', () => {
    for (const bad of ['fll', 'agents', 'foo', '', 'FULL']) {
      expect(isValidPreset(bad)).toBe(false);
    }
  });

  it('exposes exactly three valid presets', () => {
    expect(VALID_PRESETS).toEqual(['full', 'agents-only', 'rueditas']);
  });
});

describe('selectPresetValues', () => {
  it('--yes selects everything except opt-in', () => {
    expect(selectPresetValues(ALL, { yes: true }, OPT_IN)).toEqual(BASE);
  });

  it('--preset full selects everything except opt-in (invariant)', () => {
    expect(selectPresetValues(ALL, { preset: 'full' }, OPT_IN)).toEqual(BASE);
  });

  it('--preset agents-only selects just agents-md', () => {
    expect(selectPresetValues(ALL, { preset: 'agents-only' }, OPT_IN)).toEqual(['agents-md']);
  });

  it('returns null (interactive) when no preset or yes is given', () => {
    expect(selectPresetValues(ALL, {}, OPT_IN)).toBeNull();
  });
});

describe('selectPresetValues rueditas', () => {
  it('--preset rueditas selects everything, opt-in included', () => {
    expect(selectPresetValues(ALL, { preset: 'rueditas' }, OPT_IN)).toEqual(ALL);
  });
});

describe('resolveInstall', () => {
  it('honors an explicit preset/yes regardless of TTY (not flagged as defaulted)', () => {
    expect(resolveInstall(ALL, { yes: true }, false, OPT_IN)).toEqual({
      kind: 'install',
      values: BASE,
      defaulted: false,
    });
    expect(resolveInstall(ALL, { preset: 'agents-only' }, true, OPT_IN)).toEqual({
      kind: 'install',
      values: ['agents-md'],
      defaulted: false,
    });
  });

  it('defaults to the full preset in a non-interactive environment (no more hard error)', () => {
    expect(resolveInstall(ALL, {}, false, OPT_IN)).toEqual({
      kind: 'install',
      values: BASE,
      defaulted: true,
    });
  });

  it('falls through to an interactive prompt only with a TTY and no flags', () => {
    expect(resolveInstall(ALL, {}, true, OPT_IN)).toEqual({ kind: 'prompt' });
  });
});
