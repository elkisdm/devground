#!/usr/bin/env node

/**
 * Instala la configuración devground para Python en el proyecto actual.
 *
 *   npx @devground/python-config
 *
 * Nunca sobreescribe un archivo existente: reporta qué saltó y por qué.
 */

const fs = require('node:fs');
const path = require('node:path');

const { detectPython, planPythonInstall, PYTHON_MARKERS } = require('./lib/plan.js');

function ok(msg) {
  console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
}
function skip(msg) {
  console.log(`  \x1b[33m!\x1b[0m ${msg}`);
}
function info(msg) {
  console.log(`  \x1b[36m→\x1b[0m ${msg}`);
}

const cwd = process.cwd();
const files = fs.readdirSync(cwd);

// Concatenar los manifiestos permite detectar el framework y las herramientas
// ya configuradas dentro de pyproject.toml, no solo por nombre de archivo.
const manifestContents = PYTHON_MARKERS.filter((m) => files.includes(m))
  .map((m) => {
    try {
      return fs.readFileSync(path.join(cwd, m), 'utf8');
    } catch {
      return '';
    }
  })
  .join('\n');

const detected = detectPython({ files, manifestContents });

if (!detected.isPython) {
  console.log('');
  info('Aquí no hay un proyecto Python (sin pyproject.toml, requirements.txt ni setup.py).');
  info('No hay nada que instalar.');
  process.exit(0);
}

console.log('');
info(`Proyecto Python detectado (${detected.markers.join(', ')})${detected.hasFastapi ? ' — FastAPI' : ''}`);
console.log('');

const templatesDir = path.join(__dirname, 'templates');
let written = 0;
let skipped = 0;

for (const action of planPythonInstall(detected).actions) {
  const dest = path.join(cwd, action.dest);
  if (action.status === 'skip' || fs.existsSync(dest)) {
    skip(`${action.dest} — ${action.reason ?? 'ya existe'} (se conserva el tuyo)`);
    skipped++;
    continue;
  }
  fs.copyFileSync(path.join(templatesDir, action.template), dest);
  ok(action.dest);
  written++;
}

console.log('');
if (written > 0) {
  info('Siguiente paso, para que el gate corra en cada commit:');
  info('  pip install pre-commit && pre-commit install');
}
if (skipped > 0 && written === 0) {
  info('Todo estaba configurado. Nada que hacer.');
}
console.log('');
