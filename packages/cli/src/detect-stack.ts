import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { readPackageJson } from './utils/package-json.js';
import type { DetectedStack, Framework, PackageManager } from './types.js';

/**
 * Detects the project stack by inspecting package.json, lock files, and Swift
 * project markers. Resilient to a missing package.json so a Swift-only repo
 * (which may have none) is still classified instead of throwing (ADR-0021).
 */
export function detectStack(targetDir: string): DetectedStack {
  const pkg = readPackageJsonSafe(targetDir);

  const deps = (pkg.dependencies ?? {}) as Record<string, string>;
  const devDeps = (pkg.devDependencies ?? {}) as Record<string, string>;
  const allDeps = { ...deps, ...devDeps };

  const framework = detectFramework(allDeps);
  const hasTypeScript = 'typescript' in allDeps;
  const packageManager = detectPackageManager(targetDir);
  const hasSwift = detectSwift(targetDir);

  return { framework, hasTypeScript, packageManager, hasSwift };
}

/**
 * Reads package.json, tolerating its absence (returns `{}`) so a Swift-only
 * repo doesn't crash detection. A present-but-malformed package.json still
 * throws — that's a real error worth surfacing, not a missing-file case.
 */
function readPackageJsonSafe(dir: string): Record<string, unknown> {
  if (!existsSync(join(dir, 'package.json'))) return {};
  return readPackageJson(dir);
}

/** A Swift/iOS project is marked by a Package.swift or an Xcode project bundle. */
function detectSwift(dir: string): boolean {
  if (existsSync(join(dir, 'Package.swift'))) return true;
  try {
    return readdirSync(dir).some(
      (entry) => entry.endsWith('.xcodeproj') || entry.endsWith('.xcworkspace'),
    );
  } catch {
    return false;
  }
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
