import { success, warn } from '@devground/logger';
import { resolveOps } from './ops.js';
import { delegateWrote } from './delegate.js';
import type { InstallerOptions, InstallResult } from '../types.js';

export function install(options: InstallerOptions): InstallResult {
  const { targetDir, stack } = options;
  const ops = resolveOps(options);

  ops.addDevDependency(targetDir, stack.packageManager, '@devground/husky-config', 'husky');
  const output = ops.run('npx devground-husky', targetDir);

  if (!delegateWrote(output)) {
    warn('Husky hooks skipped: all hooks already present (left untouched).');
    return 'skipped';
  }

  success('Husky hooks configured with @devground/husky-config');
  return 'installed';
}
