import { warn } from '@devground/logger';
import type { InstallerOps } from '../types.js';

/**
 * Writes `content` to `path` only if no file is already there. Honors the
 * README promise that devground-init "no sobreescribe nada existente": an
 * existing file is left untouched and the user is warned instead of having
 * their configuration silently truncated.
 *
 * @returns `true` if it wrote the file, `false` if it skipped an existing one.
 */
export function writeFileGuarded(
  ops: InstallerOps,
  path: string,
  content: string,
  label: string,
): boolean {
  if (ops.fileExists(path)) {
    warn(`${label} skipped: ${path} already exists (left untouched).`);
    return false;
  }
  ops.writeFile(path, content);
  return true;
}
