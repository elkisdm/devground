import { defineConfig } from 'vitest/config';

/**
 * Shared Vitest config for devground packages.
 *
 * Authored as plain ESM (.mjs) so it can be imported at config-load time by
 * any supported Node version (Node 20 cannot load a raw .ts config). Node
 * environment, no globals, and an opt-in v8 coverage profile.
 *
 * Consume with `mergeConfig` so packages can extend (e.g. tweak `include`).
 */
/**
 * Rutas críticas (ADR-0012): dinero, leads/conversión y auth. Se exigen con un
 * umbral ALTO y FIJO —igual en todos los proyectos— porque un hueco ahí cuesta
 * dinero o reputación. Es deliberadamente estrecho: cobertura profunda en lo
 * crítico, NO ancha y superficial (ADR-0012 rechaza el umbral global alto).
 *
 * Vive en el preset compartido (no en el config del consumidor) porque es el
 * estándar, no una preferencia por-repo: no debe ratchetear ni relajarse.
 */
export const CRITICAL_GLOBS =
  '**/{payments,pricing,billing,checkout,commission,refund,auth,session,leads,webhooks,risk}/**';

export const CRITICAL_THRESHOLDS = {
  [CRITICAL_GLOBS]: { lines: 90, functions: 90, statements: 90, branches: 85 },
};

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    globals: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.d.ts',
        '**/dist/**',
        '**/node_modules/**',
        '**/*.config.*',
      ],
      // Los umbrales solo se exigen cuando se recolecta cobertura
      // (`--coverage` / `test:coverage`), NO en un `vitest run` normal → añadir
      // esto no rompe el `pnpm -r test` existente. El piso GLOBAL con ratchet
      // (autoUpdate) lo pone el config del consumidor que escribe el CLI, para
      // que se committee y suba EN SU repo (ver ADR-0025); aquí solo van las
      // rutas críticas fijas, que son estándar y no deben ratchetear.
      thresholds: {
        ...CRITICAL_THRESHOLDS,
      },
    },
  },
});
