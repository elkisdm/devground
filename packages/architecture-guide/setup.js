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

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, dstPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

const sourceDir = path.join(__dirname, 'knowledge');
const destDir = path.join(targetDir, 'knowledge');

if (!fs.existsSync(sourceDir)) {
  console.error('\x1b[31m✗\x1b[0m knowledge/ not found in package. Aborting.');
  process.exit(1);
}

if (fs.existsSync(destDir)) {
  warn('knowledge/ already exists — skipping (delete to reinstall)');
  process.exit(0);
}

copyDir(sourceDir, destDir);

log('Installed knowledge/ at project root');
info('Read knowledge/README.md to navigate');
info('Read knowledge/BEST-PRACTICES.md before starting a new project');
info('Use `npx devground-adr new "<title>"` to create a new ADR');
