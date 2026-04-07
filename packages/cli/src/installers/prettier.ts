import { addDevDependency, readPackageJson, writePackageJson } from '../utils/package-json.js';
import { success } from '../utils/logger.js';
import type { InstallerOptions } from '../types.js';

export function install(options: InstallerOptions): void {
  const { targetDir, stack } = options;

  addDevDependency(targetDir, stack.packageManager, '@devground/prettier-config', 'prettier');

  const pkg = readPackageJson(targetDir);
  pkg.prettier = '@devground/prettier-config';
  writePackageJson(targetDir, pkg);

  success('Prettier configured with @devground/prettier-config');
}
