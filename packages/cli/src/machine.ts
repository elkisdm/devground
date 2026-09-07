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

/**
 * Eventos donde devground agrega comprobaciones propias, y la plantilla que
 * usa cada uno.
 *
 * `pre-merge-commit` comparte plantilla con `pre-commit` y NO es opcional: en
 * un merge que crea commit, git invoca `pre-merge-commit` y **no** cae de
 * vuelta a `pre-commit`. Sin él, `git merge` entra sin pasar por el escaneo de
 * secretos — un agujero con forma de merge en la garantía del ADR-0008.
 */
export const ACTIVE_HOOK_TEMPLATES: Record<string, string> = {
  'pre-commit': 'pre-commit',
  'pre-merge-commit': 'pre-commit',
  'commit-msg': 'commit-msg',
};

export const ACTIVE_HOOKS = Object.keys(ACTIVE_HOOK_TEMPLATES);

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
  'pre-rebase',
  'applypatch-msg',
  'pre-applypatch',
  'post-applypatch',
  'push-to-checkout',
  'sendemail-validate',
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

  for (const [hook, template] of Object.entries(ACTIVE_HOOK_TEMPLATES)) {
    const dest = join(hooksDir, hook);
    copyFileSync(join(templatesDir, template), dest);
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

/**
 * Raíces cubiertas, en la MISMA precedencia que aplica `_devground-lib.sh`:
 * lo pedido ahora > lo persistido en `git config devground.roots` > el default.
 *
 * Los tres niveles importan: si el reporte ignora lo persistido, una corrida
 * posterior sin `--roots` le dice al usuario que cubre `~/Developer` mientras
 * el hook cubre otra cosa — informar mal sobre un gate es casi tan malo como
 * no tenerlo.
 */
export function resolveRoots(
  requested: string | undefined,
  persisted: string | undefined,
  home: string,
): string {
  return requested?.trim() || persisted?.trim() || join(home, 'Developer');
}

export interface ReportLine {
  kind: 'info' | 'warn' | 'error' | 'success';
  text: string;
}

/**
 * Qué reportar, dado un plan. Devolver líneas en vez de imprimirlas mantiene
 * el comando como una cáscara delgada sobre lógica testeable — la lección del
 * WS4 del deepcheck de julio, donde la lógica metida en el entrypoint quedó
 * imposible de cubrir porque corre al importarse.
 */
export function machineReport(
  plan: MachineInstallPlan,
  roots: string,
  currentHooksPath: string | undefined,
): ReportLine[] {
  if (!plan.safeToProceed) {
    return [
      { kind: 'error', text: 'Esta máquina ya tiene un core.hooksPath global de otra herramienta:' },
      { kind: 'error', text: `  ${currentHooksPath ?? '(desconocido)'}` },
      { kind: 'info', text: 'devground no lo pisa. Opciones:' },
      { kind: 'info', text: '  1. Integra los despachadores de devground en ese directorio a mano.' },
      { kind: 'info', text: '  2. Libera el hook global:  git config --global --unset core.hooksPath' },
    ];
  }

  return [
    { kind: 'info', text: `Directorio de hooks : ${plan.hooksDir}` },
    { kind: 'info', text: `Repos cubiertos     : los que cuelguen de ${roots}` },
    { kind: 'info', text: '                      + cualquiera con un archivo .devground en su raíz' },
    { kind: 'info', text: 'Excluir un repo     : touch .devground-ignore en su raíz' },
  ];
}

/** Lo que se imprime tras una instalación exitosa. */
export function successReport(written: number): ReportLine[] {
  return [
    { kind: 'success', text: `${written} despachadores instalados y core.hooksPath global apuntando a ellos.` },
    {
      kind: 'info',
      text: 'Los repos con husky propio NO cambian: su core.hooksPath local gana sobre el global.',
    },
    {
      kind: 'info',
      text: 'Los hooks propios de cada repo (.git/hooks) siguen corriendo: el despachador encadena.',
    },
    { kind: 'info', text: 'Deshacer, en una línea:  git config --global --unset core.hooksPath' },
  ];
}
