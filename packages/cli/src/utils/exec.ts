import { execSync } from 'node:child_process';

/**
 * Runs a shell command synchronously and returns stdout as a trimmed string.
 * Throws on non-zero exit code.
 */
export function run(cmd: string, cwd: string): string {
  return execSync(cmd, { cwd, encoding: 'utf-8', stdio: 'pipe' }).trim();
}
