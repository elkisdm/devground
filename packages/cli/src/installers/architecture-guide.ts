import { success } from '../utils/logger.js';
import { resolveOps } from './ops.js';
import type { InstallerOptions } from '../types.js';

export function install(options: InstallerOptions): void {
  const { targetDir, stack } = options;
  const ops = resolveOps(options);

  ops.addDevDependency(targetDir, stack.packageManager, '@devground/architecture-guide');
  ops.run('npx devground-architecture', targetDir);

  success('Architecture knowledge base installed at knowledge/');
}
