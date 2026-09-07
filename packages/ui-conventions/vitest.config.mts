import preset from '@devground/vitest-config';
import { defineConfig } from 'vitest/config';

/**
 * El preset compartido apunta a `src/**` porque asume un paquete TypeScript.
 * Este paquete es CommonJS puro (`setup.js` + `lib/`), así que extiende el
 * `include` sin `mergeConfig`: ADR-0025 documenta que envolver el config rompe
 * la transformación estática del ratchet de cobertura.
 */
export default defineConfig({
  ...preset,
  test: {
    ...preset.test,
    include: ['lib/**/*.test.js'],
  },
});
