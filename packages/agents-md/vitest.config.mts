import { defineConfig, mergeConfig } from 'vitest/config';
import base from '@devground/vitest-config';

// El paquete es JS plano (.mjs/.js, sin build), así que el include del preset
// (src/**/*.test.ts) se reemplaza por los tests reales del paquete.
export default mergeConfig(
  base,
  defineConfig({
    test: {
      include: ['hooks/**/*.test.mjs', 'tests/**/*.test.mjs'],
      coverage: {
        include: ['hooks/**/*.mjs', 'install-hooks.js'],
        exclude: ['hooks/**/*.test.mjs', 'hooks/run-hook.test-helper.mjs'],
      },
    },
  }),
);
