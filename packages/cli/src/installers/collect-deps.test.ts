import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createDepCollector } from './collect-deps.js';
import { makeRecordingOps } from './test-helpers.js';
import * as prettier from './prettier.js';
import * as eslint from './eslint.js';
import * as commitlint from './commitlint.js';
import type { DetectedStack, InstallerOptions } from '../types.js';

const NODE_STACK: DetectedStack = {
  framework: 'node',
  hasTypeScript: true,
  packageManager: 'pnpm',
};

beforeEach(() => {
  // installers call logger.success -> console.log; silence it.
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createDepCollector', () => {
  it('flushes all collected packages in a single addDevDependency call, in first-seen order, de-duplicated', () => {
    const { ops: baseOps, devDeps } = makeRecordingOps();
    const { ops: collectingOps, flush } = createDepCollector(baseOps);

    const optionsFor = (): InstallerOptions => ({
      targetDir: '/proj',
      stack: NODE_STACK,
      ops: collectingOps,
    });

    prettier.install(optionsFor());
    eslint.install(optionsFor());
    commitlint.install(optionsFor());

    // Nothing hit the base ops yet — every addDevDependency call was collected.
    expect(devDeps).toHaveLength(0);

    flush('/proj', 'pnpm');

    expect(devDeps).toHaveLength(1);
    expect(devDeps[0]?.dir).toBe('/proj');
    expect(devDeps[0]?.pm).toBe('pnpm');
    expect(devDeps[0]?.packages).toEqual([
      '@devground/prettier-config',
      'prettier',
      '@devground/eslint-config',
      'eslint',
      '@devground/commitlint-config',
      '@commitlint/cli',
    ]);
  });

  it('does not call the base addDevDependency when nothing was collected', () => {
    const { ops: baseOps, devDeps } = makeRecordingOps();
    const { flush } = createDepCollector(baseOps);

    flush('/proj', 'pnpm');

    expect(devDeps).toHaveLength(0);
  });

  it('passes every other op through unchanged', () => {
    const { ops: baseOps, writes, runs } = makeRecordingOps();
    const { ops: collectingOps } = createDepCollector(baseOps);

    collectingOps.writeFile('/proj/foo.txt', 'bar');
    collectingOps.run('echo hi', '/proj');

    expect(writes).toEqual([{ path: '/proj/foo.txt', content: 'bar' }]);
    expect(runs).toEqual([{ cmd: 'echo hi', cwd: '/proj' }]);
  });
});
