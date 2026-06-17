import { describe, it, expect } from 'vitest';
import { isTestFile, isAdrOrSpecFile } from './detectors.js';

describe('isTestFile', () => {
  it('matches real test extensions', () => {
    for (const p of [
      'src/foo.test.ts',
      'src/foo.test.tsx',
      'src/foo.spec.js',
      'src/foo.spec.jsx',
    ]) {
      expect(isTestFile(p), p).toBe(true);
    }
  });

  it('matches dedicated test directories', () => {
    for (const p of [
      'apps/web/__tests__/unit/simulator.test.tsx',
      'tests/integration/login.py',
      'test/helpers.rb',
      'apps/api/tests/unit/test_salesforce_connector.py',
    ]) {
      expect(isTestFile(p), p).toBe(true);
    }
  });

  it('matches python/go test naming conventions', () => {
    for (const p of ['pkg/test_widget.py', 'pkg/widget_test.py', 'pkg/handler_test.go']) {
      expect(isTestFile(p), p).toBe(true);
    }
  });

  // The regression: the exact bug that produced a false 85% test-coupling rate.
  it('does NOT match a feature file literally named test.ts', () => {
    expect(isTestFile('apps/api/src/routes/test.ts')).toBe(false);
  });

  it('does NOT match substrings of "test" in unrelated names', () => {
    for (const p of [
      'src/testimonials.ts',
      'src/latest.ts',
      'src/contest/page.tsx',
      'src/protest.go',
      'src/test-utils/render.ts', // a helper dir, not a test file itself
    ]) {
      expect(isTestFile(p), p).toBe(false);
    }
  });
});

describe('isAdrOrSpecFile', () => {
  it('matches ADRs in adr/ dirs (docs or knowledge)', () => {
    for (const p of [
      'docs/adr/0013-sistema-de-agentes-de-auditoria.md',
      'knowledge/adr/0006-cuando-aplicar-cqrs.md',
    ]) {
      expect(isAdrOrSpecFile(p), p).toBe(true);
    }
  });

  it('matches spec markdown in spec(s)/ dirs', () => {
    for (const p of ['docs/specs/fundacion-onboarding.md', 'docs/spec/login.md']) {
      expect(isAdrOrSpecFile(p), p).toBe(true);
    }
  });

  it('does NOT match code files that merely contain adr/spec in the name', () => {
    for (const p of ['src/Spec.tsx', 'src/adronaut.ts', 'src/components/specBar.ts']) {
      expect(isAdrOrSpecFile(p), p).toBe(false);
    }
  });
});
