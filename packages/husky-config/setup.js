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

function main() {
  const targetDir = process.cwd();
  const huskyDir = path.join(targetDir, '.husky');
  const pkgPath = path.join(targetDir, 'package.json');

  // Activate husky WITHOUT `husky init`: init overwrites scripts.prepare and
  // .husky/pre-commit unconditionally, destroying the user's config before
  // installHooks() can respect it. `husky` with no args only sets
  // core.hooksPath and writes the gitignored .husky/_ runtime — it touches
  // neither package.json nor user hooks. Not logged with ✓: it writes no
  // artifact of the project, so a re-run stays an honest "skipped" for the CLI.
  fs.mkdirSync(huskyDir, { recursive: true });
  let huskyOutput;
  try {
    huskyOutput = execSync('npx --no-install husky', { cwd: targetDir, stdio: 'pipe' }).toString().trim();
  } catch (err) {
    const detail = (err.stderr && err.stderr.toString().trim()) || err.message;
    throw new Error(`Failed to run husky. Is it installed?\n${detail}`);
  }
  if (huskyOutput) {
    warn(`husky: ${huskyOutput}`);
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

module.exports = { installHooks, main };
