import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readPackageJson } from './utils/package-json.js';
import type { DetectedStack, Framework, PackageManager } from './types.js';

/**
 * Detects the project stack by inspecting package.json and lock files.
 */
export function detectStack(targetDir: string): DetectedStack {
  const pkg = readPackageJson(targetDir);

  const deps = (pkg.dependencies ?? {}) as Record<string, string>;
  const devDeps = (pkg.devDependencies ?? {}) as Record<string, string>;
  const allDeps = { ...deps, ...devDeps };

  const framework = detectFramework(allDeps);
  const hasTypeScript = 'typescript' in allDeps;
  const packageManager = detectPackageManager(targetDir);

  return { framework, hasTypeScript, packageManager };
}

function detectFramework(allDeps: Record<string, string>): Framework {
  if ('next' in allDeps) return 'nextjs';
  if ('react' in allDeps) return 'react';
  if (Object.keys(allDeps).length > 0) return 'node';
  return 'unknown';
}

function detectPackageManager(dir: string): PackageManager {
  if (existsSync(join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(dir, 'yarn.lock'))) return 'yarn';
  return 'npm';
}
