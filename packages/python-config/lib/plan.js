'use strict';

/**
 * Detección de proyecto Python y plan de instalación (ADR-0035).
 *
 * Todo lo que decide QUÉ escribir vive acá, puro y testeable: `setup.js` corre
 * su trabajo al importarse, así que nada definido ahí puede testearse sin
 * ejecutar el instalador (la lección del WS4 del deepcheck de julio).
 */

/** Archivos que marcan un proyecto Python, en orden de fuerza de la señal. */
const PYTHON_MARKERS = [
  'pyproject.toml',
  'requirements.txt',
  'requirements-dev.txt',
  'setup.py',
  'setup.cfg',
  'Pipfile',
];

/**
 * @param {{ files: string[], manifestContents?: string }} input
 *   `files` son los nombres en la raíz del proyecto; `manifestContents` es el
 *   texto concatenado de los manifiestos encontrados (para detectar frameworks).
 */
function detectPython({ files, manifestContents = '' }) {
  const present = new Set(files);
  const markers = PYTHON_MARKERS.filter((m) => present.has(m));
  const haystack = manifestContents.toLowerCase();

  return {
    isPython: markers.length > 0,
    markers,
    // FastAPI cambia la config de pytest (modo asíncrono), no solo el linter:
    // sin `asyncio_mode = auto` los tests async se saltan en silencio y la
    // suite pasa en verde sin haber corrido nada.
    hasFastapi: /(^|[^a-z])fastapi/.test(haystack),
    hasRuff: present.has('ruff.toml') || haystack.includes('[tool.ruff]'),
    hasPytestConfig: present.has('pytest.ini') || haystack.includes('[tool.pytest'),
    hasPreCommit: present.has('.pre-commit-config.yaml'),
  };
}

/**
 * Qué archivos escribir. Nunca pisa uno existente: reporta `skipped` con el
 * motivo, igual que el resto de los instaladores de devground.
 *
 * @returns {{ actions: Array<{ template: string, dest: string, status: 'write'|'skip', reason?: string }> }}
 */
function planPythonInstall(detected) {
  const actions = [];

  actions.push(
    detected.hasRuff
      ? { template: 'ruff.toml', dest: 'ruff.toml', status: 'skip', reason: 'ya hay config de ruff' }
      : { template: 'ruff.toml', dest: 'ruff.toml', status: 'write' },
  );

  const pytestTemplate = detected.hasFastapi ? 'pytest.fastapi.ini' : 'pytest.ini';
  actions.push(
    detected.hasPytestConfig
      ? { template: pytestTemplate, dest: 'pytest.ini', status: 'skip', reason: 'ya hay config de pytest' }
      : { template: pytestTemplate, dest: 'pytest.ini', status: 'write' },
  );

  actions.push(
    detected.hasPreCommit
      ? {
          template: 'pre-commit-config.yaml',
          dest: '.pre-commit-config.yaml',
          status: 'skip',
          reason: 'ya hay config de pre-commit',
        }
      : { template: 'pre-commit-config.yaml', dest: '.pre-commit-config.yaml', status: 'write' },
  );

  return { actions };
}

module.exports = { PYTHON_MARKERS, detectPython, planPythonInstall };
