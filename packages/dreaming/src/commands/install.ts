import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface InstallResult {
  written: number;
  skipped: number;
  dest: string;
}

/** Copies a tree, skipping files that already exist at the destination. */
function copyDirGuarded(src: string, dst: string): { written: number; skipped: number } {
  mkdirSync(dst, { recursive: true });
  let written = 0;
  let skipped = 0;
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, entry.name);
    const dstPath = join(dst, entry.name);
    if (entry.isDirectory()) {
      const sub = copyDirGuarded(srcPath, dstPath);
      written += sub.written;
      skipped += sub.skipped;
    } else if (entry.isFile()) {
      if (existsSync(dstPath)) skipped++;
      else {
        copyFileSync(srcPath, dstPath);
        written++;
      }
    }
  }
  return { written, skipped };
}

/**
 * Installs the bundled `skill/` into a Claude Code skills dir. Never overwrites
 * existing files (your local edits survive; re-run to add new files).
 * The package ships `dist/` and `skill/` as siblings, so the skill source is at
 * `<dist>/../skill`.
 */
export function install(opts: { global: boolean }): InstallResult {
  // __dirname is dist/commands at runtime; skill/ ships as a sibling of dist/.
  const src = join(__dirname, '..', '..', 'skill');
  if (!existsSync(src)) throw new Error(`skill/ not found at ${src}. Aborting.`);
  const baseDir = opts.global ? homedir() : process.cwd();
  const dest = join(baseDir, '.claude', 'skills', 'dreaming');
  const { written, skipped } = copyDirGuarded(src, dest);
  return { written, skipped, dest };
}
