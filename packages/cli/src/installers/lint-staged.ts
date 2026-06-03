import { join } from 'node:path';
import { success, warn } from '@devground/logger';
import { resolveOps } from './ops.js';
import type { InstallerOptions } from '../types.js';

export function install(options: InstallerOptions): void {
  const { targetDir, stack } = options;
  const ops = resolveOps(options);
  const configPath = join(targetDir, 'lint-staged.config.cjs');

  if (ops.fileExists(configPath)) {
    warn(`lint-staged config skipped: ${configPath} already exists (left untouched).`);
    return;
  }

  ops.addDevDependency(targetDir, stack.packageManager, '@devground/lint-staged-config', 'lint-staged');

  // Unlike Prettier (whose loader resolves a string value as a shared-config
  // module name), lint-staged does NOT resolve a string — it rejects it at
  // runtime ("config should be an object or a function"). So we write a config
  // file that re-exports the shared rules instead of a bare package.json string.
  // `.cjs` forces CommonJS regardless of the project's package.json "type",
  // matching the CommonJS export of @devground/lint-staged-config.
  const configContent = `module.exports = require('@devground/lint-staged-config');\n`;
  ops.writeFile(configPath, configContent);

  success('lint-staged configured with @devground/lint-staged-config');
}
