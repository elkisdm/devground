import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { error, header, info, log, success, warn } from '@devground/logger';

import {
  installMachineHooks,
  machineReport,
  planMachineInstall,
  resolveRoots,
  successReport,
  type ReportLine,
} from './machine.js';

/** Lee una clave global de git, o undefined si no está configurada. */
function readGlobalConfig(key: string): string | undefined {
  try {
    return (
      execFileSync('git', ['config', '--global', '--get', key], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim() || undefined
    );
  } catch {
    // git sale con 1 cuando la clave no existe: eso es "sin configurar", no un error.
    return undefined;
  }
}

const PRINTERS = { info, warn, error, success } as const;

function print(lines: ReportLine[]): void {
  for (const line of lines) PRINTERS[line.kind](line.text);
}

/**
 * `devground-init machine` — instala el estándar UNA VEZ para toda la máquina
 * (ADR-0034), en vez de repo por repo.
 *
 * Cáscara delgada a propósito: toda decisión y todo texto viven en `machine.ts`,
 * que sí es testeable. Acá solo quedan los efectos.
 */
export function runMachineCommand(opts: { roots?: string; dryRun?: boolean }): void {
  header('devground — instalación a nivel de máquina');

  const home = homedir();
  const current = readGlobalConfig('core.hooksPath');
  const plan = planMachineInstall(home, current, process.env.XDG_CONFIG_HOME);
  // Lo persistido cuenta: el hook lo lee, así que el reporte tiene que leerlo
  // también o le miente al usuario sobre qué repos quedan cubiertos.
  const roots = resolveRoots(opts.roots, readGlobalConfig('devground.roots'), home);

  print(machineReport(plan, roots, current));

  if (!plan.safeToProceed) {
    process.exit(1);
  }

  if (opts.dryRun) {
    log('');
    warn('--dry-run: no se escribió nada.');
    info(`Se habrían instalado ${plan.hooksToWrite.length}: ${plan.hooksToWrite.join(', ')}`);
    return;
  }

  // __dirname es dist/ en runtime (salida CommonJS): las plantillas quedan un
  // nivel arriba, junto al manifiesto del paquete.
  const written = installMachineHooks(join(__dirname, '..', 'templates', 'machine'), plan.hooksDir);

  execFileSync('git', ['config', '--global', 'core.hooksPath', plan.hooksDir]);
  if (opts.roots?.trim()) {
    execFileSync('git', ['config', '--global', 'devground.roots', roots]);
  }

  log('');
  print(successReport(written.length));
  log('');
}
