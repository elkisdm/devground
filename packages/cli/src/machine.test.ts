import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  ACTIVE_HOOKS,
  PASSTHROUGH_HOOKS,
  classifyHooksPath,
  installMachineHooks,
  installedHooks,
  isOptedIn,
  machineHooksDir,
  machineReport,
  planMachineInstall,
  resolveRoots,
  successReport,
} from './machine.js';

const TEMPLATES = join(__dirname, '..', 'templates', 'machine');

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'dg-machine-'));
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe('machineHooksDir', () => {
  it('usa ~/.config por defecto', () => {
    expect(machineHooksDir('/home/x')).toBe('/home/x/.config/devground/hooks');
  });

  it('respeta XDG_CONFIG_HOME cuando viene con valor', () => {
    expect(machineHooksDir('/home/x', '/cfg')).toBe('/cfg/devground/hooks');
  });

  it('ignora un XDG_CONFIG_HOME vacío en vez de generar una ruta rota', () => {
    expect(machineHooksDir('/home/x', '   ')).toBe('/home/x/.config/devground/hooks');
  });
});

describe('classifyHooksPath', () => {
  it('sin valor previo es unset', () => {
    expect(classifyHooksPath(undefined, '/d')).toBe('unset');
    expect(classifyHooksPath('', '/d')).toBe('unset');
  });

  it('reconoce una reinstalación sobre el mismo directorio', () => {
    expect(classifyHooksPath('/d', '/d')).toBe('ours');
    expect(classifyHooksPath('  /d  ', '/d')).toBe('ours');
  });

  it('marca como foreign el hooksPath de otra herramienta', () => {
    expect(classifyHooksPath('/otra/cosa', '/d')).toBe('foreign');
  });
});

describe('planMachineInstall', () => {
  it('aborta si otra herramienta ya reclamó el hook global', () => {
    const plan = planMachineInstall('/home/x', '/algun/otro/dir');

    expect(plan.hooksPathState).toBe('foreign');
    expect(plan.safeToProceed).toBe(false);
  });

  it('procede en una máquina limpia y planifica activos + passthrough', () => {
    const plan = planMachineInstall('/home/x', undefined);

    expect(plan.safeToProceed).toBe(true);
    expect(plan.hooksToWrite).toContain('commit-msg');
    expect(plan.hooksToWrite).toContain('post-commit');
    expect(plan.hooksToWrite).toHaveLength(ACTIVE_HOOKS.length + PASSTHROUGH_HOOKS.length);
  });

  it('una reinstalación es segura, no un conflicto', () => {
    const dir = machineHooksDir('/home/x');

    expect(planMachineInstall('/home/x', dir).safeToProceed).toBe(true);
  });
});

describe('isOptedIn', () => {
  it('el ignore explícito gana sobre todo lo demás', () => {
    const r = isOptedIn('/home/x/Developer/a', {
      hasIgnore: true,
      hasMarker: true,
      roots: ['/home/x/Developer'],
    });

    expect(r).toBe(false);
  });

  it('el marcador cubre un repo fuera de las raíces', () => {
    expect(isOptedIn('/tmp/suelto', { hasMarker: true, roots: ['/home/x/Developer'] })).toBe(true);
  });

  it('un repo bajo una raíz configurada queda cubierto', () => {
    expect(isOptedIn('/home/x/Developer/trabajo/a', { roots: ['/home/x/Developer'] })).toBe(true);
  });

  it('un repo de terceros fuera de las raíces NO se toca', () => {
    expect(isOptedIn('/opt/oss/react', { roots: ['/home/x/Developer'] })).toBe(false);
  });

  it('no confunde un directorio hermano con un descendiente', () => {
    // '/home/x/DeveloperOtro' empieza con '/home/x/Developer' como texto, pero
    // no cuelga de él. Comparar cadenas sin el separador daría un falso positivo.
    expect(isOptedIn('/home/x/DeveloperOtro/a', { roots: ['/home/x/Developer'] })).toBe(false);
  });
});

describe('installMachineHooks', () => {
  it('escribe todos los hooks ejecutables y la biblioteca compartida', () => {
    const hooksDir = join(tmp, 'hooks');

    const written = installMachineHooks(TEMPLATES, hooksDir);

    expect(written).toHaveLength(ACTIVE_HOOKS.length + PASSTHROUGH_HOOKS.length);
    expect(installedHooks(hooksDir).sort()).toEqual([...written].sort());
    // La biblioteca empieza con '_': git nunca la ejecuta como hook.
    expect(installedHooks(hooksDir)).not.toContain('_devground-lib.sh');
  });

  it('es idempotente: reinstalar no duplica ni falla', () => {
    const hooksDir = join(tmp, 'hooks');

    installMachineHooks(TEMPLATES, hooksDir);
    const second = installMachineHooks(TEMPLATES, hooksDir);

    expect(second).toHaveLength(ACTIVE_HOOKS.length + PASSTHROUGH_HOOKS.length);
  });
});

