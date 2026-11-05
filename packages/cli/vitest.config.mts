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
        lines: 87.23,
        functions: 90.27,
        branches: 87.31,
        statements: 88,
      },
    },
  },
});