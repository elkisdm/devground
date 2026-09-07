import { chmodSync, copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Instalación del estándar a nivel de MÁQUINA (ADR-0034).
 *
 * El modelo por proyecto no alcanza repos existentes: adoptar el estándar en uno
 * exige tocar su package.json, su lockfile y su CI, y eso compite con el trabajo
 * real y pierde. Esto instala una vez y cubre todo lo que ya existe.
 *
 * La lógica de decisión vive aquí (pura y testeable); los efectos quedan
 * confinados a `installMachineHooks`.
 */

/** Eventos donde devground agrega comprobaciones propias. */
export const ACTIVE_HOOKS = ['pre-commit', 'commit-msg'] as const;

/**
 * Eventos donde devground NO agrega nada, pero debe instalar un despachador de
 * paso igualmente.
 *
 * Motivo verificado, no defensivo: al fijar `core.hooksPath` global, git deja de
 * leer `.git/hooks/` por completo. En esta máquina 13 repos tienen un
 * `post-commit` propio (la automatización de changelog); sin estos archivos
 * dejarían de correr sin un solo mensaje de error.
 */
export const PASSTHROUGH_HOOKS = [
  'post-commit',
  'pre-push',
  'prepare-commit-msg',
  'post-merge',
  'post-checkout',
  'post-rewrite',
] as const;

export type HooksPathState = 'unset' | 'ours' | 'foreign';

/**
 * Qué hacer con el `core.hooksPath` global que ya exista.
 *
 * `foreign` es el caso que importa: otra herramienta ya reclamó el hook global
 * de esta máquina. Pisarlo silenciosamente rompería esa herramienta, así que el
 * instalador se detiene y lo reporta.
 */
export function classifyHooksPath(current: string | undefined, ourDir: string): HooksPathState {
  const trimmed = current?.trim();
  if (!trimmed) return 'unset';
  if (trimmed === ourDir) return 'ours';
  return 'foreign';
}

/** Directorio donde viven los hooks de máquina, respetando XDG. */
export function machineHooksDir(home: string, xdgConfigHome?: string): string {
  const base = xdgConfigHome?.trim() ? xdgConfigHome : join(home, '.config');
  return join(base, 'devground', 'hooks');
}

/**
 * ¿Este repo queda cubierto por el despachador?
 *
 * Réplica exacta de la lógica de `_devground-lib.sh`, para poder razonar sobre
 * ella en tests sin levantar un repo git. Si una de las dos cambia, la otra debe
 * cambiar con ella — los tests de integración corren el shell de verdad.
 */
export function isOptedIn(
  repoRoot: string,
  opts: { hasMarker?: boolean; hasIgnore?: boolean; roots?: string[] },
): boolean {
  if (opts.hasIgnore) return false;
  if (opts.hasMarker) return true;
  const roots = opts.roots ?? [];
  return roots.some((root) => root !== '' && `${repoRoot}/`.startsWith(`${root}/`));
}

export interface MachineInstallPlan {
  hooksDir: string;
  hooksToWrite: string[];
  hooksPathState: HooksPathState;
  /** Falso cuando otra herramienta ya reclamó el hook global: hay que abortar. */
  safeToProceed: boolean;
}

export function planMachineInstall(
  home: string,
  currentHooksPath: string | undefined,
  xdgConfigHome?: string,
): MachineInstallPlan {
  const hooksDir = machineHooksDir(home, xdgConfigHome);
  const hooksPathState = classifyHooksPath(currentHooksPath, hooksDir);
  return {
    hooksDir,
    hooksToWrite: [...ACTIVE_HOOKS, ...PASSTHROUGH_HOOKS],
    hooksPathState,
    safeToProceed: hooksPathState !== 'foreign',
  };
}

/** Copia los despachadores al directorio de hooks y los deja ejecutables. */
export function installMachineHooks(templatesDir: string, hooksDir: string): string[] {
  mkdirSync(hooksDir, { recursive: true });

  const written: string[] = [];
  const lib = join(templatesDir, '_devground-lib.sh');
  copyFileSync(lib, join(hooksDir, '_devground-lib.sh'));

  for (const hook of ACTIVE_HOOKS) {
    const dest = join(hooksDir, hook);
    copyFileSync(join(templatesDir, hook), dest);
    chmodSync(dest, 0o755);
    written.push(hook);
  }

  const passthrough = join(templatesDir, '_passthrough');
  for (const hook of PASSTHROUGH_HOOKS) {
    const dest = join(hooksDir, hook);
    copyFileSync(passthrough, dest);
    chmodSync(dest, 0o755);
    written.push(hook);
  }

  return written;
}

/** Hooks ya instalados en el directorio (para reportar una reinstalación). */
export function installedHooks(hooksDir: string): string[] {
  if (!existsSync(hooksDir)) return [];
  return readdirSync(hooksDir).filter((f) => !f.startsWith('_'));
}
