import { success, warn } from '@devground/logger';
import { resolveOps } from './ops.js';
import type { InstallerOptions } from '../types.js';

export function install(options: InstallerOptions): void {
  const { targetDir, stack } = options;
  const ops = resolveOps(options);

  const pkg = ops.readPackageJson(targetDir);

  // Don't clobber an existing Prettier config (honors "no sobreescribe nada
  // existente"), and skip before installing the dependency so we don't leave a
  // dirty tree. Prettier resolves a string value as a shared-config module, so
  // the package.json key is the correct mechanism here.
  if ('prettier' in pkg) {
    warn('Prettier config skipped: a "prettier" key already exists in package.json (left untouched).');
    return;
  }

  ops.addDevDependency(targetDir, stack.packageManager, '@devground/prettier-config', 'prettier');

  pkg.prettier = '@devground/prettier-config';
  ops.writePackageJson(targetDir, pkg);

  success('Prettier configured with @devground/prettier-config');
}
