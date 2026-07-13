---
'@devground/dev-metrics': patch
---

Fix the pnpm install warning in workspace consumers ("Failed to create bin … dist/index.js").

The `dev-metrics` bin now points to a committed shim (`bin/dev-metrics.js`) that exists before `tsc` runs, so pnpm can link it at install time. The shim delegates to `dist/index.js` and fails with a clear "run `pnpm build`" message when the package hasn't been compiled yet. Published behaviour is unchanged (`dist/` ships as before; `bin/` is now included).
