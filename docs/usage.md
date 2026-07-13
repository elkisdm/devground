# Uso detallado por paquete

Cada paquete tiene su propio README con instalacion, configuracion y reglas completas. Esta pagina es el indice: usa los enlaces para ir al detalle de cada uno sin duplicar documentacion.

## Presets de configuracion (parte del agregador `@devground/devground`)

| Paquete | Que documenta su README |
|---------|--------------------------|
| [`@devground/devground`](../packages/devground#readme) | Meta-paquete agregador: `devground-setup`, que configura automaticamente, alcance del bundle |
| [`@devground/prettier-config`](../packages/prettier-config#readme) | Instalacion + reglas de formateo (semicolons, single quotes, print width 100, etc.) |
| [`@devground/eslint-config`](../packages/eslint-config#readme) | Presets base, Next.js y Astro, ESLint Flat Config v9, ignores personalizados, `max-lines` y `no-explicit-any` |
| [`@devground/tsconfig`](../packages/tsconfig#readme) | Presets `base`, `next`, `next-typecheck`, `astro`, `astro-typecheck`, `node` con su matriz de `strict`/`incremental` y ejemplos |
| [`@devground/commitlint-config`](../packages/commitlint-config#readme) | Commits convencionales: tipos permitidos y reglas de header |
| [`@devground/lint-staged-config`](../packages/lint-staged-config#readme) | Patrones de archivos staged y acciones (`eslint --fix`, `prettier --write`) |
| [`@devground/husky-config`](../packages/husky-config#readme) | Git hooks: pre-commit con gitleaks + commit-msg, `devground-husky` |
| [`@devground/agents-md`](../packages/agents-md#readme) | Generacion de `AGENTS.md`, symlinks multi-agente, `PROMPT.md`, compatibilidad Windows |

## Paquetes standalone (no forman parte del agregador)

| Paquete | Que documenta su README |
|---------|--------------------------|
| [`@devground/architecture-guide`](../packages/architecture-guide#readme) | Knowledge base + ADRs (`devground-architecture`, `devground-adr new`). Conceptos explicados en [docs/architecture-concepts.md](architecture-concepts.md) |
| [`@devground/dev-metrics`](../packages/dev-metrics#readme) | CLI de metricas de desarrollo con agentes (velocidad, calidad, eficiencia) |
| [`@devground/logger`](../packages/logger#readme) | Logger minimalista compartido (sin dependencias) |
| [`@devground/vitest-config`](../packages/vitest-config#readme) | Config Vitest compartida (entorno node, cobertura v8) |

> **Skills y paquetes Swift**: además de los presets y standalone de arriba, el monorepo
> incluye skills instalables (`@devground/sdd` spec-flow, `@devground/design-taste`,
> `@devground/ui-conventions`, `@devground/deepcheck` en piloto privado y
> `@devground/dreaming` publicado en `0.x`), helpers es-CL (`@devground/chile-formats`)
> y la familia Swift/iOS (`@devground/swift-ci`,
> `swift-design-tokens`, `swift-format-config`, `swift-package-template`). El inventario vivo
> de qué vive dónde está en [docs/codemap.md](codemap.md) y en la tabla de
> [Paquetes del README](../README.md#paquetes).

---

## CLI `devground-init`

El CLI que orquesta todo.

```bash
npx devground-init [opciones]
```

| Opcion | Descripcion |
|--------|-------------|
| `--preset full` | Instalar todo sin preguntas |
| `--preset agents-only` | Solo AGENTS.md + symlinks |
| `-y, --yes` | Skip prompts, instalar todo |
| `-V, --version` | Mostrar version |
| `-h, --help` | Mostrar ayuda |

**Deteccion automatica de stack:**

| Detecta | Como |
|---------|------|
| Framework | `next` en deps → Next.js, `astro` sin `next` → Astro, `react` sin `next`/`astro` → React, otro → Node.js |
| TypeScript | `typescript` en devDependencies |
| Package manager | `pnpm-lock.yaml` / `yarn.lock` / `package-lock.json` |

La deteccion determina que preset de ESLint y TSConfig usar automaticamente. Astro tiene prioridad sobre React porque cualquier componente React dentro de un proyecto Astro se ejecuta como isla — el preset Astro es el paraguas correcto en ese caso. README completo del CLI: [`packages/cli`](../packages/cli#readme).

---

## Reglas de desarrollo incluidas

El `AGENTS.md` que genera devground contiene **10 reglas** de desarrollo probadas en produccion:

| # | Regla | Resumen |
|---|-------|---------|
| 1 | **TDD estricto** | Ciclo obligatorio Red (test que falla) → Green (implementacion minima) → Refactor. Ninguna feature se considera completa sin tests. |
| 2 | **Commits convencionales + atomicos** | Prefijos estandar (`feat:`, `fix:`, `test:`, etc.). Cada commit = una idea completa. Facilita reviews, `git bisect` y rollbacks. |
| 3 | **Documentacion continua** | Comentarios en codigo, JSDoc en funciones publicas, mensajes de commit descriptivos, docs/ para features complejas. |
| 4 | **Piramide de testing** | Muchos unit tests rapidos en la base, pocos E2E lentos en la punta. Mantener el equilibrio. |
| 5 | **Zero dead code** | Borrar, nunca comentar. Confiar en `git log` para recuperar. Sin archivos, funciones, variables o imports sin usar. |
| 6 | **Error handling consistente** | Try-catch en API routes, errores descriptivos en servicios, nunca silenciar errores sin documentar por que. |
| 7 | **ADR (Architecture Decision Records)** | Documentar el **por que** de cada decision arquitectonica en `docs/ADR/`. Context → Decision → Consequences → Alternatives. |
| 8 | **READMEs en directorios complejos** | `README.md` en carpetas con logica no obvia para facilitar onboarding. |
| 9 | **Tokens semanticos en UI** | Nunca hardcodear colores. Usar tokens como `bg-card`, `text-foreground`, `border-border`. Siempre dark mode compatible. |
| 10 | **Helper `cn()` obligatorio** | Usar `cn()` (clsx + tailwind-merge) para combinar clases CSS. Sin concatenacion fragil de strings. |

### Estandares de seguridad y calidad (ADR 0007–0012)

Mas alla de las 10 reglas de `AGENTS.md`, el repo documenta 6 estandares de seguridad y calidad como ADRs. Varios tienen **enforcement automatico** (hook pre-commit o reglas de ESLint); el resto son convenciones que un proyecto adopta segun su contexto. Detalle completo en [docs/adr/](adr/).

| # | Estandar | Enforcement |
| --- | --- | --- |
| [0007](adr/0007-rate-limiting-distribuido.md) | Rate-limiting distribuido obligatorio en rutas API/webhooks (serverless) | Documental (revision en PR) |
| [0008](adr/0008-higiene-de-secretos.md) | Higiene de secretos: gitleaks pre-commit + politica de `.gitignore` | **Automatico**: hook `pre-commit` con gitleaks |
| [0009](adr/0009-validacion-entrada-webhooks.md) | Validacion de entrada en toda ruta API + verificacion de firma en webhooks | Documental (revision en PR) |
| [0010](adr/0010-limite-tamano-modulo-funcion.md) | Limite de tamano de modulo/funcion + container-presentational | **Automatico**: ESLint `max-lines` (400) y `max-lines-per-function` (80) |
| [0011](adr/0011-prohibido-any-fronteras-externas.md) | Prohibido `any` en fronteras externas (DB/API) | **Automatico**: ESLint `no-explicit-any` + `no-restricted-syntax` |
| [0012](adr/0012-tests-rutas-criticas.md) | Tests obligatorios en rutas criticas (dinero, leads, auth) | Documental (gate de CI recomendado) |

---

[← Volver al README](../README.md)
