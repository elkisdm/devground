# devground-init

## 1.0.3

### Patch Changes

- 8cb5936: Arregla bugs que rompían la promesa de uso del CLI (hallados y re-verificados auditando el flujo con @devground/deepcheck):

  - **No sobreescribe tus configs.** Los instaladores de archivo de config (ESLint, Commitlint, TypeScript, lint-staged) ahora respetan un archivo preexistente: lo dejan intacto **y no instalan dependencias**, en vez de truncar tu config mientras dicen haberla respetado. Prettier respeta una clave `"prettier"` previa.
  - **lint-staged queda realmente configurado.** Antes escribía `"lint-staged": "@devground/lint-staged-config"` (un string) en package.json, que lint-staged rechaza en runtime. Ahora escribe `lint-staged.config.cjs` que re-exporta el config compartido.
  - **El código de salida refleja los fallos.** Si algún instalador falla, el CLI reporta el conteo real y sale con código distinto de 0 (antes siempre salía 0, ocultando fallos en CI).
  - **`--version` reporta la versión real** leída del package.json, no un literal hardcodeado.
  - **`--preset` inválido falla con un error claro** (`exit 1`) en vez de caer en silencio al prompt interactivo.
  - **Entornos no interactivos (CI / stdin sin TTY)** ahora exigen `--yes` o `--preset` y fallan con mensaje claro, en vez de salir con éxito habiendo instalado cero herramientas.
  - **Los errores de lectura de package.json** se reportan con su causa real (parse/permisos) en vez de culpar siempre a un manifest ausente.
  - **Docs sincronizadas** con el comportamiento real (tabla del CLI incluye Architecture guide; el inventario lista `lint-staged.config.cjs`).
  - **`package.json` inválido (no-objeto) falla con un error claro.** Un `package.json` que es JSON válido pero no un objeto plano (`[]`, escalar, `null`) ya no causa pérdida de datos (un array pasaba el guard y se truncaba al reescribir), ni un `TypeError` engañoso, ni un falso "archivo ausente". `readPackageJson` ahora valida en la raíz y lanza `package.json is not a valid object (got <tipo>)`.
  - **El resumen final ya no cuenta los instaladores omitidos como exitosos.** Antes "N tool(s) configured successfully" incluía los que se saltaron por config preexistente. Ahora el CLI cuenta `installed` / `skipped` / `failed` por separado y reporta honestamente (ej: "2 configured, 1 skipped (already present)"); el `exit 1` sigue solo si hubo fallos.

## 1.0.2

### Patch Changes

- Updated dependencies [38a68ec]
  - @devground/logger@0.2.0

## 1.0.1

### Patch Changes

- ff712ba: Initial public release of the devground toolkit.

  Publishes the 9 packages to the npm registry for the first time:

  - `@devground/devground` — all-in-one meta-package
  - `@devground/prettier-config` — shared Prettier configuration
  - `@devground/eslint-config` — ESLint flat config (base + Next.js)
  - `@devground/tsconfig` — TypeScript presets (base, next, next-typecheck, node)
  - `@devground/commitlint-config` — conventional commits configuration
  - `@devground/lint-staged-config` — staged-files linting rules
  - `@devground/husky-config` — git hooks setup
  - `@devground/agents-md` — AGENTS.md + multi-agent symlinks
  - `@devground/architecture-guide` — knowledge base + ADR generator
  - `devground-init` — interactive CLI scaffolder

  All packages now expose `publishConfig.access: public`, declare `engines.node >= 20`, and point to the correct GitHub repository (`elkisdm/devground`).
