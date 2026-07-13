#!/usr/bin/env node
// Committed shim so pnpm can link the bin at install time, before `tsc`
// generates dist/ (the real entry). Without it, workspace consumers like
// @devground/dreaming get a "Failed to create bin" warning on install.
const { existsSync } = require('node:fs');
const { join } = require('node:path');

const entry = join(__dirname, '..', 'dist', 'index.js');
if (!existsSync(entry)) {
  console.error('dev-metrics: dist/ is missing. Run `pnpm build` in packages/dev-metrics first.');
  process.exit(1);
}
require(entry);
