import { success } from '@devground/logger';
import { resolveOps } from './ops.js';
import type { InstallerOptions } from '../types.js';

export function install(options: InstallerOptions): void {
  const { targetDir, stack } = options;
  const ops = resolveOps(options);

  ops.addDevDependency(targetDir, stack.packageManager, '@devground/prettier-config', 'prettier');

  const pkg = ops.readPackageJson(targetDir);
  pkg.prettier = '@devground/prettier-config';
  ops.writePackageJson(targetDir, pkg);

  success('Prettier configured with @devground/prettier-config');
}
