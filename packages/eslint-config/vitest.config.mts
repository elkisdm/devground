import preset from '@devground/vitest-config';
import { defineConfig } from 'vitest/config';

/**
 * Los presets son .mjs en la raíz del paquete, no en src/.
 *
 * Se extiende con `defineConfig` y no con `mergeConfig`: ADR-0025 documenta que
 * envolver el config rompe la transformación estática del ratchet de cobertura.
 * `coverage.include` también se redirige — dejarlo en `src/**` reportaría cero
 * archivos y el gate del ADR-0025 pasaría sin medir nada.
 */
export default defineConfig({
  ...preset,
  test: {
    ...preset.test,
    include: ['*.test.mjs'],
    coverage: { ...preset.test?.coverage, include: ['*.mjs'] },
  },
});
