import type { InstallerOps, PackageManager } from '../types.js';

/** One recorded `addDevDependency` invocation. */
export interface DevDepCall {
  dir: string;
  pm: PackageManager;
  packages: string[];
}

/** One recorded file write. */
export interface WriteCall {
  path: string;
  content: string;
}

/** One recorded shell invocation. */
export interface RunCall {
  cmd: string;
  cwd: string;
}

/**
 * A fully in-memory {@link InstallerOps} that records every side-effect instead
 * of performing it. `readPackageJson` is backed by a mutable map so installers
 * that read-modify-write package.json (prettier, lint-staged) round-trip
 * correctly. Mirrors how dev-metrics injects a fake `run`.
 *
 * `runOutput` is what `ops.run` returns for every call — used to simulate a
 * delegated bin's captured stdout (e.g. a "✓ Wrote ..." line) in installer
 * status tests.
 */
export function makeRecordingOps(
  initialPkg: Record<string, unknown> = {},
  existingFiles: string[] = [],
  runOutput = '',
): {
  ops: InstallerOps;
  devDeps: DevDepCall[];
  writes: WriteCall[];
  runs: RunCall[];
  pkg: () => Record<string, unknown>;
} {
  const devDeps: DevDepCall[] = [];
  const writes: WriteCall[] = [];
  const runs: RunCall[] = [];
  let pkg: Record<string, unknown> = { ...initialPkg };

  const ops: InstallerOps = {
    addDevDependency: (dir, pm, ...packages) => {
      devDeps.push({ dir, pm, packages });
    },
    readPackageJson: () => ({ ...pkg }),
    writePackageJson: (_dir, data) => {
      pkg = { ...data };
    },
    writeFile: (path, content) => {
      writes.push({ path, content });
    },
    fileExists: (path) => existingFiles.includes(path),
    run: (cmd, cwd) => {
      runs.push({ cmd, cwd });
      return runOutput;
    },
  };

  return { ops, devDeps, writes, runs, pkg: () => pkg };
}
