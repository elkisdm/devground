# @devground/vitest-config

Shared [Vitest](https://vitest.dev) configuration for devground packages.

## Install

```bash
pnpm add -D @devground/vitest-config vitest
```

In the monorepo:

```json
{
  "devDependencies": {
    "@devground/vitest-config": "workspace:*"
  }
}
```

## Usage

Extend it with `mergeConfig` so you keep the shared defaults and can override
per package:

```ts
// vitest.config.ts
import { mergeConfig, defineConfig } from 'vitest/config';
import shared from '@devground/vitest-config';

export default mergeConfig(
  shared,
  defineConfig({
    // package-specific overrides go here
  }),
);
```

Or re-export it directly when no overrides are needed:

```ts
export { default } from '@devground/vitest-config';
```

## What it sets

- `environment: 'node'`
- `globals: false` — import test APIs explicitly from `vitest`
- `include: ['src/**/*.test.ts']`
- v8 coverage profile (`text` + `html` reporters) that excludes build output,
  declarations, configs and the test files themselves

Coverage is opt-in: the v8 provider only loads when you pass `--coverage`, so a
plain `vitest run` works even without `@vitest/coverage-v8` installed.
