import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { run } from './exec.js';
import type { PackageManager } from '../types.js';

/**
 * Reads and parses the package.json from the given directory.
 *
 * Validates that the parsed value is a plain object. A package.json that is
 * valid JSON but not an object (array, scalar, null) would otherwise corrupt
 * downstream consumers: `'prettier' in pkg` throws a misleading TypeError on a
 * scalar, an array passes the guard then loses all content on stringify, and
 * `null` reads as a missing file. Centralizing the defense here keeps every
 * installer simple.
 */
export function readPackageJson(dir: string): Record<string, unknown> {
  const filePath = join(dir, 'package.json');
  const raw = readFileSync(filePath, 'utf-8');
  const parsed: unknown = JSON.parse(raw);

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    const got = parsed === null ? 'null' : Array.isArray(parsed) ? 'array' : typeof parsed;
    throw new Error(`package.json is not a valid object (got ${got})`);
  }

  return parsed as Record<string, unknown>;
}

/**
 * Writes a JSON object back to package.json with 2-space indentation.
 */
export function writePackageJson(dir: string, data: Record<string, unknown>): void {
  const filePath = join(dir, 'package.json');
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

/**
 * Returns the install command prefix for dev dependencies
 * based on the detected package manager.
 */
function getInstallCmd(pm: PackageManager): string {
  switch (pm) {
    case 'pnpm':
      return 'pnpm add -D';
    case 'yarn':
      return 'yarn add -D';
    case 'npm':
      return 'npm install -D';
  }
}

/**
 * Installs one or more packages as dev dependencies using the detected package manager.
 */
export function addDevDependency(dir: string, pm: PackageManager, ...packages: string[]): void {
  const cmd = `${getInstallCmd(pm)} ${packages.join(' ')}`;
  run(cmd, dir);
}
