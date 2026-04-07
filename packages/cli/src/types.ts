export type Framework = 'nextjs' | 'react' | 'node' | 'unknown';
export type PackageManager = 'pnpm' | 'yarn' | 'npm';

export interface DetectedStack {
  framework: Framework;
  hasTypeScript: boolean;
  packageManager: PackageManager;
}

export interface InstallerOptions {
  targetDir: string;
  stack: DetectedStack;
}
