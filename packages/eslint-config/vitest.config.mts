import preset from '@devground/vitest-config';
import { defineConfig } from 'vitest/config';

// Los presets son .mjs en la raiz del paquete, no en src/.
export default defineConfig({
  ...preset,
  test: { ...preset.test, include: ['*.test.mjs'] },
});
