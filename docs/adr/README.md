# ADRs de devground

Decisiones arquitectónicas del propio repo `devground-1`.

A diferencia de [knowledge/adr/](../../knowledge/adr/) — que contiene templates genéricos derivados de transcripciones externas — estos ADRs documentan **decisiones reales tomadas en este repo**, con estado `Aceptado`.

## Formato

Sigue el mismo formato que [knowledge/adr/README.md](../../knowledge/adr/README.md): Michael Nygard, una decisión por ADR, inmutables.

## Crear un ADR nuevo

Copia [0000-template.md](0000-template.md), renómbralo a `NNNN-titulo-en-kebab-case.md` con el
siguiente número de la secuencia, rellénalo y añádelo al índice de abajo.

## Índice

- [ADR-0001 — pnpm workspace en lugar de npm/yarn](0001-pnpm-workspace.md)
- [ADR-0002 — Changesets para versionado y publicación](0002-changesets-versioning.md)
- [ADR-0003 — ESLint v9 Flat Config](0003-eslint-flat-config.md)
- [ADR-0004 — TypeScript strict por defecto](0004-typescript-strict.md)
- [ADR-0005 — Husky + lint-staged para git hooks](0005-husky-lint-staged.md)
- [ADR-0006 — dev-metrics: serie temporal de "codificar con agentes"](0006-dev-metrics.md) (Propuesto)
- [ADR-0007 — Rate-limiting distribuido obligatorio](0007-rate-limiting-distribuido.md) (Propuesto)
- [ADR-0008 — Higiene de secretos (gitleaks pre-commit + política de .gitignore)](0008-higiene-de-secretos.md) (Propuesto)
- [ADR-0009 — Validación de entrada en toda ruta API + firma en webhooks](0009-validacion-entrada-webhooks.md) (Propuesto)
- [ADR-0010 — Límite de tamaño de módulo/función + container-presentational](0010-limite-tamano-modulo-funcion.md) (Propuesto)
- [ADR-0011 — Prohibido `any` en fronteras externas (DB/API)](0011-prohibido-any-fronteras-externas.md) (Propuesto)
- [ADR-0012 — Tests obligatorios en rutas críticas](0012-tests-rutas-criticas.md) (Propuesto)
- [ADR-0013 — Sistema de agentes de auditoría auto-mejorable (deepcheck)](0013-sistema-de-agentes-de-auditoria.md) (Propuesto)

## Estándares con enforcement automático

Estos ADRs no son solo documentación: tienen control automático en el repo.

| ADR | Enforcement | Dónde |
| --- | --- | --- |
| 0008 | Hook pre-commit con gitleaks + política de `.gitignore` | `.husky/pre-commit`, `packages/husky-config/hooks/pre-commit.sh`, `.gitignore` |
| 0010 | Reglas `max-lines` (400) y `max-lines-per-function` (80) como `warn` | `packages/eslint-config/index.mjs`, `next.mjs` |
| 0011 | `@typescript-eslint/no-explicit-any` (`warn`) + `no-restricted-syntax` para `any` en base | `packages/eslint-config/next.mjs`, `index.mjs` |
