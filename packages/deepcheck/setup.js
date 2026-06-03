#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const targetDir = process.cwd();

function log(msg) {
  console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
}
function warn(msg) {
  console.log(`  \x1b[33m!\x1b[0m ${msg}`);
}
function info(msg) {
  console.log(`  \x1b[36m→\x1b[0m ${msg}`);
}

/** Copies a directory tree, skipping files that already exist (no sobreescribe). */
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

const installs = [
  { src: path.join(__dirname, 'skills', 'deepcheck'), dst: path.join(targetDir, '.claude', 'skills', 'deepcheck'), label: 'skill orquestadora (.claude/skills/deepcheck)' },
  { src: path.join(__dirname, 'workflows'), dst: path.join(targetDir, '.claude', 'deepcheck', 'workflows'), label: 'workflow (.claude/deepcheck/workflows)' },
  { src: path.join(__dirname, 'templates'), dst: path.join(targetDir, '.claude', 'deepcheck', 'templates'), label: 'plantilla de skill destilada (.claude/deepcheck/templates)' },
];

for (const { src, dst, label } of installs) {
  if (!fs.existsSync(src)) {
    console.error(`\x1b[31m✗\x1b[0m ${src} no existe en el paquete. Abortando.`);
    process.exit(1);
  }
  const { written, skipped } = copyDirGuarded(src, dst);
  if (written > 0) log(`${label} — ${written} archivo(s)`);
  if (skipped > 0) warn(`${label} — ${skipped} archivo(s) ya existían (se respetan)`);
}

info('Invoca el skill `deepcheck` para auditar un flujo en profundidad.');
info('Lee .claude/skills/deepcheck/references/roles.md para la rúbrica de roles.');
