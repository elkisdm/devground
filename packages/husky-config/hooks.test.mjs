import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
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

test('removeHuskyInitPlaceholder borra solo el placeholder de "husky init", no un hook real (bug hallado en e2e)', () => {
  const require = createRequire(import.meta.url);
  const { removeHuskyInitPlaceholder } = require('./setup.js');

  // Sin el fix: "npx husky init" en un proyecto nuevo escribe .husky/pre-commit
  // con "npm test", e installHooks() lo trataba como un hook real del usuario
  // y nunca instalaba lint-staged + gitleaks (#3).
  const dirPlaceholder = mkdtempSync(join(tmpdir(), 'husky-'));
  const huskyDirPlaceholder = join(dirPlaceholder, '.husky');
  mkdirSync(huskyDirPlaceholder);
  writeFileSync(join(huskyDirPlaceholder, 'pre-commit'), 'npm test\n');
  removeHuskyInitPlaceholder(huskyDirPlaceholder);
  assert.equal(existsSync(join(huskyDirPlaceholder, 'pre-commit')), false);

  // Un hook real del usuario (contenido distinto al placeholder) no se toca.
  const dirReal = mkdtempSync(join(tmpdir(), 'husky-'));
  const huskyDirReal = join(dirReal, '.husky');
  mkdirSync(huskyDirReal);
  writeFileSync(join(huskyDirReal, 'pre-commit'), '# hook propio\n');
  removeHuskyInitPlaceholder(huskyDirReal);
  assert.equal(readFileSync(join(huskyDirReal, 'pre-commit'), 'utf8'), '# hook propio\n');
});
