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
        lines: 87.91,
        functions: 90.62,
        branches: 95.19,
        statements: 87.91,
      },
    },
  },
});