import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, lstatSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const setupJs = join(here, 'setup.js');
const run = (cwd) => execFileSync(process.execPath, [setupJs], { cwd, encoding: 'utf8' });
const tmp = () => mkdtempSync(join(tmpdir(), 'agents-'));

test('no borra un CLAUDE.md real del usuario (#2)', () => {
  const dir = tmp();
  writeFileSync(join(dir, 'CLAUDE.md'), '# reglas propias\n');
  run(dir);
  assert.equal(readFileSync(join(dir, 'CLAUDE.md'), 'utf8'), '# reglas propias\n');
  assert.ok(!lstatSync(join(dir, 'CLAUDE.md')).isSymbolicLink());
});

test('no sobreescribe un AGENTS.md existente (#2)', () => {
  const dir = tmp();
  writeFileSync(join(dir, 'AGENTS.md'), 'CONTENIDO PROPIO\n');
  run(dir);
  assert.equal(readFileSync(join(dir, 'AGENTS.md'), 'utf8'), 'CONTENIDO PROPIO\n');
});

test('crea symlinks en un proyecto limpio', () => {
  const dir = tmp();
  run(dir);
  assert.ok(existsSync(join(dir, 'AGENTS.md')));
  assert.ok(lstatSync(join(dir, 'CLAUDE.md')).isSymbolicLink());
});

test('fallback de copia resuelve contra el proyecto, no el padre (#17)', () => {
  const require = createRequire(import.meta.url);
  const { resolveCopySource } = require('./setup.js');
  assert.equal(resolveCopySource('/proj'), join('/proj', 'AGENTS.md'));
});
