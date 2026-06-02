import { writeFileSync } from 'node:fs';
import {
  addDevDependency,
  readPackageJson,
  writePackageJson,
} from '../utils/package-json.js';
import { run } from '../utils/exec.js';
import type { InstallerOps, InstallerOptions } from '../types.js';

/**
 * Real, side-effecting installer operations: actual filesystem writes and
 * package-manager invocations. Installers receive these by default; tests pass
 * a fake {@link InstallerOps} instead to assert behaviour without touching the
 * real environment.
 */
export const defaultInstallerOps: InstallerOps = {
  addDevDependency,
  readPackageJson,
  writePackageJson,
  writeFile: (path, content) => writeFileSync(path, content, 'utf-8'),
  run,
};

/** Resolves the ops bundle from installer options, defaulting to the real one. */
export function resolveOps(options: InstallerOptions): InstallerOps {
  return options.ops ?? defaultInstallerOps;
}
