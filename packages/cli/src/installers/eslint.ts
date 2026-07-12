import { join } from 'node:path';
import { success, warn } from '@devground/logger';
import { resolveOps } from './ops.js';
import type { InstallerOptions, InstallResult } from '../types.js';

export function install(options: InstallerOptions): InstallResult {
  const { targetDir, stack } = options;
  const ops = resolveOps(options);
  const configPath = join(targetDir, 'eslint.config.mjs');

  // Honor "no sobreescribe nada existente": if the config is already there,
  // skip the whole installer — including the dependency install — so we don't
  // leave a dirty tree while claiming to have left things untouched.
  if (ops.fileExists(configPath)) {
    warn(`ESLint config skipped: ${configPath} already exists (left untouched).`);
    return 'skipped';
  }

  let packages: string[];
  let configContent: string;
  let label: string;

  switch (stack.framework) {
    case 'nextjs':
      packages = ['@devground/eslint-config', 'eslint', 'eslint-config-next'];
      configContent = `import nextConfig from '@devground/eslint-config/next';\nexport default nextConfig();\n`;
      label = '/next';
      break;

    case 'astro':
      packages = ['@devground/eslint-config', 'eslint', 'eslint-plugin-astro'];
      configContent = `import astroConfig from '@devground/eslint-config/astro';\nexport default astroConfig();\n`;
      label = '/astro';
      break;

    default:
      packages = ['@devground/eslint-config', 'eslint'];
      configContent = `import baseConfig from '@devground/eslint-config';\nexport default baseConfig();\n`;
      label = '';
  }

  ops.addDevDependency(targetDir, stack.packageManager, ...packages);
  ops.writeFile(configPath, configContent);

  success(`ESLint configured with @devground/eslint-config${label}`);
  return 'installed';
}
