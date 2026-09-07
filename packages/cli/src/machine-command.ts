import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { error, header, info, log, success, warn } from '@devground/logger';

import { installMachineHooks, planMachineInstall } from './machine.js';

/** Lee `core.hooksPath` global, o undefined si no está configurado. */
function readGlobalHooksPath(): string | undefined {
  try {
    return execFileSync('git', ['config', '--global', '--get', 'core.hooksPath'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    // git sale con 1 cuando la clave no existe: eso es "sin configurar", no un error.
    return undefined;
  }
}

/**
 * `devground-init machine` — instala el estándar UNA VEZ para toda la máquina
 * (ADR-0034), en vez de repo por repo.
 */
export function runMachineCommand(opts: { roots?: string; dryRun?: boolean }): void {
  header('devground — instalación a nivel de máquina');

  const home = homedir();
  const plan = planMachineInstall(home, readGlobalHooksPath(), process.env.XDG_CONFIG_HOME);

  if (!plan.safeToProceed) {
    error('Esta máquina ya tiene un core.hooksPath global de otra herramienta:');
    error(`  ${readGlobalHooksPath()}`);
    log('');
    info('devground no lo pisa. Opciones:');
    info('  1. Integra los despachadores de devground en ese directorio a mano.');
    info('  2. Libera el hook global:  git config --global --unset core.hooksPath');
    process.exit(1);
  }

  const roots = opts.roots?.trim() || join(home, 'Developer');

  info(`Directorio de hooks : ${plan.hooksDir}`);
  info(`Repos cubiertos     : los que cuelguen de ${roots}`);
  info('                      + cualquiera con un archivo .devground en su raíz');
  info('Excluir un repo     : touch .devground-ignore en su raíz');

  if (opts.dryRun) {
    log('');
    warn('--dry-run: no se escribió nada.');
    info(`Se habrían instalado ${plan.hooksToWrite.length} despachadores: ${plan.hooksToWrite.join(', ')}`);
    return;
  }

  // __dirname es dist/ en runtime (salida CommonJS): las plantillas quedan un
  // nivel arriba, junto al manifiesto del paquete.
  const templatesDir = join(__dirname, '..', 'templates', 'machine');
  const written = installMachineHooks(templatesDir, plan.hooksDir);

  execFileSync('git', ['config', '--global', 'core.hooksPath', plan.hooksDir]);
  if (opts.roots?.trim()) {
    execFileSync('git', ['config', '--global', 'devground.roots', roots]);
  }

  log('');
  success(`${written.length} despachadores instalados y core.hooksPath global apuntando a ellos.`);
  log('');
  info('Los repos con husky propio NO cambian: su core.hooksPath local gana sobre el global.');
  info('Los hooks propios de cada repo (.git/hooks) siguen corriendo: el despachador encadena.');
  log('');
  info('Deshacer, en una línea:');
  info('  git config --global --unset core.hooksPath');
  log('');
}