describe('resolveRoots', () => {
  it('cae en ~/Developer cuando no se pide nada', () => {
    expect(resolveRoots(undefined, '/home/x')).toBe('/home/x/Developer');
  });

  it('respeta la raíz pedida', () => {
    expect(resolveRoots('/w:/z', '/home/x')).toBe('/w:/z');
  });

  it('trata una raíz en blanco como no pedida', () => {
    expect(resolveRoots('   ', '/home/x')).toBe('/home/x/Developer');
  });
});

describe('machineReport', () => {
  it('ante un hooksPath ajeno reporta error y nombra el culpable', () => {
    const plan = planMachineInstall('/home/x', '/otra/herramienta');
    const lines = machineReport(plan, '/home/x/Developer', '/otra/herramienta');

    expect(lines.some((l) => l.kind === 'error')).toBe(true);
    expect(lines.map((l) => l.text).join(' ')).toContain('/otra/herramienta');
  });

  it('el reporte de conflicto ofrece las dos salidas, no solo el problema', () => {
    const plan = planMachineInstall('/home/x', '/otra');
    const texto = machineReport(plan, '/r', '/otra')
      .map((l) => l.text)
      .join(' ');

    expect(texto).toContain('a mano');
    expect(texto).toContain('--unset core.hooksPath');
  });

  it('en el camino feliz no reporta ningún error', () => {
    const plan = planMachineInstall('/home/x', undefined);
    const lines = machineReport(plan, '/home/x/Developer', undefined);

    expect(lines.every((l) => l.kind === 'info')).toBe(true);
    expect(lines.map((l) => l.text).join(' ')).toContain('/home/x/Developer');
  });

  it('siempre dice cómo excluir un repo', () => {
    const plan = planMachineInstall('/home/x', undefined);
    const texto = machineReport(plan, '/r', undefined)
      .map((l) => l.text)
      .join(' ');

    expect(texto).toContain('.devground-ignore');
  });
});

describe('successReport', () => {
  it('promete explícitamente que husky y los hooks locales sobreviven', () => {
    // Es la duda que cualquiera tiene al fijar un hook global; si el mensaje
    // no la responde, la instalación asusta aunque sea segura.
    const texto = successReport(8)
      .map((l) => l.text)
      .join(' ');

    expect(texto).toContain('husky');
    expect(texto).toContain('.git/hooks');
  });

  it('incluye el rollback', () => {
    expect(successReport(8).map((l) => l.text).join(' ')).toContain('--unset core.hooksPath');
  });

  it('reporta cuántos se instalaron', () => {
    expect(successReport(8)[0].text).toContain('8');
  });
});

/**
 * Los tests de arriba razonan sobre la lógica en TypeScript. Estos corren los
 * hooks de shell de verdad contra repos git de verdad: la lógica vive duplicada
 * (TS para razonar, sh para ejecutar) y solo esto prueba que la copia que
 * realmente corre hace lo que decimos.
 */
