#!/usr/bin/env node

/**
 * Installs the dreaming skill into a Claude Code skills directory.
 *
 *   npx @devground/dreaming            -> <cwd>/.claude/skills/dreaming  (this project)
 *   npx @devground/dreaming --global   -> ~/.claude/skills/dreaming      (all projects)
 *
 * Existing files are never overwritten — your local edits to the skill are
 * preserved, only missing files are added (re-run after upgrading to add new
 * reference files). The bundled deterministic harness (scripts/dream-gather.py)
 * is installed alongside SKILL.md and needs Python 3 on your PATH to run.
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
const src = path.join(__dirname, 'skill');
const dst = path.join(baseDir, '.claude', 'skills', 'dreaming');

if (!fs.existsSync(src)) {
  console.error('\x1b[31m✗\x1b[0m skill/ not found in package. Aborting.');
  process.exit(1);
}

const { written, skipped } = copyDirGuarded(src, dst);
const scope = global ? 'global (~/.claude/skills/dreaming)' : 'project (.claude/skills/dreaming)';
if (written > 0) log(`dreaming installed — ${scope} — ${written} file(s)`);
if (skipped > 0) warn(`${skipped} file(s) already existed (kept your version)`);
if (written === 0 && skipped > 0) info('Already up to date.');

info('Run /dreaming (or say "consolida la memoria") to review a project\'s memory out of band.');
info('It proposes a reviewed diff — nothing is written to memory without your approval.');
info('Needs Python 3 on PATH for the gather harness (scripts/dream-gather.py).');
