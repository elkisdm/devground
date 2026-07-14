import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readPackageJson } from './utils/package-json.js';
import type { DetectedStack, Framework, PackageManager } from './types.js';

/**
 * Detects the project stack by inspecting package.json and lock files.
 * Resilient to a missing package.json (returns an "unknown" framework instead
 * of throwing) so a non-JS repo is classified rather than crashing.
 */
export function detectStack(targetDir: string): DetectedStack {
  const pkg = readPackageJsonSafe(targetDir);

  const deps = (pkg.dependencies ?? {}) as Record<string, string>;
  const devDeps = (pkg.devDependencies ?? {}) as Record<string, string>;
  const allDeps = { ...deps, ...devDeps };

  const framework = detectFramework(allDeps);
  const hasTypeScript = 'typescript' in allDeps;
  const packageManager = detectPackageManager(targetDir);

  return { framework, hasTypeScript, packageManager };
}

/**
 * Reads package.json, tolerating its absence (returns `{}`) so a repo without
 * a package.json doesn't crash detection. A present-but-malformed package.json
 * still throws — that's a real error worth surfacing, not a missing-file case.
 */
function readPackageJsonSafe(dir: string): Record<string, unknown> {
  if (!existsSync(join(dir, 'package.json'))) return {};
  return readPackageJson(dir);
}

function detectFramework(allDeps: Record<string, string>): Framework {
  if ('next' in allDeps) return 'nextjs';
  if ('astro' in allDeps) return 'astro';
  if ('react' in allDeps) return 'react';
  if (Object.keys(allDeps).length > 0) return 'node';
  return 'unknown';
}

function detectPackageManager(dir: string): PackageManager {
  if (existsSync(join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(dir, 'yarn.lock'))) return 'yarn';
  return 'npm';
}
