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
 * @param {string} src Source directory.
 * @param {string} dst Destination directory (created if missing).
 * @returns {{ written: number, skipped: number }} Files copied vs. left alone.
 */
function copyDirGuarded(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  let written = 0;
  let skipped = 0;

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);

    if (entry.isDirectory()) {
      const sub = copyDirGuarded(srcPath, dstPath);
      written += sub.written;
      skipped += sub.skipped;
    } else if (entry.isFile()) {
      if (fs.existsSync(dstPath)) {
        skipped++;
      } else {
        fs.copyFileSync(srcPath, dstPath);
        written++;
      }
    }
  }

  return { written, skipped };
}

module.exports = { copyDirGuarded };
