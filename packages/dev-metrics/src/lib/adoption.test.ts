import { describe, it, expect } from 'vitest';
import {
  classifyCohort,
  daysBetween,
  isStrictFromConfigs,
  type AdoptionMarkers,
} from './adoption.js';

function markers(overrides: Partial<AdoptionMarkers> = {}): AdoptionMarkers {
  return {
    born: '2026-01-01',
    tsconfig: '2026-01-01',
    tsconfigStrict: true,
    huskyPreCommit: '2026-01-01',
    eslintFlatConfig: '2026-01-01',
    firstTest: '2026-01-01',
    firstConventionalCommit: '2026-01-01',
    ...overrides,
  };
}

describe('daysBetween', () => {
  it('counts whole days forward', () => {
    expect(daysBetween('2026-01-01', '2026-01-08')).toBe(7);
  });

  it('is zero for the same day', () => {
    expect(daysBetween('2026-05-16', '2026-05-16')).toBe(0);
  });

  it('is negative when b precedes a', () => {
    expect(daysBetween('2026-01-10', '2026-01-01')).toBe(-9);
  });
});

describe('classifyCohort', () => {
  it('born-standardized when all key markers land within the window', () => {
    const r = classifyCohort(markers({ born: '2026-01-01', tsconfig: '2026-01-03', firstTest: '2026-01-05' }));
    expect(r.cohort).toBe('born-standardized');
    expect(r.retrofitLagDays).toBe(4);
    expect(r.missingKeyMarkers).toEqual([]);
  });

  it('born-standardized at exactly the window boundary (7 days)', () => {
    const r = classifyCohort(markers({ firstTest: '2026-01-08' }));
    expect(r.cohort).toBe('born-standardized');
    expect(r.retrofitLagDays).toBe(7);
  });

  it('retrofitted when a key marker lands after the window', () => {
    const r = classifyCohort(markers({ firstTest: '2026-03-01' }));
    expect(r.cohort).toBe('retrofitted');
    expect(r.retrofitLagDays).toBe(daysBetween('2026-01-01', '2026-03-01'));
  });

  it('partial when a key marker is missing (eslint)', () => {
    const r = classifyCohort(markers({ eslintFlatConfig: null }));
    expect(r.cohort).toBe('partial');
    expect(r.missingKeyMarkers).toContain('eslintFlatConfig');
    expect(r.retrofitLagDays).toBeNull();
  });

  it('partial when first test is missing', () => {
    const r = classifyCohort(markers({ firstTest: null }));
    expect(r.cohort).toBe('partial');
    expect(r.missingKeyMarkers).toContain('firstTest');
  });

  it('partial when birth date is unknown even if markers exist', () => {
    const r = classifyCohort(markers({ born: null }));
    expect(r.cohort).toBe('partial');
    expect(r.missingKeyMarkers).toContain('born');
  });

  it('respects a custom window', () => {
    const m = markers({ firstTest: '2026-01-10' }); // 9 days lag
    expect(classifyCohort(m, 7).cohort).toBe('retrofitted');
    expect(classifyCohort(m, 14).cohort).toBe('born-standardized');
  });

  it('does not treat non-key markers (husky) as disqualifying', () => {
    // husky is NOT a key marker; missing it should not force partial.
    const r = classifyCohort(markers({ huskyPreCommit: null }));
    expect(r.cohort).toBe('born-standardized');
  });
});

describe('isStrictFromConfigs (MEJORA E: resolve extends)', () => {
  it('detects strict set directly in tsconfig.json', () => {
    const read = (p: string): string =>
      p === 'tsconfig.json' ? '{ "compilerOptions": { "strict": true } }' : '';
    expect(isStrictFromConfigs(read)).toBe(true);
  });

  it('detects strict inherited via a relative extends', () => {
    const files: Record<string, string> = {
      'tsconfig.json': '{ "extends": "./tsconfig.base.json", "compilerOptions": {} }',
      'tsconfig.base.json': '{ "compilerOptions": { "strict": true } }',
    };
    expect(isStrictFromConfigs((p) => files[p] ?? '')).toBe(true);
  });

  it('resolves nested ../ extends paths', () => {
    const files: Record<string, string> = {
      'packages/app/tsconfig.json': '{ "extends": "../../tsconfig.base.json" }',
      'tsconfig.base.json': '{ "compilerOptions": { "strict": true } }',
    };
    expect(isStrictFromConfigs((p) => files[p] ?? '', 'packages/app/tsconfig.json')).toBe(true);
  });

  it('an explicit strict:false in the child overrides the parent', () => {
    const files: Record<string, string> = {
      'tsconfig.json': '{ "extends": "./base.json", "compilerOptions": { "strict": false } }',
      'base.json': '{ "compilerOptions": { "strict": true } }',
    };
    expect(isStrictFromConfigs((p) => files[p] ?? '')).toBe(false);
  });

  it('stops at a package extends it cannot read (residual limitation)', () => {
    const read = (p: string): string =>
      p === 'tsconfig.json' ? '{ "extends": "@tsconfig/strictest" }' : '';
    expect(isStrictFromConfigs(read)).toBe(false);
  });

  it('tolerates JSONC comments and trailing commas', () => {
    const read = (p: string): string =>
      p === 'tsconfig.json'
        ? '{\n  // strict mode\n  "compilerOptions": { "strict": true, },\n}'
        : '';
    expect(isStrictFromConfigs(read)).toBe(true);
  });

  it('returns false when no tsconfig exists', () => {
    expect(isStrictFromConfigs(() => '')).toBe(false);
  });
});
