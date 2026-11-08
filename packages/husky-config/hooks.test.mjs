import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, existsSync, symlinkSync, realpathSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

test('pre-commit no hardcodea pnpm y usa runner agnóstico (#7)', () => {
  const s = readFileSync(join(here, 'hooks', 'pre-commit.sh'), 'utf8');
  assert.doesNotMatch(s, /pnpm exec/);
  assert.match(s, /npx --no-install lint-staged/);
});

test('commit-msg no hardcodea pnpm y usa runner agnóstico (#7)', () => {
  const s = readFileSync(join(here, 'hooks', 'commit-msg.sh'), 'utf8');
  assert.doesNotMatch(s, /pnpm exec/);
  assert.match(s, /npx --no-install commitlint/);
});

test('installHooks no sobreescribe un hook preexistente (#3 companion)', () => {
  const require = createRequire(import.meta.url);
  const { installHooks } = require('./setup.js');
  const dir = mkdtempSync(join(tmpdir(), 'husky-'));
  const huskyDir = join(dir, '.husky');
  mkdirSync(huskyDir);
  writeFileSync(join(huskyDir, 'pre-commit'), '# hook propio\n');
  installHooks(huskyDir);
  assert.equal(readFileSync(join(huskyDir, 'pre-commit'), 'utf8'), '# hook propio\n');
});

// Regresión de main() COMPLETO, no solo de installHooks(): el bug real era que
// `npx husky init` corría ANTES y ya había pisado `prepare` y .husky/pre-commit
// cuando installHooks() comprobaba qué respetar. Corre setup.js en un proceso
// aparte (main usa process.cwd()) contra un repo git temporal con husky real.
const huskyPkg = realpathSync(join(here, 'node_modules', 'husky'));

function makeProject(pkg) {
  const dir = mkdtempSync(join(tmpdir(), 'husky-main-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
  mkdirSync(join(dir, 'node_modules', '.bin'), { recursive: true });
  symlinkSync(huskyPkg, join(dir, 'node_modules', 'husky'));
  symlinkSync(join(huskyPkg, 'bin.js'), join(dir, 'node_modules', '.bin', 'husky'));
  return dir;
}

function runSetup(dir) {
  return execFileSync(process.execPath, [join(here, 'setup.js')], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, npm_config_offline: 'true', HUSKY: '' },
  });
}

test('main() respeta un "prepare" y un .husky/pre-commit propios', () => {
  const dir = makeProject({ name: 'x', version: '1.0.0', scripts: { prepare: 'node custom-prepare.js' } });
  mkdirSync(join(dir, '.husky'));
  writeFileSync(join(dir, '.husky', 'pre-commit'), 'echo MI HOOK\n');

  runSetup(dir);

  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.prepare, 'node custom-prepare.js');
  assert.equal(readFileSync(join(dir, '.husky', 'pre-commit'), 'utf8'), 'echo MI HOOK\n');
  // Los hooks que faltaban sí se instalan.
  assert.ok(existsSync(join(dir, '.husky', 'commit-msg')));
  assert.ok(existsSync(join(dir, '.husky', 'pre-push')));
});

test('main() en un proyecto nuevo agrega "prepare" e instala los tres hooks reales', () => {
  const dir = makeProject({ name: 'x', version: '1.0.0' });

  runSetup(dir);

  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.prepare, 'husky');
  assert.match(readFileSync(join(dir, '.husky', 'pre-commit'), 'utf8'), /lint-staged/);
  assert.match(readFileSync(join(dir, '.husky', 'commit-msg'), 'utf8'), /commitlint/);
  assert.ok(existsSync(join(dir, '.husky', 'pre-push')));
  assert.equal(execFileSync('git', ['config', 'core.hooksPath'], { cwd: dir, encoding: 'utf8' }).trim(), '.husky/_');
});

test('main() en una segunda pasada no reporta escrituras (sin ✓) para que la CLI diga "skipped"', () => {
  const dir = makeProject({ name: 'x', version: '1.0.0' });
  runSetup(dir);

  const second = runSetup(dir);

  assert.doesNotMatch(second, /✓/);
});
