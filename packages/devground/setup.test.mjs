import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const setupJs = join(dirname(fileURLToPath(import.meta.url)), 'setup.js');
const src = readFileSync(setupJs, 'utf8');

test('delega en devground-init y no reimplementa el instalador (#6)', () => {
  assert.match(src, /devground-init/);
  assert.match(src, /--yes/);
});

test('ya no escribe la clave string lint-staged que bloquea commits (#1)', () => {
  assert.doesNotMatch(src, /\['lint-staged'\]\s*=/);
  assert.doesNotMatch(src, /pnpm exec lint-staged/);
});
