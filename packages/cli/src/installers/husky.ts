import { success } from '@devground/logger';
import { resolveOps } from './ops.js';
import type { InstallerOptions, InstallResult } from '../types.js';

export function install(options: InstallerOptions): InstallResult {
  const { targetDir, stack } = options;
  const ops = resolveOps(options);

  ops.addDevDependency(targetDir, stack.packageManager, '@devground/husky-config', 'husky');
  ops.run('npx devground-husky', targetDir);

  success('Husky hooks configured with @devground/husky-config');
  return 'installed';
}
