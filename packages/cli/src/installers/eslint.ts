import { join } from 'node:path';
import { success } from '@devground/logger';
import { resolveOps } from './ops.js';
import type { InstallerOptions } from '../types.js';

export function install(options: InstallerOptions): void {
  const { targetDir, stack } = options;
  const ops = resolveOps(options);
  const isNext = stack.framework === 'nextjs';

  const packages = isNext
    ? ['@devground/eslint-config', 'eslint', 'eslint-config-next']
    : ['@devground/eslint-config', 'eslint'];

  ops.addDevDependency(targetDir, stack.packageManager, ...packages);

  const configContent = isNext
    ? `import nextConfig from '@devground/eslint-config/next';\nexport default nextConfig();\n`
    : `import baseConfig from '@devground/eslint-config';\nexport default baseConfig();\n`;

  ops.writeFile(join(targetDir, 'eslint.config.mjs'), configContent);

  success('ESLint configured with @devground/eslint-config' + (isNext ? '/next' : ''));
}
