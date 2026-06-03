import { join } from 'node:path';
import { success, warn } from '@devground/logger';
import { resolveOps } from './ops.js';
import type { InstallerOptions, InstallResult } from '../types.js';

export function install(options: InstallerOptions): InstallResult {
  const { targetDir, stack } = options;
  const ops = resolveOps(options);
  const isNext = stack.framework === 'nextjs';
  const configPath = join(targetDir, 'eslint.config.mjs');

  // Honor "no sobreescribe nada existente": if the config is already there,
  // skip the whole installer — including the dependency install — so we don't
  // leave a dirty tree while claiming to have left things untouched.
  if (ops.fileExists(configPath)) {
    warn(`ESLint config skipped: ${configPath} already exists (left untouched).`);
    return 'skipped';
  }

  const packages = isNext
    ? ['@devground/eslint-config', 'eslint', 'eslint-config-next']
    : ['@devground/eslint-config', 'eslint'];

  ops.addDevDependency(targetDir, stack.packageManager, ...packages);

  const configContent = isNext
    ? `import nextConfig from '@devground/eslint-config/next';\nexport default nextConfig();\n`
    : `import baseConfig from '@devground/eslint-config';\nexport default baseConfig();\n`;

  ops.writeFile(configPath, configContent);

  success('ESLint configured with @devground/eslint-config' + (isNext ? '/next' : ''));
  return 'installed';
}