describe('integración: los hooks de shell contra repos git reales', () => {
  function makeRepo(name: string): string {
    const repo = join(tmp, name);
    mkdirSync(repo, { recursive: true });
    execFileSync('git', ['init', '-q'], { cwd: repo });
    execFileSync('git', ['config', 'user.email', 't@t.t'], { cwd: repo });
    execFileSync('git', ['config', 'user.name', 't'], { cwd: repo });
    return repo;
  }

  function commit(repo: string, message: string, hooksDir: string, roots: string) {
    writeFileSync(join(repo, `f${Math.random()}.txt`), 'x');
    execFileSync('git', ['add', '-A'], { cwd: repo });
    return execFileSync('git', ['commit', '-m', message], {
      cwd: repo,
      encoding: 'utf8',
      env: {
        ...process.env,
        DEVGROUND_ROOTS: roots,
        GIT_CONFIG_GLOBAL: join(tmp, 'gitconfig'),
        // El hook lee core.hooksPath del repo; lo fijamos local para no tocar
        // la configuración global real de la máquina que corre los tests.
      },
    });
  }

  function setup(repoName: string): { repo: string; hooksDir: string } {
    const hooksDir = join(tmp, 'hooks');
    installMachineHooks(TEMPLATES, hooksDir);
    const repo = makeRepo(repoName);
    execFileSync('git', ['config', 'core.hooksPath', hooksDir], { cwd: repo });
    return { repo, hooksDir };
  }

  it('rechaza un mensaje que no sigue Conventional Commits', () => {
    const { repo, hooksDir } = setup('cubierto');

    expect(() => commit(repo, 'arreglé cosas', hooksDir, tmp)).toThrow();
  });

  it('acepta un mensaje convencional', () => {
    const { repo, hooksDir } = setup('cubierto2');

    expect(() => commit(repo, 'feat(auth): permite login', hooksDir, tmp)).not.toThrow();
  });

  it('acepta un breaking change con "!"', () => {
    const { repo, hooksDir } = setup('bang');

    expect(() => commit(repo, 'feat(api)!: cambia el contrato', hooksDir, tmp)).not.toThrow();
  });

  it('deja pasar un merge, que por diseño no sigue la convención', () => {
    const { repo, hooksDir } = setup('merge');

    expect(() => commit(repo, "Merge branch 'x' into main", hooksDir, tmp)).not.toThrow();
  });

  it('rechaza un header de más de 100 caracteres', () => {
    const { repo, hooksDir } = setup('largo');
    const largo = `feat(x): ${'a'.repeat(120)}`;

    expect(() => commit(repo, largo, hooksDir, tmp)).toThrow();
  });

  it('NO valida un repo fuera de las raíces configuradas', () => {
    const { repo, hooksDir } = setup('ajeno');

    // Raíz que no contiene al repo: el despachador no debe actuar.
    expect(() => commit(repo, 'mensaje libre sin convención', hooksDir, '/ruta/inexistente')).not.toThrow();
  });

  it('respeta el opt-out .devground-ignore aunque el repo esté bajo la raíz', () => {
    const { repo, hooksDir } = setup('excluido');
    writeFileSync(join(repo, '.devground-ignore'), '');

    expect(() => commit(repo, 'mensaje libre', hooksDir, tmp)).not.toThrow();
  });

  it('el marcador .devground cubre un repo fuera de las raíces', () => {
    const { repo, hooksDir } = setup('marcado');
    writeFileSync(join(repo, '.devground'), '');

    expect(() => commit(repo, 'sin convencion', hooksDir, '/ruta/inexistente')).toThrow();
  });

  it('lee las raices desde git config, no solo del entorno', () => {
    // El disconnect que la revision encontro: `machine --roots` persiste
    // devground.roots en git config, pero el hook solo miraba la variable de
    // entorno — asi que la opcion no hacia nada en tiempo de ejecucion.
    const { repo, hooksDir } = setup('via-git-config');
    execFileSync('git', ['config', 'devground.roots', tmp], { cwd: repo });

    // Sin DEVGROUND_ROOTS en el entorno: la unica fuente es git config.
    expect(() =>
      execFileSync('git', ['commit', '--allow-empty', '-m', 'sin convencion'], {
        cwd: repo,
        encoding: 'utf8',
        env: { ...process.env, DEVGROUND_ROOTS: '', GIT_CONFIG_GLOBAL: join(tmp, 'gitconfig') },
      }),
    ).toThrow();
    expect(installedHooks(hooksDir)).toContain('commit-msg');
  });

  it('el entorno gana sobre git config', () => {
    const { repo } = setup('entorno-gana');
    execFileSync('git', ['config', 'devground.roots', tmp], { cwd: repo });

    expect(() =>
      execFileSync('git', ['commit', '--allow-empty', '-m', 'sin convencion'], {
        cwd: repo,
        encoding: 'utf8',
        env: {
          ...process.env,
          DEVGROUND_ROOTS: '/ruta/inexistente',
          GIT_CONFIG_GLOBAL: join(tmp, 'gitconfig'),
        },
      }),
    ).not.toThrow();
  });

  it('encadena al hook local del repo en vez de reemplazarlo', () => {
    // El riesgo real que motivó el diseño: 13 repos de esta máquina tienen un
    // post-commit propio que core.hooksPath global habría dejado sin correr.
    const { repo, hooksDir } = setup('encadenado');
    const marker = join(tmp, 'el-hook-local-corrio');
    const localHook = join(repo, '.git', 'hooks', 'post-commit');
    mkdirSync(join(repo, '.git', 'hooks'), { recursive: true });
    writeFileSync(localHook, `#!/bin/sh\ntouch "${marker}"\n`);
    chmodSync(localHook, 0o755);

    commit(repo, 'feat: algo', hooksDir, tmp);

    expect(installedHooks(hooksDir)).toContain('post-commit');
    expect(existsSync(marker)).toBe(true);
  });
});
