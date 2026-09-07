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
  // tox.ini rara vez marca un proyecto por sí solo, pero puede contener la
  // sección [pytest]: sin leerlo, se escribiría un pytest.ini encima.
  'tox.ini',
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
    // `[tool.ruff]` a secas es OPCIONAL en el layout moderno: mucha gente
    // escribe solo `[tool.ruff.lint]`. Sin el prefijo, un pyproject configurado
    // se lee como vacío — y ruff resuelve ruff.toml ANTES que pyproject, así
    // que el archivo nuevo reemplazaría la configuración entera del proyecto.
    hasRuff: present.has('ruff.toml') || present.has('.ruff.toml') || haystack.includes('[tool.ruff'),
    // pytest acepta cuatro sintaxis en tres archivos distintos. Reconocerlas
    // todas importa porque pytest.ini tiene la precedencia MÁS ALTA: escribirlo
    // encima desactiva addopts, markers y testpaths del proyecto sin avisar.
    hasPytestConfig:
      present.has('pytest.ini') ||
      haystack.includes('[tool.pytest') || // pyproject.toml
      haystack.includes('[tool:pytest]') || // setup.cfg (dos puntos, no punto)
      /^\[pytest\]/m.test(manifestContents), // tox.ini
    hasPreCommit: present.has('.pre-commit-config.yaml'),
    // pytest.ini fija `testpaths = tests`. Si no hay un tests/ en la raíz, ese
    // archivo haría que la suite recolecte CERO y siga saliendo verde: peor
    // que no instalar nada.
    hasRootTestsDir: present.has('tests'),
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
  let pytestAction;
  if (detected.hasPytestConfig) {
    pytestAction = { template: pytestTemplate, dest: 'pytest.ini', status: 'skip', reason: 'ya hay config de pytest' };
  } else if (!detected.hasRootTestsDir) {
    pytestAction = {
      template: pytestTemplate,
      dest: 'pytest.ini',
      status: 'skip',
      reason: 'no hay tests/ en la raiz — un testpaths equivocado recolectaria cero y saldria verde',
    };
  } else {
    pytestAction = { template: pytestTemplate, dest: 'pytest.ini', status: 'write' };
  }
  actions.push(pytestAction);

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
