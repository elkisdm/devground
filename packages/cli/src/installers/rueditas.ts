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
  const output = ops.run('npx --yes --package=@devground/rueditas devground-rueditas', targetDir);

  if (!delegateWrote(output)) {
    // El bin avisa cuando la skill instalada no coincide con la del paquete
    // (versión anterior o editada): se repite aquí para que no quede escondido.
    if (output.includes('no coincide con esta versión')) {
      warn(
        'Rueditas: la skill instalada es distinta a esta versión (anterior o editada); no se tocó. ' +
          'Para actualizar: borra .claude/skills/rueditas/ y corre npx @devground/rueditas ' +
          '(el progreso en .devground/rueditas.md se conserva).',
      );
    } else {
      warn('Rueditas skill skipped: .claude/skills/rueditas already exists (left untouched).');
    }
    return 'skipped';
  }

  success('Rueditas skill installed at .claude/skills/rueditas');
  return 'installed';
}
