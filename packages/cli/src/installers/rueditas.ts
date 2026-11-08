import { success, warn } from '@devground/logger';
import { resolveOps } from './ops.js';
import { delegateWrote } from './delegate.js';
import type { InstallerOptions, InstallResult } from '../types.js';

/**
 * Instala la skill @devground/rueditas (Claude guía a quien empieza por las 5 etapas del primer
 * producto). Es OPT-IN (solo con `--preset rueditas` o marcada en el menú) y funciona en CUALQUIER
 * stack: no depende del framework. Mismo patrón que ui-conventions: instala el paquete y corre su
 * bin, que copia la skill a .claude/skills/ (copia guardada, no sobreescribe).
 */
export function install(options: InstallerOptions): InstallResult {
  const { targetDir, stack } = options;
  const ops = resolveOps(options);

  ops.addDevDependency(targetDir, stack.packageManager, '@devground/rueditas');
  const output = ops.run('npx devground-rueditas', targetDir);

  if (!delegateWrote(output)) {
    warn('Rueditas skill skipped: .claude/skills/rueditas already exists (left untouched).');
    return 'skipped';
  }

  success('Rueditas skill installed at .claude/skills/rueditas');
  return 'installed';
}
