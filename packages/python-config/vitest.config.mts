import preset from '@devground/vitest-config';
import { defineConfig } from 'vitest/config';

// Paquete CommonJS puro: el preset apunta a src/**, aquí la lógica vive en lib/.
export default defineConfig({
  ...preset,
  test: { ...preset.test, include: ['lib/**/*.test.js'] },
});
