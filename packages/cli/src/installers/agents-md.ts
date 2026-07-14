import { success, warn } from '@devground/logger';
import { resolveOps } from './ops.js';
import { delegateWrote } from './delegate.js';
import type { InstallerOptions, InstallResult } from '../types.js';

export function install(options: InstallerOptions): InstallResult {
  const { targetDir, stack } = options;
  const ops = resolveOps(options);

  ops.addDevDependency(targetDir, stack.packageManager, '@devground/agents-md');
  const output = ops.run('npx devground-agents', targetDir);

  if (!delegateWrote(output)) {
    warn('AGENTS.md skipped: already present (left untouched).');
    return 'skipped';
  }

  success('AGENTS.md and symlinks configured with @devground/agents-md');
  return 'installed';
}
