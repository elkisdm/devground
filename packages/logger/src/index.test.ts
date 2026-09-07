import { afterEach, describe, expect, it, vi } from 'vitest';

import { error, header, info, log, success, warn } from './index.js';

const ESC = '\x1b';
const RESET = `${ESC}[0m`;

afterEach(() => {
  vi.restoreAllMocks();
});

function captureLog(fn: () => void): string {
  const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
  fn();
  return spy.mock.calls.map((c) => String(c[0])).join('\n');
}

function captureError(fn: () => void): string {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  fn();
  return spy.mock.calls.map((c) => String(c[0])).join('\n');
}

describe('niveles del logger', () => {
  it('info, success y warn escriben en stdout con su glifo', () => {
    expect(captureLog(() => info('cargando'))).toContain('cargando');
    expect(captureLog(() => success('listo'))).toContain('✔');
    expect(captureLog(() => warn('ojo'))).toContain('⚠');
  });

  it('error escribe en stderr, no en stdout', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const out = captureError(() => error('falló'));

    expect(out).toContain('falló');
    expect(out).toContain('✘');
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('log pasa el mensaje sin decorarlo', () => {
    expect(captureLog(() => log('crudo'))).toBe('crudo');
  });

  it('header enmarca el texto con líneas en blanco', () => {
    const out = captureLog(() => header('Sección'));

    expect(out).toContain('Sección');
    expect(out.startsWith('\n')).toBe(true);
    expect(out.endsWith('\n')).toBe(true);
  });
});

describe('secuencias ANSI', () => {
  it('cada nivel abre color y lo cierra con reset', () => {
    for (const fn of [info, success, warn]) {
      const out = captureLog(() => fn('x'));

      expect(out).toContain(ESC);
      expect(out).toContain(RESET);
    }
  });

  it('no deja el color abierto al final de la línea', () => {
    // Un reset faltante sangra el color al resto de la terminal: es el bug clásico
    // de un logger ANSI y la razón de que este test exista.
    const out = captureLog(() => success('ok'));
    const afterLastEscape = out.slice(out.lastIndexOf(`${ESC}[`));

    expect(afterLastEscape.startsWith(RESET)).toBe(true);
  });

  it('acepta el mensaje vacío sin romper el formato', () => {
    expect(() => captureLog(() => info(''))).not.toThrow();
    expect(captureLog(() => info(''))).toContain(RESET);
  });
});
