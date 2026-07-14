import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Reads the `version` field from the package.json in `dir`. Single source of
 *  truth for the CLI version — a literal drifts from the manifest on release. */
export function readVersion(dir: string): string {
  const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8')) as {
    version: string;
  };
  return manifest.version;
}
