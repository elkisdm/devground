import { join } from 'node:path';
import { success, warn } from '@devground/logger';
import { resolveOps } from './ops.js';
import { findExistingConfig, withExts } from './config-detect.js';
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

  const existingConfig = findVitestConfig(ops, targetDir);
  const configExists = existingConfig !== undefined;

  // Si ya hay config, no tocamos nada de config ni deps — pero aún podemos
  // agregar los scripts faltantes (abajo), sin sobreescribir los existentes.
  if (!configExists) {
    ops.addDevDependency(
      targetDir,
      stack.packageManager,
      ...coverageDeps(ops.readPackageJson(targetDir)),
    );
  }

  const wroteConfig = configExists
    ? false
    : writeFileGuarded(
        ops,
        configPath,
        configContent(stack.hasTypeScript, detectCodeRoots(ops, targetDir)),
        'vitest.config.mjs',
      );

  // Scripts: read-modify-write de package.json, agregando solo los ausentes.
  // test:coverage solo se agrega cuando ESTE installer provisiona la config/deps
  // de coverage (!configExists) — si el proyecto ya trae su propio
  // vitest.config.mjs, no sabemos si tiene @vitest/coverage-v8 instalado, y
  // agregar el script igual dejaría un `test:coverage` que revienta en runtime.
  const addedScripts = ensureScripts(ops, targetDir, /* includeCoverage */ !configExists);

  if (!wroteConfig && addedScripts.length === 0) {
    warn(
      `Vitest coverage skipped: ${existingConfig ?? 'vitest.config.mjs'} and scripts already present (left untouched).`,
    );
    return 'skipped';
  }

  const parts = [
    wroteConfig ? 'vitest.config.mjs (ratchet + rutas críticas)' : null,
    addedScripts.length > 0 ? `scripts: ${addedScripts.join(', ')}` : null,
  ].filter(Boolean);
  success(`Vitest coverage configured — ${parts.join(' + ')}`);
  return 'installed';
}

const CONFIG_EXTS = ['js', 'mjs', 'cjs', 'ts', 'mts', 'cts'];

/**
 * Config de vitest previa: `vitest.config.*`, o un `vite.config.*` que declare
 * una sección `test` (Vitest lo carga igual).
 */
