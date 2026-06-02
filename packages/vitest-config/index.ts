import { defineConfig } from 'vitest/config';

/**
 * Shared Vitest config for devground packages.
 *
 * Node environment, no globals (tests import from `vitest` explicitly), and a
 * v8 coverage profile that excludes build output, type declarations, configs
 * and the test files themselves. Coverage is opt-in: the v8 provider is only
 * loaded when a package runs with `--coverage`, so a plain `vitest run` keeps
 * working even if `@vitest/coverage-v8` is not installed.
 *
 * Consume it with `mergeConfig` so packages can extend (e.g. tweak `include`)
 * without losing these defaults.
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
