import preset from '@devground/vitest-config';
import { defineConfig } from 'vitest/config';

/**
 * Paquete CommonJS puro: el preset apunta a src/**, aquí la lógica vive en lib/.
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
    include: ['lib/**/*.test.js'],
    coverage: { ...preset.test?.coverage, include: ['lib/**/*.js'] },
  },
});
