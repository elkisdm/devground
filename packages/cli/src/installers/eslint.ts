import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { addDevDependency } from '../utils/package-json.js';
import { success } from '../utils/logger.js';
import type { InstallerOptions } from '../types.js';

export function install(options: InstallerOptions): void {
  const { targetDir, stack } = options;
  const isNext = stack.framework === 'nextjs';

  const packages = isNext
    ? ['@devground/eslint-config', 'eslint', 'eslint-config-next']
    : ['@devground/eslint-config', 'eslint'];

  addDevDependency(targetDir, stack.packageManager, ...packages);

  const configContent = isNext
    ? `import nextConfig from '@devground/eslint-config/next';\nexport default nextConfig();\n`
    : `import baseConfig from '@devground/eslint-config';\nexport default baseConfig();\n`;

  writeFileSync(join(targetDir, 'eslint.config.mjs'), configContent, 'utf-8');

  success('ESLint configured with @devground/eslint-config' + (isNext ? '/next' : ''));
}
