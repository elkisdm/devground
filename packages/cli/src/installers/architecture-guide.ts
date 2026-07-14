import { success, warn } from '@devground/logger';
import { resolveOps } from './ops.js';
import { delegateWrote } from './delegate.js';
import type { InstallerOptions, InstallResult } from '../types.js';

export function install(options: InstallerOptions): InstallResult {
  const { targetDir, stack } = options;
  const ops = resolveOps(options);

  ops.addDevDependency(targetDir, stack.packageManager, '@devground/architecture-guide');
  const output = ops.run('npx devground-architecture', targetDir);

  if (!delegateWrote(output)) {
    warn('Architecture knowledge base skipped: knowledge/ already exists (left untouched).');
    return 'skipped';
  }

  success('Architecture knowledge base installed at knowledge/');
  return 'installed';
}
