import { join } from 'node:path';
import { success } from '../utils/logger.js';
import { resolveOps } from './ops.js';
import type { InstallerOptions } from '../types.js';

export function install(options: InstallerOptions): void {
  const { targetDir, stack } = options;
  const ops = resolveOps(options);

  ops.addDevDependency(targetDir, stack.packageManager, '@devground/commitlint-config', '@commitlint/cli');

  const configContent = `module.exports = { extends: ['@devground/commitlint-config'] };\n`;
  ops.writeFile(join(targetDir, 'commitlint.config.js'), configContent);

  success('Commitlint configured with @devground/commitlint-config');
}
