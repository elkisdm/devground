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
    },
  },
});
