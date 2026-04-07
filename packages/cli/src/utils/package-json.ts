import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { run } from './exec.js';
import type { PackageManager } from '../types.js';

/**
 * Reads and parses the package.json from the given directory.
 */
export function readPackageJson(dir: string): Record<string, unknown> {
  const filePath = join(dir, 'package.json');
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as Record<string, unknown>;
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
