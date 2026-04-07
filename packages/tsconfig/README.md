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
| `next.json` | Next.js dev builds (extends base, strict off) |
| `next-typecheck.json` | CI type checking (extends next, no incremental) |
| `node.json` | Node.js server projects |

## Usage

In your `tsconfig.json`:

```json
{
  "extends": "@devground/tsconfig/next.json",
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```
