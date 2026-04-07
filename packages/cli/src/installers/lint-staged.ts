import { addDevDependency, readPackageJson, writePackageJson } from '../utils/package-json.js';
import { success } from '../utils/logger.js';
import type { InstallerOptions } from '../types.js';

export function install(options: InstallerOptions): void {
  const { targetDir, stack } = options;

  addDevDependency(targetDir, stack.packageManager, '@devground/lint-staged-config', 'lint-staged');

  const pkg = readPackageJson(targetDir);
  pkg['lint-staged'] = '@devground/lint-staged-config';
  writePackageJson(targetDir, pkg);

  success('lint-staged configured with @devground/lint-staged-config');
}
