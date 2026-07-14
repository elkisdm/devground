import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as prettier from './prettier.js';
import * as eslint from './eslint.js';
import * as tsconfig from './tsconfig.js';
import * as commitlint from './commitlint.js';
import * as lintStaged from './lint-staged.js';
import * as husky from './husky.js';
import * as vitest from './vitest.js';
import * as agentsMd from './agents-md.js';
import * as architectureGuide from './architecture-guide.js';
import * as uiConventions from './ui-conventions.js';
import type { DetectedStack, InstallerOps, InstallerOptions } from '../types.js';
import { makeRecordingOps } from './test-helpers.js';

const NODE_STACK: DetectedStack = {
  framework: 'node',
  hasTypeScript: true,
  packageManager: 'pnpm',
};

const NEXT_STACK: DetectedStack = {
  framework: 'nextjs',
  hasTypeScript: true,
  packageManager: 'npm',
};

const REACT_STACK: DetectedStack = {
  framework: 'react',
  hasTypeScript: true,
  packageManager: 'pnpm',
};

const ASTRO_STACK: DetectedStack = {
  framework: 'astro',
  hasTypeScript: true,
  packageManager: 'pnpm',
};

function optionsFor(stack: DetectedStack, ops: InstallerOps): InstallerOptions {
  return { targetDir: '/proj', stack, ops };
}

// Captured stdout from a delegated bin that wrote an artifact vs one that
// skipped (ADR convention: a green "✓" line means it wrote something).
const WROTE_OUTPUT = '  \x1b[32m✓\x1b[0m Wrote something';
const SKIPPED_OUTPUT = '  \x1b[33m!\x1b[0m Skipped: already present';

