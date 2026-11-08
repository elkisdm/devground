import { success, warn } from '@devground/logger';
import { resolveOps } from './ops.js';
import { findExistingConfig, withExts } from './config-detect.js';
import type { InstallerOptions, InstallResult } from '../types.js';

export function install(options: InstallerOptions): InstallResult {
  const { targetDir, stack } = options;
  const ops = resolveOps(options);

  const pkg = ops.readPackageJson(targetDir);

  // Don't clobber an existing Prettier config (honors "no sobreescribe nada
  // existente"), and skip before installing the dependency so we don't leave a
  // dirty tree. Prettier resolves a string value as a shared-config module, so
  // the package.json key is the correct mechanism here.
  // Ojo: Prettier busca primero la clave de package.json, así que agregarla con
  // un `.prettierrc` presente haría que la config del usuario dejara de aplicarse.
  const existing = findExistingConfig(ops, targetDir, {
    files: [
      '.prettierrc',
      ...withExts('.prettierrc', [
        'json',
        'json5',
        'yaml',
        'yml',
        'toml',
        'js',
        'cjs',
        'mjs',
        'ts',
        'cts',
        'mts',
      ]),
      ...withExts('prettier.config', ['js', 'cjs', 'mjs', 'ts', 'cts', 'mts']),
    ],
    pkgKey: 'prettier',
  });
  if (existing) {
    warn(`Prettier config skipped: ${existing} already exists (left untouched).`);
    return 'skipped';
  }

  ops.addDevDependency(targetDir, stack.packageManager, '@devground/prettier-config', 'prettier');

  pkg.prettier = '@devground/prettier-config';
  ops.writePackageJson(targetDir, pkg);

  success('Prettier configured with @devground/prettier-config');
  return 'installed';
}
