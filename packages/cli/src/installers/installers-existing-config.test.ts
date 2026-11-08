import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as eslint from './eslint.js';
import * as prettier from './prettier.js';
import * as vitest from './vitest.js';
import * as commitlint from './commitlint.js';
import * as lintStaged from './lint-staged.js';
import type { InstallerOptions } from '../types.js';
import { makeRecordingOps } from './test-helpers.js';

const STACK = { framework: 'node', hasTypeScript: true, packageManager: 'pnpm' } as const;

function opts(ops: InstallerOptions['ops']): InstallerOptions {
  return { targetDir: '/proj', stack: STACK, ops };
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe.each([
  [
    'eslint',
    eslint,
    ['eslint.config.js', 'eslint.config.ts', '.eslintrc', '.eslintrc.json', '.eslintrc.yml'],
    { eslintConfig: {} },
  ],
  [
    'prettier',
    prettier,
    ['.prettierrc', '.prettierrc.toml', 'prettier.config.ts'],
    { prettier: 'x' },
  ],
  [
    'commitlint',
    commitlint,
    ['commitlint.config.mjs', 'commitlint.config.ts', '.commitlintrc.json', '.commitlintrc'],
    { commitlint: {} },
  ],
  [
    'lint-staged',
    lintStaged,
    ['lint-staged.config.js', '.lintstagedrc', '.lintstagedrc.json'],
    { 'lint-staged': {} },
  ],
] as const)('%s respeta config existente', (_name, installer, files, pkgFragment) => {
  it.each(files)('salta con %s sin instalar deps ni escribir', (file) => {
    const { ops, devDeps, writes, pkg } = makeRecordingOps({}, [`/proj/${file}`]);
    expect(installer.install(opts(ops))).toBe('skipped');
    expect(devDeps).toHaveLength(0);
    expect(writes).toHaveLength(0);
    expect(pkg()).toEqual({});
  });

  it('salta con la clave de package.json', () => {
    const { ops, devDeps, writes } = makeRecordingOps({ ...pkgFragment });
    expect(installer.install(opts(ops))).toBe('skipped');
    expect(devDeps).toHaveLength(0);
    expect(writes).toHaveLength(0);
  });

  it('sin config sigue instalando', () => {
    const { ops, devDeps } = makeRecordingOps({});
    expect(installer.install(opts(ops))).toBe('installed');
    expect(devDeps).toHaveLength(1);
  });
});

describe('vitest respeta config existente', () => {
  it.each(['vitest.config.ts', 'vitest.config.js', 'vitest.config.mts'])(
    'con %s no escribe config ni deps; agrega test pero no test:coverage',
    (file) => {
      const { ops, devDeps, writes, pkg } = makeRecordingOps({}, [`/proj/${file}`]);
      expect(vitest.install(opts(ops))).toBe('installed');
      expect(devDeps).toHaveLength(0);
      expect(writes).toHaveLength(0);
      expect(pkg().scripts).toEqual({ test: 'vitest run' });
    },
  );

  it('vite.config.ts con sección test cuenta como config', () => {
    const { ops, devDeps, writes } = makeRecordingOps({}, [], '', {
      '/proj/vite.config.ts': 'export default { test: { globals: true } }',
    });
    vitest.install(opts(ops));
    expect(devDeps).toHaveLength(0);
    expect(writes).toHaveLength(0);
  });

  it('vite.config.ts sin sección test no cuenta: se instala como siempre', () => {
    const { ops, devDeps, writes } = makeRecordingOps({}, [], '', {
      '/proj/vite.config.ts': 'export default { plugins: [] }',
    });
    expect(vitest.install(opts(ops))).toBe('installed');
    expect(devDeps).toHaveLength(1);
    expect(writes[0]?.path).toBe('/proj/vitest.config.mjs');
  });
});
