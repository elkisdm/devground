import { addDevDependency } from '../utils/package-json.js';
import { run } from '../utils/exec.js';
import { success } from '../utils/logger.js';
import type { InstallerOptions } from '../types.js';

export function install(options: InstallerOptions): void {
  const { targetDir, stack } = options;

  addDevDependency(targetDir, stack.packageManager, '@devground/agents-md');
  run('npx devground-agents', targetDir);

  success('AGENTS.md and symlinks configured with @devground/agents-md');
}
