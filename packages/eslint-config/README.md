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

> **ADR-0011 / TypeScript:** la regla `no-restricted-syntax` con selector
> `TSAnyKeyword` solo matchea si el parser entiende TypeScript. Para que aplique
> a archivos `.ts`/`.tsx`, instala el parser (peerDependency **opcional**):
>
> ```bash
> pnpm add -D @typescript-eslint/parser
> ```
>
> Si no lo instalas, el preset base sigue siendo válido para JS puro, pero la
> regla queda inerte sobre TS. El preset `next` no lo necesita: ya trae el
> parser vía `eslint-config-next/typescript`.