function findVitestConfig(
  ops: ReturnType<typeof resolveOps>,
  targetDir: string,
): string | undefined {
  const dedicated = findExistingConfig(ops, targetDir, {
    files: withExts('vitest.config', CONFIG_EXTS),
  });
  if (dedicated) return dedicated;
  for (const file of withExts('vite.config', CONFIG_EXTS)) {
    const path = join(targetDir, file);
    if (ops.fileExists(path) && /(^|[\s,{])test\s*:/m.test(ops.readFile?.(path) ?? '')) return path;
  }
  return undefined;
}

/**
 * Dev dependencies del installer, alineadas con lo que el proyecto YA declara.
 *
 * `@vitest/coverage-v8` tiene que ir en el mismo major que `vitest`: pedir el
 * latest (v4) sobre un proyecto con vitest 3 instala un provider que revienta al
 * arrancar ("does not provide an export named 'BaseCoverageProvider'"). Cuando
 * el proyecto ya declara vitest, se respeta ESE rango y no se agrega vitest de
 * nuevo — subir el rango ajeno no es tarea de este installer.
 */
export function coverageDeps(pkg: Record<string, unknown>): string[] {
  const declared = declaredRange(pkg, 'vitest');
  const pinnable = declared !== undefined && isPinnable(declared);
  return [
    '@devground/vitest-config',
    // Si el proyecto ya declara vitest (aunque sea con workspace:/catalog:), no
    // se vuelve a agregar: subirle el rango a un repo ajeno no es tarea de acá.
    ...(declared === undefined ? ['vitest'] : []),
    pinnable ? `@vitest/coverage-v8@${declared}` : '@vitest/coverage-v8',
  ];
}

/** Rango declarado para `name` en package.json (dev primero), si existe. */
function declaredRange(pkg: Record<string, unknown>, name: string): string | undefined {
  const asRecord = (value: unknown): Record<string, string> =>
    typeof value === 'object' && value !== null ? (value as Record<string, string>) : {};
  return asRecord(pkg.devDependencies)[name] ?? asRecord(pkg.dependencies)[name];
}

/**
 * Un rango sirve para alinear coverage-v8 solo si expresa una versión de npm.
 * `workspace:*`, `catalog:`, `link:`, `file:`, `latest` o `*` no dicen qué major
 * es: en esos casos se pide el paquete sin rango y resuelve el package manager.
 */
function isPinnable(range: string): boolean {
  if (/^(workspace|catalog|link|file|npm|git|github|https?):/.test(range)) return false;
  return /\d/.test(range);
}

// Raíces de código candidatas; el monorepo (packages/<x>/src) se detecta por la carpeta `packages`.
const CODE_ROOTS: Array<{ dir: string; glob: string }> = [
  { dir: 'src', glob: 'src' },
  { dir: 'app', glob: 'app' },
  { dir: 'lib', glob: 'lib' },
  { dir: 'components', glob: 'components' },
  { dir: 'packages', glob: 'packages/*/src' },
];

// Globs de las raíces de código que existen en el proyecto destino.
function detectCodeRoots(ops: ReturnType<typeof resolveOps>, targetDir: string): string[] {
  return CODE_ROOTS.filter(({ dir }) => ops.fileExists(join(targetDir, dir))).map(
    ({ glob }) => glob,
  );
}

/**
 * Contenido del `vitest.config.mjs` del consumidor. El preset solo mira la
 * carpeta src en TypeScript, así que sus globs se sobreescriben cuando el proyecto usa otras
 * raíces (`app/`, `components/`, `lib/`, monorepo) o es JavaScript: sin esto
 * `vitest run` no encuentra tests y la cobertura mide cero archivos o ignora
 * código real. Si la única raíz es `src` en TS, se hereda el preset.
 */
function configContent(hasTypeScript: boolean, detected: string[]): string {
  const onlySrc = detected.length === 0 || (detected.length === 1 && detected[0] === 'src');
  const roots = detected.length > 0 ? detected : ['src', 'packages/*/src'];
  const overrides = !(hasTypeScript && onlySrc);
  const exts = hasTypeScript ? '{ts,tsx}' : '{js,jsx}';
  const testExt = `test.${exts}`;
  const list = (items: string[]): string => items.map((i) => `'${i}'`).join(', ');

  const testGlobs = !overrides
    ? ''
    : `    // Globs sobreescritos según las raíces de código detectadas al instalar
    // (el preset solo mira src/). Ajústalos si agregas otras carpetas de código.
    include: [${list(roots.map((r) => `${r}/**/*.${testExt}`))}],
`;
  const coverageGlobs = !overrides
    ? ''
    : `      include: [${list(roots.map((r) => `${r}/**/*.${exts}`))}],
      exclude: [
${roots.map((r) => `        '${r}/**/*.${testExt}',\n`).join('')}        '**/*.d.ts',
        '**/dist/**',
        '**/node_modules/**',
        '**/*.config.*',
      ],
`;

  // NOTA: se usa defineConfig + spread, NO mergeConfig. autoUpdate de Vitest
  // reescribe los umbrales con una transformación estática del archivo y falla
  // ("configuration file is too complex") cuando el config está envuelto en
  // mergeConfig. El spread mantiene el config plano para que el ratchet funcione
  // y a la vez hereda reporters/include/exclude + rutas críticas del preset.
  return `import { defineConfig } from 'vitest/config';
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
${testGlobs}    coverage: {
      ...base.test.coverage,
${coverageGlobs}      thresholds: {
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
