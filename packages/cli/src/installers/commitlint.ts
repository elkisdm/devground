import { join } from 'node:path';
import { success, warn } from '@devground/logger';
import { resolveOps } from './ops.js';
import { findExistingConfig, withExts } from './config-detect.js';
import type { InstallerOptions, InstallResult } from '../types.js';

export function install(options: InstallerOptions): InstallResult {
  const { targetDir, stack } = options;
  const ops = resolveOps(options);
  // `.cjs` fuerza CommonJS pase lo que pase con el "type" del package.json: el
  // config exporta con module.exports, y en un proyecto ESM ("type": "module")
  // un `.js` lo rompe al cargarlo. Mismo criterio que lint-staged.
  const configPath = join(targetDir, 'commitlint.config.cjs');

  const existing = findExistingConfig(ops, targetDir, {
    files: [
      ...withExts('commitlint.config', ['cjs', 'js', 'mjs', 'ts', 'cts', 'mts']),
      '.commitlintrc',
      ...withExts('.commitlintrc', ['json', 'yaml', 'yml', 'js', 'cjs', 'mjs', 'ts', 'cts', 'mts']),
    ],
    pkgKey: 'commitlint',
  });
  if (existing) {
    warn(`Commitlint config skipped: ${existing} already exists (left untouched).`);
    return 'skipped';
  }

  ops.addDevDependency(
    targetDir,
    stack.packageManager,
    '@devground/commitlint-config',
    '@commitlint/cli',
  );

  const configContent = `module.exports = { extends: ['@devground/commitlint-config'] };\n`;
  ops.writeFile(configPath, configContent);

  success('Commitlint configured with @devground/commitlint-config');
  return 'installed';
}
