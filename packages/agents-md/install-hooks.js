#!/usr/bin/env node
// devground-hooks — install the curated Claude Code harness hooks.
//
// 1. Copies hooks/*.mjs (+ lib/) into .claude/hooks/devground/ — that
//    directory is OUR namespace: re-running upgrades the scripts in place.
// 2. Wires them into .claude/settings.json — but an existing "hooks" key is
//    NEVER touched (same contract as every devground config installer): we
//    leave the reference config next to the scripts for a manual merge.

const fs = require('node:fs');
const path = require('node:path');

const HOOK_FILES = [
  'prettier-format.mjs',
  'typecheck.mjs',
  'console-log-warn.mjs',
  'session-summary.mjs',
  'hooks.json',
  path.join('lib', 'common.mjs'),
];

function log(msg) {
  console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
}

function warn(msg) {
  console.log(`  \x1b[33m!\x1b[0m ${msg}`);
}

function installHooks(targetDir, { logFn = log, warnFn = warn } = {}) {
  const sourceDir = path.join(__dirname, 'hooks');
  const hooksDir = path.join(targetDir, '.claude', 'hooks', 'devground');

  for (const file of HOOK_FILES) {
    const dest = path.join(hooksDir, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(sourceDir, file), dest);
  }
  logFn('Hooks copiados a .claude/hooks/devground/');

  const settingsPath = path.join(targetDir, '.claude', 'settings.json');
  const hooksConfig = JSON.parse(fs.readFileSync(path.join(sourceDir, 'hooks.json'), 'utf8'));

  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch {
      warnFn(
        '.claude/settings.json no es JSON válido — no se toca. ' +
          'Config de referencia: .claude/hooks/devground/hooks.json',
      );
      return { settingsWritten: false };
    }
  }

  if (settings.hooks) {
    warnFn(
      '.claude/settings.json ya define "hooks" — se deja intacto. ' +
        'Mergea a mano desde .claude/hooks/devground/hooks.json',
    );
    return { settingsWritten: false };
  }

  settings.hooks = hooksConfig;
  fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
  logFn('Hooks configurados en .claude/settings.json');
  return { settingsWritten: true };
}

module.exports = { installHooks, HOOK_FILES };

if (require.main === module) {
  installHooks(process.cwd());
  console.log(
    '\n  4 hooks instalados: prettier + typecheck + console.log (al editar) y session-summary (al terminar).' +
      '\n  Kill switch: DEVGROUND_HOOKS_DISABLE=all (o por nombre: typecheck,prettier,console-log,session-summary)\n',
  );
}
