import { success } from '@devground/logger';
import { resolveOps } from './ops.js';
import type { InstallerOptions, InstallResult } from '../types.js';

export function install(options: InstallerOptions): InstallResult {
  const { targetDir, stack } = options;
  const ops = resolveOps(options);

  ops.addDevDependency(targetDir, stack.packageManager, '@devground/architecture-guide');
  ops.run('npx devground-architecture', targetDir);

  success('Architecture knowledge base installed at knowledge/');
  return 'installed';
}
