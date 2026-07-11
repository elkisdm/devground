#!/usr/bin/env node

/**
 * Installs the ui-conventions skill into a Claude Code skills directory.
 *
 *   npx @devground/ui-conventions            -> <cwd>/.claude/skills/  (this project)
 *   npx @devground/ui-conventions --global   -> ~/.claude/skills/      (all projects)
 *
 * Each skill lands in its own directory (matching its frontmatter `name`).
 * Existing files are never overwritten — your local edits to a skill are
 * preserved, only missing files are added (re-run after upgrading to pull in
 * new skills or reference files).
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

function log(msg) {
  console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
}
function warn(msg) {
  console.log(`  \x1b[33m!\x1b[0m ${msg}`);
}
function info(msg) {
  console.log(`  \x1b[36m→\x1b[0m ${msg}`);
}

/** Copies a tree, skipping files that already exist at the destination. */
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

const global = process.argv.includes('--global');
const baseDir = global ? os.homedir() : process.cwd();
const src = path.join(__dirname, 'skills');
const dstRoot = path.join(baseDir, '.claude', 'skills');

if (!fs.existsSync(src)) {
  console.error('\x1b[31m✗\x1b[0m skills/ not found in package. Aborting.');
  process.exit(1);
}

// Only directories under skills/ are actual skills; loose files
// would be packaging metadata, not skills.
const skillDirs = fs
  .readdirSync(src, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

let written = 0;
let skipped = 0;
const installed = [];
for (const name of skillDirs) {
  const res = copyDirGuarded(path.join(src, name), path.join(dstRoot, name));
  written += res.written;
  skipped += res.skipped;
  if (res.written > 0) installed.push(name);
}

const scope = global ? 'global (~/.claude/skills)' : 'project (.claude/skills)';
if (written > 0) {
  log(`ui-conventions installed — ${scope} — ${written} file(s)`);
  info(`skills: ${installed.join(', ')}`);
}
if (skipped > 0) warn(`${skipped} file(s) already existed (kept your version)`);
if (written === 0 && skipped > 0) info('Already up to date.');

info('Loads before you generate UI: universal conventions + your project overlay if');
info('docs/ui-conventions.md exists.');
