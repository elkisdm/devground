#!/usr/bin/env node

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function log(msg) {
  console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
}

function warn(msg) {
  console.log(`  \x1b[33m!\x1b[0m ${msg}`);
}

// Copy hooks (source name -> husky hook name)
const HOOKS = [
  ['pre-commit.sh', 'pre-commit'],
  ['commit-msg.sh', 'commit-msg'],
  ['pre-push.sh', 'pre-push'],
];

function installHooks(huskyDir) {
  for (const [source, dest] of HOOKS) {
    const hookSource = path.join(__dirname, 'hooks', source);
    const hookDest = path.join(huskyDir, dest);
    if (fs.existsSync(hookDest)) {
      warn(`.husky/${dest} ya existe — no se sobreescribe`);
      continue;
    }
    const hookContent = fs.readFileSync(hookSource, 'utf8');
    fs.writeFileSync(hookDest, hookContent, { mode: 0o755 });
    log(`Wrote .husky/${dest}`);
  }
}

// `husky init` on a fresh project writes its own placeholder .husky/pre-commit
// ("npm test"). That's not a real user hook — remove it (and only it, by exact
// content match) so installHooks() writes our actual hook instead of skipping
// it as "already exists".
function removeHuskyInitPlaceholder(huskyDir) {
  const placeholderPreCommit = path.join(huskyDir, 'pre-commit');
  if (fs.existsSync(placeholderPreCommit) && fs.readFileSync(placeholderPreCommit, 'utf8') === 'npm test\n') {
    fs.unlinkSync(placeholderPreCommit);
  }
}

function main() {
  const targetDir = process.cwd();
  const huskyDir = path.join(targetDir, '.husky');
  const pkgPath = path.join(targetDir, 'package.json');

  // Initialize husky
  try {
    execSync('npx husky init', { cwd: targetDir, stdio: 'pipe' });
    log('Initialized husky');
    removeHuskyInitPlaceholder(huskyDir);
  } catch {
    if (fs.existsSync(huskyDir)) {
      warn('Husky already initialized');
    } else {
      throw new Error('Failed to initialize husky. Is it installed?');
    }
  }

  installHooks(huskyDir);

  // Ensure "prepare": "husky" in package.json
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (!pkg.scripts) pkg.scripts = {};
    if (!pkg.scripts.prepare) {
      pkg.scripts.prepare = 'husky';
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
      log('Added "prepare": "husky" to package.json');
    } else if (!/\bhusky\b/.test(pkg.scripts.prepare)) {
      warn(`"prepare" ya existe ("${pkg.scripts.prepare}") — no se sobreescribe; agrega "husky" a mano si falta`);
    }
  }

  console.log(
    '\n  Husky configured. pre-commit runs lint-staged; commit-msg runs commitlint; pre-push avisa cobertura (suave).\n'
  );
}

if (require.main === module) {
  main();
}

module.exports = { installHooks, removeHuskyInitPlaceholder };
