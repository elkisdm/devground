import { addDevDependency } from '../utils/package-json.js';
import { run } from '../utils/exec.js';
import { success } from '../utils/logger.js';
import type { InstallerOptions } from '../types.js';

export function install(options: InstallerOptions): void {
  const { targetDir, stack } = options;

  addDevDependency(targetDir, stack.packageManager, '@devground/husky-config', 'husky');
  run('npx devground-husky', targetDir);

  success('Husky hooks configured with @devground/husky-config');
}
