#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const pkgRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(pkgRoot, '..', '..');

const source = path.join(repoRoot, 'knowledge');
const dest = path.join(pkgRoot, 'knowledge');

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

if (!fs.existsSync(source)) {
  console.error(`✗ knowledge/ not found at repo root: ${source}`);
  process.exit(1);
}

if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true, force: true });
}

copyDir(source, dest);
console.log(`✓ Synced knowledge/ from repo root → packages/architecture-guide/knowledge/`);
