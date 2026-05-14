#!/usr/bin/env node

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const targetDir = process.cwd();
const huskyDir = path.join(targetDir, '.husky');
const pkgPath = path.join(targetDir, 'package.json');

function log(msg) {
  console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
}

function warn(msg) {
  console.log(`  \x1b[33m!\x1b[0m ${msg}`);
}

// Initialize husky
try {
  execSync('npx husky init', { cwd: targetDir, stdio: 'pipe' });
  log('Initialized husky');
} catch {
  if (fs.existsSync(huskyDir)) {
    warn('Husky already initialized');
  } else {
    throw new Error('Failed to initialize husky. Is it installed?');
  }
}

// Copy pre-commit hook
const hookSource = path.join(__dirname, 'hooks', 'pre-commit.sh');
const hookDest = path.join(huskyDir, 'pre-commit');
const hookContent = fs.readFileSync(hookSource, 'utf8');
fs.writeFileSync(hookDest, hookContent, { mode: 0o755 });
log('Wrote .husky/pre-commit');

// Ensure "prepare": "husky" in package.json
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (!pkg.scripts) pkg.scripts = {};
  if (pkg.scripts.prepare !== 'husky') {
    pkg.scripts.prepare = 'husky';
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    log('Added "prepare": "husky" to package.json');
  }
}

console.log('\n  Husky configured. Pre-commit hook will run lint-staged.\n');
