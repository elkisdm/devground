import { success, warn } from '@devground/logger';
import { resolveOps } from './ops.js';
import type { InstallerOptions, InstallResult } from '../types.js';

/**
 * Instala la skill @devground/ui-conventions (convenciones de UI como contexto ANTES de
 * generar frontend) SOLO en proyectos React/Next. En stacks sin UI (Node/librería) se omite:
 * la skill no aportaría nada. Mismo patrón que agents-md/architecture-guide: instala el paquete
 * y corre su bin, que copia la skill a .claude/skills/ (copia guardada, no sobreescribe).
 */
export function install(options: InstallerOptions): InstallResult {
  const { targetDir, stack } = options;
  const ops = resolveOps(options);

  if (stack.framework !== 'react' && stack.framework !== 'nextjs') {
    warn('UI conventions skill skipped: no React/Next.js frontend detected (left untouched).');
    return 'skipped';
  }

  ops.addDevDependency(targetDir, stack.packageManager, '@devground/ui-conventions');
  ops.run('npx devground-ui-conventions', targetDir);

  success('UI conventions skill installed at .claude/skills/ui-conventions');
  return 'installed';
}
