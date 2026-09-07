import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const execFileSync = vi.hoisted(() => vi.fn());
const installMachineHooks = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', () => ({ execFileSync }));
vi.mock('@devground/logger', () => ({
  header: vi.fn(),
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock('./machine.js', async () => {
  const actual = await vi.importActual<typeof import('./machine.js')>('./machine.js');
  return { ...actual, installMachineHooks };
});

import { runMachineCommand } from './machine-command.js';

/** Simula `git config --global --get core.hooksPath`. */
function gitReturns(hooksPath: string | null) {
  execFileSync.mockImplementation((_cmd: string, args: string[]) => {
    if (args.includes('--get')) {
      if (hooksPath === null) throw new Error('exit 1'); // git sale 1 si la clave no existe
      return `${hooksPath}\n`;
    }
    return '';
  });
}

function gitCalls() {
  return execFileSync.mock.calls.map((c) => (c[1] as string[]).join(' '));
}

/** `process.exit` lanza en vez de matar el proceso, para poder afirmar sobre el aborto. */
function spyOnExit() {
  return vi.spyOn(process, 'exit').mockImplementation((() => {
    throw new Error('process.exit');
  }) as never);
}

let exitSpy: ReturnType<typeof spyOnExit>;

beforeEach(() => {
  execFileSync.mockReset();
  installMachineHooks.mockReset();
  installMachineHooks.mockReturnValue(['pre-commit', 'commit-msg']);
  exitSpy = spyOnExit();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('runMachineCommand', () => {
  it('en una máquina limpia instala y fija el hooksPath global', () => {
    gitReturns(null);

    runMachineCommand({});

    expect(installMachineHooks).toHaveBeenCalledOnce();
    expect(gitCalls().some((c) => c.includes('--global core.hooksPath'))).toBe(true);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('aborta sin escribir nada si otra herramienta tiene el hooksPath', () => {
    // El caso que protege a la máquina del usuario: pisar el hooksPath de otra
    // herramienta la rompe en silencio.
    gitReturns('/otra/herramienta/hooks');

    expect(() => runMachineCommand({})).toThrow('process.exit');
    expect(installMachineHooks).not.toHaveBeenCalled();
    expect(gitCalls().some((c) => c.includes('core.hooksPath /Users'))).toBe(false);
  });

  it('una reinstalación sobre nuestro propio directorio NO se toma como conflicto', () => {
    const ours = `${process.env.HOME ?? ''}/.config/devground/hooks`;
    gitReturns(ours);

    runMachineCommand({});

    expect(installMachineHooks).toHaveBeenCalledOnce();
  });

  it('--dry-run no escribe ni toca la configuración de git', () => {
    gitReturns(null);

    runMachineCommand({ dryRun: true });

    expect(installMachineHooks).not.toHaveBeenCalled();
    expect(gitCalls().some((c) => c.includes('core.hooksPath /'))).toBe(false);
  });

  it('persiste devground.roots solo cuando se pidieron raíces propias', () => {
    gitReturns(null);

    runMachineCommand({ roots: '/w' });

    expect(gitCalls().some((c) => c.includes('devground.roots /w'))).toBe(true);
  });

  it('sin --roots no ensucia la configuración global con un valor por defecto', () => {
    gitReturns(null);

    runMachineCommand({});

    expect(gitCalls().some((c) => c.includes('devground.roots'))).toBe(false);
  });

  it('un core.hooksPath global vacío cuenta como no configurado', () => {
    // `git config --get` puede devolver una línea en blanco; tratarla como una
    // ruta ajena bloquearía la instalación sin motivo.
    gitReturns('   ');

    runMachineCommand({});

    expect(installMachineHooks).toHaveBeenCalledOnce();
  });
});
