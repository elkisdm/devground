import { success } from '@devground/logger';
import { resolveOps } from './ops.js';
import type { InstallerOptions, InstallResult } from '../types.js';

export function install(options: InstallerOptions): InstallResult {
  const { targetDir, stack } = options;
  const ops = resolveOps(options);

  ops.addDevDependency(targetDir, stack.packageManager, '@devground/agents-md');
  ops.run('npx devground-agents', targetDir);

  success('AGENTS.md and symlinks configured with @devground/agents-md');
  return 'installed';
}
