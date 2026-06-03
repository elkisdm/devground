export type Framework = 'nextjs' | 'react' | 'node' | 'unknown';
export type PackageManager = 'pnpm' | 'yarn' | 'npm';

export interface DetectedStack {
  framework: Framework;
  hasTypeScript: boolean;
  packageManager: PackageManager;
}

/**
 * Side-effecting operations an installer performs. Injected so installers can
 * be unit-tested without mutating the real filesystem or shelling out — the
 * same pattern dev-metrics uses with its injectable `run`. In production these
 * default to real implementations (see {@link defaultInstallerOps}).
 */
export interface InstallerOps {
  /** Adds dev dependencies via the detected package manager (no-op-safe in tests). */
  addDevDependency: (dir: string, pm: PackageManager, ...packages: string[]) => void;
  /** Reads and parses a package.json from `dir`. */
  readPackageJson: (dir: string) => Record<string, unknown>;
  /** Writes a package.json object to `dir` with 2-space indentation. */
  writePackageJson: (dir: string, data: Record<string, unknown>) => void;
  /** Writes a file at an absolute path. */
  writeFile: (path: string, content: string) => void;
  /** Returns whether a file already exists at an absolute path. */
  fileExists: (path: string) => boolean;
  /** Runs a shell command in `cwd`, returning trimmed stdout. */
  run: (cmd: string, cwd: string) => string;
}

export interface InstallerOptions {
  targetDir: string;
  stack: DetectedStack;
  /** Injectable side-effects. Defaults to real FS/exec when omitted. */
  ops?: InstallerOps;
}
