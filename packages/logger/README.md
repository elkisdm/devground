# @devground/logger

Tiny, dependency-free console logger with ANSI-colored levels, shared across
devground packages.

## Install

```bash
pnpm add @devground/logger
```

In the monorepo:

```json
{
  "dependencies": {
    "@devground/logger": "workspace:*"
  }
}
```

## Usage

```ts
import { header, log, info, success, warn, error } from '@devground/logger';

header('Setup');
info('Resolving dependencies…');
success('Done');
warn('Deprecated flag');
error('Something failed');
log('plain line');
```

## API

| Function           | Output                                            |
| ------------------ | ------------------------------------------------- |
| `header(text)`     | bold cyan title, padded with blank lines          |
| `log(message)`     | plain `console.log`                               |
| `info(message)`    | blue `i` prefix                                   |
| `success(message)` | green `✔` prefix                                  |
| `warn(message)`    | yellow `⚠` prefix                                 |
| `error(message)`   | red `✘` prefix, written to `console.error`        |

All output uses raw ANSI escape codes — no runtime dependencies.
