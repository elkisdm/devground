'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Copies a directory tree, never overwriting a file that already exists at the
 * destination.
 *
 * This guard is the package's core promise: re-running the installer after an
 * upgrade pulls in new files without clobbering local edits to a skill. It lives
 * in its own module (rather than inline in `setup.js`) so it can be tested —
 * `setup.js` runs its work at import time, so anything defined there is
 * untestable without executing the installer.
 *
 * Files left alone whose content differs from the package are reported in
 * `differs` (paths relative to `dst`): either an older installed version or a
 * local edit. The installer can't tell which, so it only warns — the user
 * decides whether to reinstall.
 *
 * @param {string} src Source directory.
 * @param {string} dst Destination directory (created if missing).
 * @param {string} [rel] Internal: path of `dst` relative to the top call.
 * @returns {{ written: number, skipped: number, differs: string[] }}
 */
function copyDirGuarded(src, dst, rel = '') {
  fs.mkdirSync(dst, { recursive: true });
  let written = 0;
  let skipped = 0;
  const differs = [];

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);

    if (entry.isDirectory()) {
      const sub = copyDirGuarded(srcPath, dstPath, path.join(rel, entry.name));
      written += sub.written;
      skipped += sub.skipped;
      differs.push(...sub.differs);
    } else if (entry.isFile()) {
      if (fs.existsSync(dstPath)) {
        skipped++;
        if (!fs.readFileSync(dstPath).equals(fs.readFileSync(srcPath))) {
          differs.push(path.join(rel, entry.name));
        }
      } else {
        fs.copyFileSync(srcPath, dstPath);
        written++;
      }
    }
  }

  return { written, skipped, differs };
}

module.exports = { copyDirGuarded };
