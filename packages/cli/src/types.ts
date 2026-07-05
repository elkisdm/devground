export type Framework = 'nextjs' | 'react' | 'node' | 'unknown';
export type PackageManager = 'pnpm' | 'yarn' | 'npm';

export interface DetectedStack {
  framework: Framework;
  hasTypeScript: boolean;
  packageManager: PackageManager;
  /**
   * Whether the target is a Swift/iOS project (a `Package.swift`, `.xcodeproj`,
   * or `.xcworkspace` is present). Independent of the Node signals: a repo can
   * be Swift-only (no package.json), Node-only, or both (ADR-0021).
   */
  hasSwift: boolean;
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

/**
 * Outcome of an installer run. `'installed'` means it wrote at least one
 * artifact; `'skipped'` means it respected pre-existing config and did nothing.
 * A thrown error means the install failed. The CLI tallies these honestly
 * instead of counting skips as successes.
 */
export type InstallResult = 'installed' | 'skipped';
