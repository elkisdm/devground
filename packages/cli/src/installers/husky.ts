import { success } from '../utils/logger.js';
import { resolveOps } from './ops.js';
import type { InstallerOptions } from '../types.js';

export function install(options: InstallerOptions): void {
  const { targetDir, stack } = options;
  const ops = resolveOps(options);

  ops.addDevDependency(targetDir, stack.packageManager, '@devground/husky-config', 'husky');
  ops.run('npx devground-husky', targetDir);

  success('Husky hooks configured with @devground/husky-config');
}
