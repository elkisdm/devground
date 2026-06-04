import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as prettier from './prettier.js';
import * as eslint from './eslint.js';
import * as tsconfig from './tsconfig.js';
import * as commitlint from './commitlint.js';
import * as lintStaged from './lint-staged.js';
import * as husky from './husky.js';
import * as agentsMd from './agents-md.js';
import * as architectureGuide from './architecture-guide.js';
import type {
  DetectedStack,
  InstallerOps,
  InstallerOptions,
  PackageManager,
} from '../types.js';

/** One recorded `addDevDependency` invocation. */
interface DevDepCall {
  dir: string;
  pm: PackageManager;
  packages: string[];
}

/** One recorded file write. */
interface WriteCall {
  path: string;
  content: string;
}

/** One recorded shell invocation. */
interface RunCall {
  cmd: string;
  cwd: string;
}

/**
 * A fully in-memory {@link InstallerOps} that records every side-effect instead
 * of performing it. `readPackageJson` is backed by a mutable map so installers
 * that read-modify-write package.json (prettier, lint-staged) round-trip
 * correctly. Mirrors how dev-metrics injects a fake `run`.
 */
function makeRecordingOps(
  initialPkg: Record<string, unknown> = {},
  existingFiles: string[] = [],
): {
  ops: InstallerOps;
  devDeps: DevDepCall[];
  writes: WriteCall[];
  runs: RunCall[];
  pkg: () => Record<string, unknown>;
} {
  const devDeps: DevDepCall[] = [];
  const writes: WriteCall[] = [];
  const runs: RunCall[] = [];
  let pkg: Record<string, unknown> = { ...initialPkg };

  const ops: InstallerOps = {
    addDevDependency: (dir, pm, ...packages) => {
      devDeps.push({ dir, pm, packages });
    },
    readPackageJson: () => ({ ...pkg }),
    writePackageJson: (_dir, data) => {
      pkg = { ...data };
    },
    writeFile: (path, content) => {
      writes.push({ path, content });
    },
    fileExists: (path) => existingFiles.includes(path),
    run: (cmd, cwd) => {
      runs.push({ cmd, cwd });
      return '';
    },
  };

  return { ops, devDeps, writes, runs, pkg: () => pkg };
}

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

function optionsFor(stack: DetectedStack, ops: InstallerOps): InstallerOptions {
  return { targetDir: '/proj', stack, ops };
}

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
});

describe('husky installer', () => {
  it('adds deps and runs the husky setup binary in the target dir', () => {
    const { ops, devDeps, runs } = makeRecordingOps();

    const result = husky.install(optionsFor(NODE_STACK, ops));

    expect(result).toBe('installed');
    expect(devDeps[0]?.packages).toEqual(['@devground/husky-config', 'husky']);
    expect(runs).toHaveLength(1);
    expect(runs[0]?.cmd).toBe('npx devground-husky');
    expect(runs[0]?.cwd).toBe('/proj');
  });
});

describe('agents-md installer', () => {
  it('adds the agents-md dep and runs the agents binary', () => {
    const { ops, devDeps, runs } = makeRecordingOps();

    const result = agentsMd.install(optionsFor(NODE_STACK, ops));

    expect(result).toBe('installed');
    expect(devDeps[0]?.packages).toEqual(['@devground/agents-md']);
    expect(runs[0]?.cmd).toBe('npx devground-agents');
    expect(runs[0]?.cwd).toBe('/proj');
  });
});

describe('architecture-guide installer', () => {
  it('adds the architecture-guide dep and runs the architecture binary', () => {
    const { ops, devDeps, runs } = makeRecordingOps();

    const result = architectureGuide.install(optionsFor(NODE_STACK, ops));

    expect(result).toBe('installed');
    expect(devDeps[0]?.packages).toEqual(['@devground/architecture-guide']);
    expect(runs[0]?.cmd).toBe('npx devground-architecture');
    expect(runs[0]?.cwd).toBe('/proj');
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
