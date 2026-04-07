# @devground/devground

Todo devground en un solo paquete. Instala una vez, obtiene todo.

## Instalacion rapida

```bash
pnpm add -D @devground/devground eslint prettier typescript husky lint-staged @commitlint/cli
npx devground-setup
```

Eso es todo. En dos comandos tienes:

- Prettier configurado
- ESLint con flat config (detecta Next.js automaticamente)
- TypeScript con presets adecuados
- Commitlint con commits convencionales
- Lint-staged en pre-commit
- Husky con git hooks
- AGENTS.md + symlinks para Claude, Cursor, Copilot y Gemini

## Que hace `devground-setup`

1. Detecta tu stack (Next.js / React / Node.js)
2. Configura `prettier` y `lint-staged` en package.json
3. Escribe `eslint.config.mjs` (Next.js o base segun stack)
4. Escribe `tsconfig.json` (+ `tsconfig.typecheck.json` para Next.js)
5. Escribe `commitlint.config.js`
6. Inicializa Husky con pre-commit hook
7. Copia AGENTS.md + crea symlinks para todos los agentes de IA

**No sobreescribe archivos existentes.** Si ya tienes un `eslint.config.mjs` o `tsconfig.json`, los respeta.

## Instalacion individual

Si solo necesitas algunos paquetes, instalalos por separado:

```bash
pnpm add -D @devground/prettier-config
pnpm add -D @devground/eslint-config
pnpm add -D @devground/tsconfig
# etc.
```

Ver el [README principal](https://github.com/elkisdm/devground) para instrucciones detalladas de cada paquete.
