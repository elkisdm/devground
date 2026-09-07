import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as lintStaged from './lint-staged.js';
import * as vitest from './vitest.js';
import type { DetectedStack, InstallerOps, InstallerOptions } from '../types.js';
import { makeRecordingOps } from './test-helpers.js';

// Los presets compartidos están escritos para TypeScript. Estos tests cubren el
// caso contrario —un repo de JavaScript puro— porque ahí es donde el estándar
// fallaba en silencio: cero tests encontrados y cero archivos linteados.
const NODE_JS_STACK: DetectedStack = {
  framework: 'node',
  hasTypeScript: false,
  packageManager: 'pnpm',
};

const NODE_TS_STACK: DetectedStack = {
  framework: 'node',
  hasTypeScript: true,
  packageManager: 'pnpm',
};

function optionsFor(stack: DetectedStack, ops: InstallerOps): InstallerOptions {
  return { targetDir: '/proj', stack, ops };
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('vitest installer (JavaScript projects)', () => {
  it('overrides the preset globs on a JavaScript project (the preset only matches .ts)', () => {
    const { ops, writes } = makeRecordingOps({ name: 'app' });

    const result = vitest.install(optionsFor(NODE_JS_STACK, ops));

    expect(result).toBe('installed');
    const content = writes[0]?.content ?? '';
    // Sin esto, `vitest run` no encuentra un solo test en un repo JS.
    expect(content).toContain("include: ['src/**/*.test.js', 'packages/*/src/**/*.test.js']");
    expect(content).toContain("include: ['src/**/*.js', 'packages/*/src/**/*.js']");
    expect(content).toContain('autoUpdate: true');
  });

  it('leaves the preset globs alone on a TypeScript project', () => {
    const { ops, writes } = makeRecordingOps({ name: 'app' });

    vitest.install(optionsFor(NODE_TS_STACK, ops));

    expect(writes[0]?.content).not.toContain('include:');
  });

  it('pins @vitest/coverage-v8 to the vitest range the project already declares', () => {
    const { ops, devDeps } = makeRecordingOps({
      name: 'app',
      devDependencies: { vitest: '^3.2.4' },
    });

    vitest.install(optionsFor(NODE_JS_STACK, ops));

    // coverage-v8 latest (v4) sobre vitest 3 revienta en runtime; y no se
    // vuelve a agregar vitest para no subirle el rango al proyecto.
    expect(devDeps[0]?.packages).toEqual([
      '@devground/vitest-config',
      '@vitest/coverage-v8@^3.2.4',
    ]);
  });

  it('does not pin coverage-v8 when the declared vitest range carries no version', () => {
    const { ops, devDeps } = makeRecordingOps({
      name: 'app',
      devDependencies: { vitest: 'workspace:*' },
    });

    vitest.install(optionsFor(NODE_TS_STACK, ops));

    expect(devDeps[0]?.packages).toEqual(['@devground/vitest-config', '@vitest/coverage-v8']);
  });
});

describe('lint-staged installer (JavaScript projects)', () => {
  it('adds the .js globs the shared preset lacks', () => {
    const { ops, writes } = makeRecordingOps();

    lintStaged.install(optionsFor(NODE_JS_STACK, ops));

    const content = writes[0]?.content ?? '';
    expect(content).toContain("require('@devground/lint-staged-config')");
    // Sin este glob el pre-commit no lintea ni formatea nada en un repo JS.
    expect(content).toContain("'*.{js,mjs,cjs,jsx}': ['eslint --fix', 'prettier --write']");
  });

  it('stays a plain re-export on a TypeScript project', () => {
    const { ops, writes } = makeRecordingOps();

    lintStaged.install(optionsFor(NODE_TS_STACK, ops));

    expect(writes[0]?.content).toBe("module.exports = require('@devground/lint-staged-config');\n");
  });
});
