import { describe, expect, it } from 'vitest';

import { detectPython, planPythonInstall } from './plan.js';

describe('detectPython', () => {
  it('no marca como Python un repo sin manifiestos', () => {
    const d = detectPython({ files: ['package.json', 'README.md'] });

    expect(d.isPython).toBe(false);
    expect(d.markers).toEqual([]);
  });

  it('reconoce un proyecto por requirements.txt', () => {
    expect(detectPython({ files: ['requirements.txt'] }).isPython).toBe(true);
  });

  it('reconoce un proyecto por pyproject.toml', () => {
    expect(detectPython({ files: ['pyproject.toml'] }).isPython).toBe(true);
  });

  it('detecta FastAPI en el manifiesto', () => {
    const d = detectPython({
      files: ['requirements.txt'],
      manifestContents: 'fastapi==0.115.0\nasyncpg==0.30.0\n',
    });

    expect(d.hasFastapi).toBe(true);
  });

  it('no confunde un paquete cuyo nombre contiene "fastapi" como sufijo', () => {
    // 'my-fastapi-utils' sí es FastAPI; 'notfastapi' no debería contar. La regex
    // exige un separador antes, no cualquier posición dentro de una palabra.
    const d = detectPython({ files: ['requirements.txt'], manifestContents: 'notfastapi==1.0' });

    expect(d.hasFastapi).toBe(false);
  });

  it('reconoce ruff configurado dentro de pyproject.toml, no solo en ruff.toml', () => {
    const d = detectPython({
      files: ['pyproject.toml'],
      manifestContents: '[tool.ruff]\nline-length = 100\n',
    });

    expect(d.hasRuff).toBe(true);
  });

  it('reconoce pytest configurado en pyproject.toml', () => {
    const d = detectPython({
      files: ['pyproject.toml'],
      manifestContents: '[tool.pytest.ini_options]\ntestpaths = ["tests"]\n',
    });

    expect(d.hasPytestConfig).toBe(true);
  });
});

describe('planPythonInstall', () => {
  function actionFor(plan, dest) {
    return plan.actions.find((a) => a.dest === dest);
  }

  it('en un proyecto limpio escribe las tres configuraciones', () => {
    const plan = planPythonInstall(detectPython({ files: ['requirements.txt'] }));

    expect(plan.actions.every((a) => a.status === 'write')).toBe(true);
    expect(plan.actions).toHaveLength(3);
  });

  it('elige la plantilla de pytest asíncrona cuando hay FastAPI', () => {
    const plan = planPythonInstall(
      detectPython({ files: ['requirements.txt'], manifestContents: 'fastapi==0.115' }),
    );

    expect(actionFor(plan, 'pytest.ini').template).toBe('pytest.fastapi.ini');
  });

  it('elige la plantilla simple sin FastAPI', () => {
    const plan = planPythonInstall(detectPython({ files: ['requirements.txt'] }));

    expect(actionFor(plan, 'pytest.ini').template).toBe('pytest.ini');
  });

  it('NUNCA pisa una config existente: la salta con motivo', () => {
    const plan = planPythonInstall(
      detectPython({ files: ['requirements.txt', 'ruff.toml', '.pre-commit-config.yaml'] }),
    );

    expect(actionFor(plan, 'ruff.toml')).toMatchObject({ status: 'skip' });
    expect(actionFor(plan, '.pre-commit-config.yaml')).toMatchObject({ status: 'skip' });
    expect(actionFor(plan, 'pytest.ini').status).toBe('write');
  });

  it('respeta la config de ruff declarada dentro de pyproject.toml', () => {
    // El caso que un chequeo por nombre de archivo se perdería: ruff configurado
    // en pyproject, sin ruff.toml. Escribir uno nuevo partiría la config en dos.
    const plan = planPythonInstall(
      detectPython({ files: ['pyproject.toml'], manifestContents: '[tool.ruff]\n' }),
    );

    expect(actionFor(plan, 'ruff.toml').status).toBe('skip');
  });
});
