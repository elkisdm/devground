# @devground/tsconfig

Shared TypeScript configuration presets.

## Install

```bash
pnpm add -D @devground/tsconfig typescript
```

## Presets

| Preset | Use case |
|--------|----------|
| `base.json` | Strict mode, ES2017, bundler resolution |
| `next.json` | Next.js builds (extends base, **strict on**, bundler resolution) — default |
| `next-loose.json` | Migration ramp only (extends next, **strict off**) — temporary |
| `next-typecheck.json` | CI type checking (extends next, no incremental) |
| `astro.json` | Astro builds (extends `astro/tsconfigs/strict`, incremental) |
| `astro-typecheck.json` | CI type checking (extends astro, no incremental) |
| `node.json` | Node.js server projects |

> **ADR-0011:** `next.json` enforces `strict: true` by default. If you need a
> gradual adoption ramp for a legacy codebase, extend `next-loose.json`
> (`strict: false`) and migrate to `next.json` as soon as the code type-checks.

## Usage

In your `tsconfig.json`:

```json
{
  "extends": "@devground/tsconfig/next.json",
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

For Astro:

```json
{
  "extends": "@devground/tsconfig/astro.json",
  "include": [".astro/types.d.ts", "src/**/*.ts", "src/**/*.tsx", "src/**/*.astro"],
  "exclude": ["node_modules", "dist"]
}
```
