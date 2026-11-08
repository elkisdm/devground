#!/usr/bin/env node

/**
 * Installs the rueditas skill into a Claude Code skills directory.
 *
 *   npx @devground/rueditas            -> <cwd>/.claude/skills/  (this project)
 *   npx @devground/rueditas --global   -> ~/.claude/skills/      (all projects)
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

const { copyDirGuarded } = require('./lib/copy-guarded.js');

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
const differs = [];
for (const name of skillDirs) {
  const res = copyDirGuarded(path.join(src, name), path.join(dstRoot, name));
  written += res.written;
  skipped += res.skipped;
  differs.push(...res.differs.map((f) => path.join(name, f)));
  if (res.written > 0) installed.push(name);
}

const scope = global ? 'global (~/.claude/skills)' : 'project (.claude/skills)';
if (written > 0) {
  log(`rueditas installed — ${scope} — ${written} file(s)`);
  info(`skills: ${installed.join(', ')}`);
}
if (skipped > 0) warn(`${skipped} file(s) already existed (kept your version)`);
if (differs.length > 0) {
  // Mensaje para quien usa la skill, no para quien la mantiene: en español.
  const where = global ? '~/.claude/skills/rueditas/' : '.claude/skills/rueditas/';
  const cmd = global ? 'npx @devground/rueditas --global' : 'npx @devground/rueditas';
  warn(`La skill instalada no coincide con esta versión (${differs.length} archivo(s) distintos: ${differs.slice(0, 3).join(', ')}${differs.length > 3 ? ', …' : ''}).`);
  info('Puede ser una versión anterior o cambios tuyos. No se tocó nada.');
  info(`Para actualizar: borra ${where} y corre ${cmd}. Tu progreso en .devground/rueditas.md se conserva.`);
} else if (written === 0 && skipped > 0) {
  info('Already up to date.');
}

info('Claude te guía por 5 etapas. Para apagarlo, dile: «quita las rueditas».');
