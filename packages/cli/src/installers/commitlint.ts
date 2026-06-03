import { join } from 'node:path';
import { success, warn } from '@devground/logger';
import { resolveOps } from './ops.js';
import type { InstallerOptions } from '../types.js';

export function install(options: InstallerOptions): void {
  const { targetDir, stack } = options;
  const ops = resolveOps(options);
  const configPath = join(targetDir, 'commitlint.config.js');

  if (ops.fileExists(configPath)) {
    warn(`Commitlint config skipped: ${configPath} already exists (left untouched).`);
    return;
  }

  ops.addDevDependency(targetDir, stack.packageManager, '@devground/commitlint-config', '@commitlint/cli');

  const configContent = `module.exports = { extends: ['@devground/commitlint-config'] };\n`;
  ops.writeFile(configPath, configContent);

  success('Commitlint configured with @devground/commitlint-config');
}
