import { defineConfig } from 'vitest/config';
import base, { CRITICAL_THRESHOLDS } from '@devground/vitest-config';

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    coverage: {
      ...base.test.coverage,
      thresholds: {
        ...CRITICAL_THRESHOLDS,
        autoUpdate: true,
        lines: 71.79,
        functions: 80.64,
        branches: 94.69,
        statements: 71.79,
      },
    },
  },
});