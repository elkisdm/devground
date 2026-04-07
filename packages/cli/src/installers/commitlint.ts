import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { addDevDependency } from '../utils/package-json.js';
import { success } from '../utils/logger.js';
import type { InstallerOptions } from '../types.js';

export function install(options: InstallerOptions): void {
  const { targetDir, stack } = options;

  addDevDependency(targetDir, stack.packageManager, '@devground/commitlint-config', '@commitlint/cli');

  const configContent = `module.exports = { extends: ['@devground/commitlint-config'] };\n`;
  writeFileSync(join(targetDir, 'commitlint.config.js'), configContent, 'utf-8');

  success('Commitlint configured with @devground/commitlint-config');
}
