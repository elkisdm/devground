#!/usr/bin/env node

// @devground/devground es un bundle delgado: NO reimplementa el instalador.
// Delega TODO en devground-init (el CLI testeado) para que exista una sola
// implementación (evita el drift que reintrodujo el bug de lint-staged #1/#6).
// Corre el preset completo sin interacción (--yes); el write-guard del CLI y de
// sus bins delegados respeta "no sobreescribe nada existente" (#5), instala el
// hook commit-msg + gitleaks (#18), detecta el package manager real en vez de
// hardcodear pnpm (#7) e instala eslint-config-next cuando hace falta (#31).
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const targetDir = process.cwd();

const cliManifestPath = require.resolve('devground-init/package.json');
const cliManifest = require(cliManifestPath);
const cliBin = path.join(path.dirname(cliManifestPath), cliManifest.bin['devground-init']);

const result = spawnSync(process.execPath, [cliBin, '--yes'], {
  cwd: targetDir,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
