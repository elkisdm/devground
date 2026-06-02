import { success } from '../utils/logger.js';
import { resolveOps } from './ops.js';
import type { InstallerOptions } from '../types.js';

export function install(options: InstallerOptions): void {
  const { targetDir, stack } = options;
  const ops = resolveOps(options);

  ops.addDevDependency(targetDir, stack.packageManager, '@devground/lint-staged-config', 'lint-staged');

  const pkg = ops.readPackageJson(targetDir);
  pkg['lint-staged'] = '@devground/lint-staged-config';
  ops.writePackageJson(targetDir, pkg);

  success('lint-staged configured with @devground/lint-staged-config');
}