beforeEach(() => {
  // installers call logger.success -> console.log; silence it.
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('prettier installer', () => {
  it('adds prettier deps and sets the prettier key in package.json', () => {
    const { ops, devDeps, pkg } = makeRecordingOps({ name: 'app' });

    const result = prettier.install(optionsFor(NODE_STACK, ops));

    expect(result).toBe('installed');
    expect(devDeps).toHaveLength(1);
    expect(devDeps[0]?.pm).toBe('pnpm');
    expect(devDeps[0]?.packages).toEqual(['@devground/prettier-config', 'prettier']);
    expect(pkg().prettier).toBe('@devground/prettier-config');
    // preserves existing keys
    expect(pkg().name).toBe('app');
  });
});

describe('lint-staged installer', () => {
  it('adds deps and writes a .cjs config that re-exports the shared rules (not a bare string)', () => {
    const { ops, devDeps, writes, pkg } = makeRecordingOps({ name: 'app' });

    const result = lintStaged.install(optionsFor(NODE_STACK, ops));

    expect(result).toBe('installed');
    expect(devDeps[0]?.packages).toEqual(['@devground/lint-staged-config', 'lint-staged']);
    // It must NOT write the broken package.json string that lint-staged rejects.
    expect(pkg()['lint-staged']).toBeUndefined();
    expect(writes).toHaveLength(1);
    expect(writes[0]?.path).toBe('/proj/lint-staged.config.cjs');
    expect(writes[0]?.content).toContain("require('@devground/lint-staged-config')");
  });
});

describe('eslint installer', () => {
  it('writes a base flat config for a non-Next project', () => {
    const { ops, devDeps, writes } = makeRecordingOps();

    const result = eslint.install(optionsFor(NODE_STACK, ops));

    expect(result).toBe('installed');
    expect(devDeps[0]?.packages).toEqual(['@devground/eslint-config', 'eslint']);
    expect(writes).toHaveLength(1);
    expect(writes[0]?.path).toBe('/proj/eslint.config.mjs');
    expect(writes[0]?.content).toContain("import baseConfig from '@devground/eslint-config'");
    expect(writes[0]?.content).toContain('export default baseConfig();');
  });

  it('writes a Next flat config and adds eslint-config-next for a Next project', () => {
    const { ops, devDeps, writes } = makeRecordingOps();

    eslint.install(optionsFor(NEXT_STACK, ops));

    expect(devDeps[0]?.packages).toEqual([
      '@devground/eslint-config',
      'eslint',
      'eslint-config-next',
    ]);
    expect(writes[0]?.content).toContain("import nextConfig from '@devground/eslint-config/next'");
    expect(writes[0]?.content).toContain('export default nextConfig();');
  });

  it('writes an Astro flat config and adds eslint-plugin-astro for an Astro project', () => {
    const { ops, devDeps, writes } = makeRecordingOps();

    eslint.install(optionsFor(ASTRO_STACK, ops));

    expect(devDeps[0]?.packages).toEqual([
      '@devground/eslint-config',
      'eslint',
      'eslint-plugin-astro',
    ]);
    expect(writes[0]?.content).toContain("import astroConfig from '@devground/eslint-config/astro'");
    expect(writes[0]?.content).toContain('export default astroConfig();');
  });
});

describe('vitest installer', () => {
  it('adds deps, writes a merged config with the autoUpdate ratchet, and sets test scripts', () => {
    const { ops, devDeps, writes, pkg } = makeRecordingOps({ name: 'app' });

    const result = vitest.install(optionsFor(NODE_STACK, ops));

    expect(result).toBe('installed');
    expect(devDeps[0]?.packages).toEqual([
      '@devground/vitest-config',
      'vitest',
      '@vitest/coverage-v8',
    ]);
    expect(writes).toHaveLength(1);
    expect(writes[0]?.path).toBe('/proj/vitest.config.mjs');
    // defineConfig + spread (NOT mergeConfig) so Vitest's autoUpdate can rewrite it,
    // while still inheriting the preset's critical-path thresholds.
    expect(writes[0]?.content).toContain("import base, { CRITICAL_THRESHOLDS } from '@devground/vitest-config'");
    expect(writes[0]?.content).toContain('defineConfig({');
    expect(writes[0]?.content).not.toContain('mergeConfig');
    expect(writes[0]?.content).toContain('...CRITICAL_THRESHOLDS');
    expect(writes[0]?.content).toContain('autoUpdate: true');
    // ratchet seeds at 0 so it never spuriously breaks a low-coverage repo
    expect(writes[0]?.content).toContain('lines: 0');
    const scripts = pkg().scripts as Record<string, string>;
    expect(scripts.test).toBe('vitest run');
    expect(scripts['test:coverage']).toBe('vitest run --coverage');
  });

  it('never overwrites an existing test script but still fills in test:coverage', () => {
    const { ops, writes, pkg } = makeRecordingOps({
      name: 'app',
      scripts: { test: 'jest' },
    });

    const result = vitest.install(optionsFor(NODE_STACK, ops));

    expect(result).toBe('installed');
    const scripts = pkg().scripts as Record<string, string>;
    expect(scripts.test).toBe('jest'); // left untouched
    expect(scripts['test:coverage']).toBe('vitest run --coverage'); // added
    expect(writes[0]?.path).toBe('/proj/vitest.config.mjs');
  });

  it('skips entirely when config and both scripts already exist', () => {
    const { ops, writes, devDeps } = makeRecordingOps(
      { name: 'app', scripts: { test: 'vitest run', 'test:coverage': 'vitest run --coverage' } },
      ['/proj/vitest.config.mjs'],
    );

    const result = vitest.install(optionsFor(NODE_STACK, ops));

    expect(result).toBe('skipped');
    expect(writes).toHaveLength(0);
    expect(devDeps).toHaveLength(0); // no deps when config pre-exists
  });
});

describe('commitlint installer', () => {
  it('adds deps and writes commitlint.config.js', () => {
    const { ops, devDeps, writes } = makeRecordingOps();

    const result = commitlint.install(optionsFor(NODE_STACK, ops));

    expect(result).toBe('installed');
    expect(devDeps[0]?.packages).toEqual(['@devground/commitlint-config', '@commitlint/cli']);
    expect(writes[0]?.path).toBe('/proj/commitlint.config.js');
    expect(writes[0]?.content).toContain("extends: ['@devground/commitlint-config']");
  });
});

describe('tsconfig installer', () => {
  it('writes a single base tsconfig for a non-Next project', () => {
    const { ops, devDeps, writes } = makeRecordingOps();

    const result = tsconfig.install(optionsFor(NODE_STACK, ops));

    expect(result).toBe('installed');
    expect(devDeps[0]?.packages).toEqual(['@devground/tsconfig', 'typescript']);
    expect(writes).toHaveLength(1);
    expect(writes[0]?.path).toBe('/proj/tsconfig.json');
    const parsed = JSON.parse(writes[0]?.content ?? '{}') as Record<string, unknown>;
    expect(parsed.extends).toBe('@devground/tsconfig/base.json');
    expect(parsed.include).toEqual(['src/**/*.ts']);
  });

  it('writes both tsconfig.json and tsconfig.typecheck.json for a Next project', () => {
    const { ops, writes } = makeRecordingOps();

    const result = tsconfig.install(optionsFor(NEXT_STACK, ops));

    expect(result).toBe('installed');
    expect(writes).toHaveLength(2);
    const paths = writes.map((w) => w.path);
    expect(paths).toContain('/proj/tsconfig.json');
    expect(paths).toContain('/proj/tsconfig.typecheck.json');

    const main = JSON.parse(
      writes.find((w) => w.path === '/proj/tsconfig.json')?.content ?? '{}',
    ) as Record<string, unknown>;
    expect(main.extends).toBe('@devground/tsconfig/next.json');

    const typecheck = JSON.parse(
      writes.find((w) => w.path === '/proj/tsconfig.typecheck.json')?.content ?? '{}',
    ) as Record<string, unknown>;
    expect(typecheck.extends).toBe('@devground/tsconfig/next-typecheck.json');
  });

  it('writes both Astro presets (dev + typecheck) for an Astro project', () => {
    const { ops, devDeps, writes } = makeRecordingOps();

    const result = tsconfig.install(optionsFor(ASTRO_STACK, ops));

    expect(result).toBe('installed');
    expect(devDeps[0]?.packages).toEqual(['@devground/tsconfig', 'typescript']);
    expect(writes).toHaveLength(2);

    const main = JSON.parse(
      writes.find((w) => w.path === '/proj/tsconfig.json')?.content ?? '{}',
    ) as Record<string, unknown>;
    expect(main.extends).toBe('@devground/tsconfig/astro.json');
    expect(main.include).toContain('.astro/types.d.ts');
    expect(main.include).toContain('src/**/*.astro');

    const typecheck = JSON.parse(
      writes.find((w) => w.path === '/proj/tsconfig.typecheck.json')?.content ?? '{}',
    ) as Record<string, unknown>;
    expect(typecheck.extends).toBe('@devground/tsconfig/astro-typecheck.json');
    expect(typecheck.include).toContain('src/**/*.astro');
  });

  it('skips the Astro install entirely when both tsconfigs already exist', () => {
    const { ops, devDeps, writes } = makeRecordingOps({}, [
      '/proj/tsconfig.json',
      '/proj/tsconfig.typecheck.json',
    ]);

    const result = tsconfig.install(optionsFor(ASTRO_STACK, ops));

    expect(result).toBe('skipped');
    expect(devDeps).toHaveLength(0);
    expect(writes).toHaveLength(0);
  });
});

describe('husky installer', () => {
  it('adds deps and runs the husky setup binary in the target dir', () => {
    const { ops, devDeps, runs } = makeRecordingOps({}, [], WROTE_OUTPUT);

    const result = husky.install(optionsFor(NODE_STACK, ops));

    expect(result).toBe('installed');
    expect(devDeps[0]?.packages).toEqual(['@devground/husky-config', 'husky']);
    expect(runs).toHaveLength(1);
    expect(runs[0]?.cmd).toBe('npx devground-husky');
    expect(runs[0]?.cwd).toBe('/proj');
  });

  it('reports skipped when the bin writes nothing on a re-run', () => {
    const { ops, devDeps } = makeRecordingOps({}, [], SKIPPED_OUTPUT);

    const result = husky.install(optionsFor(NODE_STACK, ops));

    expect(result).toBe('skipped');
    // dep is still installed even on a skip (it's idempotent and cheap)
    expect(devDeps[0]?.packages).toEqual(['@devground/husky-config', 'husky']);
  });
});

describe('agents-md installer', () => {
  it('adds the agents-md dep and runs the agents binary', () => {
    const { ops, devDeps, runs } = makeRecordingOps({}, [], WROTE_OUTPUT);

    const result = agentsMd.install(optionsFor(NODE_STACK, ops));

    expect(result).toBe('installed');
    expect(devDeps[0]?.packages).toEqual(['@devground/agents-md']);
    expect(runs[0]?.cmd).toBe('npx devground-agents');
    expect(runs[0]?.cwd).toBe('/proj');
  });

  it('reports skipped when the bin writes nothing on a re-run', () => {
    const { ops } = makeRecordingOps({}, [], SKIPPED_OUTPUT);

    const result = agentsMd.install(optionsFor(NODE_STACK, ops));

    expect(result).toBe('skipped');
  });
});

describe('architecture-guide installer', () => {
  it('adds the architecture-guide dep and runs the architecture binary', () => {
    const { ops, devDeps, runs } = makeRecordingOps({}, [], WROTE_OUTPUT);

    const result = architectureGuide.install(optionsFor(NODE_STACK, ops));

    expect(result).toBe('installed');
    expect(devDeps[0]?.packages).toEqual(['@devground/architecture-guide']);
    expect(runs[0]?.cmd).toBe('npx devground-architecture');
    expect(runs[0]?.cwd).toBe('/proj');
  });

  it('reports skipped when the bin writes nothing on a re-run', () => {
    const { ops } = makeRecordingOps({}, [], SKIPPED_OUTPUT);

    const result = architectureGuide.install(optionsFor(NODE_STACK, ops));

    expect(result).toBe('skipped');
  });
});

describe('ui-conventions installer', () => {
  it('installs for a Next project: adds dep and runs the bin', () => {
    const { ops, devDeps, runs } = makeRecordingOps({}, [], WROTE_OUTPUT);
    const result = uiConventions.install(optionsFor(NEXT_STACK, ops));
    expect(result).toBe('installed');
    expect(devDeps[0]?.packages).toEqual(['@devground/ui-conventions']);
    expect(runs[0]?.cmd).toBe('npx devground-ui-conventions');
    expect(runs[0]?.cwd).toBe('/proj');
  });
  it('installs for a React project', () => {
    const { ops, devDeps, runs } = makeRecordingOps({}, [], WROTE_OUTPUT);
    const result = uiConventions.install(optionsFor(REACT_STACK, ops));
    expect(result).toBe('installed');
    expect(devDeps).toHaveLength(1);
    expect(runs).toHaveLength(1);
  });
  it('skips for a non-frontend (Node) project: no dep, no run', () => {
    const { ops, devDeps, runs } = makeRecordingOps();
    const result = uiConventions.install(optionsFor(NODE_STACK, ops));
    expect(result).toBe('skipped');
    expect(devDeps).toHaveLength(0);
    expect(runs).toHaveLength(0);
  });
  it('reports skipped when the bin writes nothing on a re-run (React project)', () => {
    const { ops } = makeRecordingOps({}, [], SKIPPED_OUTPUT);
    const result = uiConventions.install(optionsFor(REACT_STACK, ops));
    expect(result).toBe('skipped');
  });
});

describe('overwrite guard (honors "no sobreescribe nada existente")', () => {
  it('eslint skips writing AND installing deps when eslint.config.mjs already exists', () => {
    const { ops, writes, devDeps } = makeRecordingOps({}, ['/proj/eslint.config.mjs']);

    const result = eslint.install(optionsFor(NODE_STACK, ops));

    expect(result).toBe('skipped');
    expect(writes).toHaveLength(0);
    // skipping must not leave a dirty tree by installing deps anyway
    expect(devDeps).toHaveLength(0);
  });

  it('commitlint skips writing and deps when commitlint.config.js already exists', () => {
    const { ops, writes, devDeps } = makeRecordingOps({}, ['/proj/commitlint.config.js']);

    const result = commitlint.install(optionsFor(NODE_STACK, ops));

    expect(result).toBe('skipped');
    expect(writes).toHaveLength(0);
    expect(devDeps).toHaveLength(0);
  });

  it('tsconfig skips an existing tsconfig.json (non-Next) without installing deps', () => {
    const { ops, writes, devDeps } = makeRecordingOps({}, ['/proj/tsconfig.json']);

    const result = tsconfig.install(optionsFor(NODE_STACK, ops));

    expect(result).toBe('skipped');
    expect(writes).toHaveLength(0);
    expect(devDeps).toHaveLength(0);
  });

  it('tsconfig (Next) skips entirely only when BOTH config files already exist', () => {
    const { ops, writes, devDeps } = makeRecordingOps({}, [
      '/proj/tsconfig.json',
      '/proj/tsconfig.typecheck.json',
    ]);

    const result = tsconfig.install(optionsFor(NEXT_STACK, ops));

    expect(result).toBe('skipped');
    expect(writes).toHaveLength(0);
    expect(devDeps).toHaveLength(0);
  });

  it('tsconfig (Next) writes only the missing file when one pre-exists (partial skip = installed)', () => {
    const { ops, writes, devDeps } = makeRecordingOps({}, ['/proj/tsconfig.json']);

    const result = tsconfig.install(optionsFor(NEXT_STACK, ops));

    // wrote at least one file -> 'installed'
    expect(result).toBe('installed');
    // dep still installed (work remains), only the missing file written
    expect(devDeps).toHaveLength(1);
    expect(writes).toHaveLength(1);
    expect(writes[0]?.path).toBe('/proj/tsconfig.typecheck.json');
  });

  it('lint-staged skips writing and deps when lint-staged.config.cjs already exists', () => {
    const { ops, writes, devDeps } = makeRecordingOps({}, ['/proj/lint-staged.config.cjs']);

    const result = lintStaged.install(optionsFor(NODE_STACK, ops));

    expect(result).toBe('skipped');
    expect(writes).toHaveLength(0);
    expect(devDeps).toHaveLength(0);
  });

  it('prettier skips and does not install deps when a prettier key already exists', () => {
    const { ops, pkg, devDeps } = makeRecordingOps({ prettier: './existing-config.js' });

    const result = prettier.install(optionsFor(NODE_STACK, ops));

    expect(result).toBe('skipped');
    // existing config preserved, not overwritten; no deps installed
    expect(pkg().prettier).toBe('./existing-config.js');
    expect(devDeps).toHaveLength(0);
  });
});

describe('package-manager propagation', () => {
  it('passes the detected package manager through to addDevDependency', () => {
    const yarnStack: DetectedStack = { ...NODE_STACK, packageManager: 'yarn' };
    const { ops, devDeps } = makeRecordingOps();

    prettier.install(optionsFor(yarnStack, ops));

    expect(devDeps[0]?.pm).toBe('yarn');
  });
});
