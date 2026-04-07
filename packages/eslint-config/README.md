# @devground/eslint-config

Shared ESLint flat config presets (ESLint v9+).

## Install

```bash
# Base config
pnpm add -D @devground/eslint-config eslint

# Next.js config
pnpm add -D @devground/eslint-config eslint eslint-config-next
```

## Usage

### Next.js

```js
// eslint.config.mjs
import nextConfig from '@devground/eslint-config/next';

export default nextConfig();
```

With custom ignores:

```js
import nextConfig from '@devground/eslint-config/next';

export default nextConfig({
  ignores: ['.next/**', 'node_modules/**', 'custom-dir/**'],
});
```

### Base (framework-agnostic)

```js
// eslint.config.mjs
import baseConfig from '@devground/eslint-config';

export default baseConfig();
```
