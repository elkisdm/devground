import { join } from 'node:path';
import { success, warn } from '@devground/logger';
import { resolveOps } from './ops.js';
import { writeFileGuarded } from './write-guard.js';
import type { InstallerOptions, InstallResult } from '../types.js';

/**
 * Vitest + cobertura como estándar devground (ADR-0012, ADR-0025).
 *
 * Escribe un `vitest.config.mjs` que fusiona el preset compartido
 * (`@devground/vitest-config`, que aporta reporters, include/exclude y los
 * umbrales ALTOS de rutas críticas) y declara INLINE el piso global con
 * `autoUpdate: true` — el "ratchet". autoUpdate reescribe los umbrales del
 * archivo de config que Vitest carga; por eso el piso vive AQUÍ, en el repo del
 * consumidor (committeado), y no en el preset (node_modules, no committeable):
 * así el piso sube con la cobertura real y NUNCA regresa. El piso arranca en 0 a
 * propósito — el primer `test:coverage` lo siembra con la cobertura actual del
 * proyecto (sin romper repos con poca cobertura hoy) y de ahí solo puede subir.
 *
 * Añade los scripts `test` y `test:coverage` solo si no existen (no
 * sobreescribe los del usuario). No es un generador de tests: instala la red y
 * el gate; escribir los tests sigue siendo del desarrollador.
 */
export function install(options: InstallerOptions): InstallResult {
  const { targetDir, stack } = options;
  const ops = resolveOps(options);
  const configPath = join(targetDir, 'vitest.config.mjs');

  const configExists = ops.fileExists(configPath);

  // Si ya hay config, no tocamos nada de config ni deps — pero aún podemos
  // agregar los scripts faltantes (abajo), sin sobreescribir los existentes.
  if (!configExists) {
    ops.addDevDependency(
      targetDir,
      stack.packageManager,
      '@devground/vitest-config',
      'vitest',
      '@vitest/coverage-v8',
    );
  }

  // NOTA: se usa defineConfig + spread, NO mergeConfig. autoUpdate de Vitest
  // reescribe los umbrales con una transformación estática del archivo y falla
  // ("configuration file is too complex") cuando el config está envuelto en
  // mergeConfig. El spread mantiene el config plano para que el ratchet funcione
  // y a la vez hereda reporters/include/exclude + rutas críticas del preset.
  const configContent = `import { defineConfig } from 'vitest/config';
import base, { CRITICAL_THRESHOLDS } from '@devground/vitest-config';

// Umbrales de cobertura VIVOS en este repo (committeados). CRITICAL_THRESHOLDS
// (rutas dinero/leads/auth, ADR-0012) se hereda del preset; el piso GLOBAL con
// ratchet lo lleva este archivo: autoUpdate sube estos números a la cobertura
// real y nunca los baja (ADR-0025). Arrancan en 0 → el primer test:coverage
// los siembra con la cobertura actual del proyecto.
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    coverage: {
      ...base.test.coverage,
      thresholds: {
        ...CRITICAL_THRESHOLDS,
        autoUpdate: true,
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0,
      },
    },
  },
});
`;

  const wroteConfig = writeFileGuarded(ops, configPath, configContent, 'vitest.config.mjs');

  // Scripts: read-modify-write de package.json, agregando solo los ausentes.
  // test:coverage solo se agrega cuando ESTE installer provisiona la config/deps
  // de coverage (!configExists) — si el proyecto ya trae su propio
  // vitest.config.mjs, no sabemos si tiene @vitest/coverage-v8 instalado, y
  // agregar el script igual dejaría un `test:coverage` que revienta en runtime.
  const addedScripts = ensureScripts(ops, targetDir, /* includeCoverage */ !configExists);

  if (!wroteConfig && addedScripts.length === 0) {
    warn('Vitest coverage skipped: vitest.config.mjs and scripts already present (left untouched).');
    return 'skipped';
  }

  const parts = [
    wroteConfig ? 'vitest.config.mjs (ratchet + rutas críticas)' : null,
    addedScripts.length > 0 ? `scripts: ${addedScripts.join(', ')}` : null,
  ].filter(Boolean);
  success(`Vitest coverage configured — ${parts.join(' + ')}`);
  return 'installed';
}

/**
 * Adds `test`/`test:coverage` scripts to package.json, never overwriting
 * existing ones. `test:coverage` is only added when `includeCoverage` is true
 * (i.e. this installer just provisioned the coverage config/deps) — otherwise
 * a preexisting vitest.config.mjs might not have @vitest/coverage-v8, and the
 * script would fail at runtime.
 */
function ensureScripts(
  ops: ReturnType<typeof resolveOps>,
  targetDir: string,
  includeCoverage: boolean,
): string[] {
  const pkg = ops.readPackageJson(targetDir);
  const scripts = (
    typeof pkg.scripts === 'object' && pkg.scripts !== null ? pkg.scripts : {}
  ) as Record<string, string>;

  const wanted: Record<string, string> = { test: 'vitest run' };
  if (includeCoverage) wanted['test:coverage'] = 'vitest run --coverage';

  const added: string[] = [];
  for (const [name, cmd] of Object.entries(wanted)) {
    if (!(name in scripts)) {
      scripts[name] = cmd;
      added.push(name);
    }
  }

  if (added.length > 0) {
    ops.writePackageJson(targetDir, { ...pkg, scripts });
  }
  return added;
}
