# Novedades — dreaming, coverage ratchet y ecosistema ui-conventions

**Rama**: `feat/dreaming-package` → `main`
**Fecha**: 2026-07-11

## 1. Resumen

| Pieza | Qué es | ADR |
| --- | --- | --- |
| `@devground/dreaming` | Consolidación de memoria fuera de banda para Claude Code | — (sin ADR propio, ya en `main..HEAD` antes de esta tanda) |
| Coverage ratchet | Installer `vitest` en `devground-init` + hook `pre-push` + umbrales críticos | ADR-0022 |
| `@devground/ui-conventions` | Skill de convenciones de UI como contexto previo a generar código | ADR-0023 |
| Integración de ecosistema | 5 conexiones que enchufan ui-conventions al resto de devground | ADR-0024 |

Este deploy trae 4 commits nuevos sobre los 2 de `dreaming` que ya estaban en la rama.

## 2. @devground/dreaming

Ya estaba en la rama (commits `24aabb6` y `2fbbcef`), incluido aquí como contexto porque forma parte de lo que se va a mostrar.

Es consolidación de memoria "fuera de banda": revisa las transcripciones de sesión recientes de un proyecto contra su almacén de memoria y propone un *diff revisado* — fusionar duplicados, deprecar memorias obsoletas o contradichas, agregar patrones recurrentes que nunca se capturaron, y corregir el drift del índice `MEMORY.md`. **Nada se escribe sin aprobación explícita; nada se borra, solo se archiva.**

Tres actores separados deliberadamente:
1. **El harness** (`devground-dreaming gather`) hace la parte barata y determinística: selecciona las transcripciones de la ventana, las destila a su columna conversacional + señales de error de herramientas, y toma una foto de la memoria actual. Está portado a TypeScript compilado (antes era Python) y reutiliza el lector de transcripciones y los helpers de memoria de `@devground/dev-metrics` en vez de duplicar el parseo de JSONL.
2. **La skill** (`dreaming`) razona sobre el bundle: encuentra duplicados, memorias obsoletas, patrones no capturados y drift de índice, y escribe una propuesta con evidencia (session id + fecha) por cada cambio.
3. **Tú** eres el gate de aprobación: la skill se detiene en la propuesta y aplica solo lo que apruebes, ítem por ítem.

Instalación: `npx @devground/dreaming` (proyecto) o `npx @devground/dreaming --global`. Estado según su propio README: "Incubación — piloto privado, sin publicar" (`version: 0.0.0` en `package.json`, aunque el paquete no está marcado `private` y ya tiene un changeset `minor` pendiente).

## 3. Coverage ratchet (ADR-0022)

**El problema**: ADR-0012 fijó tests obligatorios en rutas críticas (dinero/leads/auth), pero dejó el gate de CI como "recomendado, no implementado" y el umbral crítico sin cablear en ningún preset. La telemetría de desarrollo confirmó el punto ciego: los commits de test dedicados rondan ~2% y no crecen mes a mes.

**La tensión**: se quería "ampliar la cobertura siempre", pero un umbral global alto y fijo (ej. 90% de todo) es justo lo que ADR-0012 rechaza — produce tests de relleno (getters, mappers) que dan falsa confianza.

**La solución — un ratchet, no un umbral fijo**:

- **Rutas críticas (fijas, compartidas)**: `@devground/vitest-config` ahora exporta `CRITICAL_GLOBS` + `CRITICAL_THRESHOLDS` (90% líneas/funciones/statements, 85% ramas) sobre rutas de dinero/leads/auth. Viven en el preset porque son estándar, no preferencia por repo.
- **Piso global con ratchet (por repo)**: el nuevo installer `vitest` de `devground-init` scaffoldea un `vitest.config.mjs` que hereda el preset por *spread* (no `mergeConfig` — `autoUpdate` de Vitest hace una transformación estática del archivo y falla con configs envueltos en `mergeConfig`) e inyecta `thresholds: { autoUpdate: true, lines: 0, functions: 0, branches: 0, statements: 0 }`. `autoUpdate` reescribe esos números a la cobertura real cuando la supera, y nunca los baja. Arrancan en 0 para no romper un repo con poca cobertura hoy.
- **Enforcement en dos niveles**: gate **duro** en CI (`pnpm -r test:coverage`, bloqueante, salta paquetes sin el script) y hook **suave** `pre-push` en `@devground/husky-config` que corre coverage y avisa si no alcanza, pero nunca bloquea (`SKIP_COVERAGE=1` para omitir). Mismo patrón de degradación que gitleaks en pre-commit (ADR-0008): la garantía dura la da CI, lo local solo avisa.
- El installer agrega los scripts `test` y `test:coverage` sin sobreescribir un `test` existente.

## 4. ui-conventions (ADR-0023)

**El problema**: las convenciones de interfaz (componentes propios vs. primitivas del navegador, formateo de inputs, accesibilidad, estados de error/carga, microinteracciones, reglas regionales como RUT/teléfono/moneda en Chile) se aplicaban como auditoría posterior e iterativa — el código se generaba primero y se corregía después contra una checklist. La mayoría de esas desviaciones son mecánicas y conocidas de antemano (falta `aria-label` en un botón icon-only, `type="number"` en vez de `inputMode="numeric"`, RUT sin validar el dígito verificador).

**La solución**: empaquetar las convenciones como una skill instalable (`@devground/ui-conventions`, mismo patrón que `design-taste`) que se carga como contexto **antes** de generar o editar UI, no después. Dos capas:

1. Una **base universal** (`references/base.md`) con reglas válidas para cualquier stack.
2. Un **overlay opcional por proyecto** (`docs/ui-conventions.md` en el repo consumidor), minable del código real con un prompt de minería incluido (`references/mining-prompt.md`) y un template (`references/overlay-template.md`). Cuando existe, el overlay **tiene precedencia** sobre la base.

La skill incluye una §5 de mantenimiento del overlay: quien lo usa es quien lo mantiene actualizado, mismo principio que ya rige el codemap.

**Instalación**: `npx @devground/ui-conventions` (proyecto, en `.claude/skills/`) o `npx @devground/ui-conventions --global`.

## 5. Integración con el ecosistema (ADR-0024)

Aislada, la skill tenía tres huecos: no se auto-disparaba en sesiones orquestadas (un subagente `ejecutor` recibe un brief, no un prompt interactivo, así que ninguna skill de Claude Code se dispara por keyword), no había ciclo de retroalimentación entre lo que un audit encontraba y la base/overlay, y reglas mecánicamente verificables gastaban tokens de LLM en vez de resolverse con lint. ADR-0024 cierra los tres huecos con cinco conexiones puntuales:

1. **Checklist UI/FRONTEND en `model-orchestrator`**: inyectado *aditivamente* por superficie frontend detectada en la tarea (no es un `kind` nuevo, el ruteo de modelo no cambia). Así llega también a sesiones orquestadas.
2. **Dimensión `aud-ui-conventions` en deepcheck** (13ª del array `DIMENSIONS[]`, guardada: solo corre en flujos que tocan UI). Audita la base más el overlay del proyecto si existe, y lleva la regla de promoción en el rationale del hallazgo: repetido ≥2 veces en el mismo proyecto → promover a overlay; convergente entre proyectos → promover a base. Cierra el ciclo de retroalimentación.
3. **Preset opt-in `./ui` en `@devground/eslint-config`**: `jsx-a11y` en modo `error` (alineado a base.md §3) más `no-restricted-syntax`/`no-restricted-imports` parametrizables (`warn`) para empujar primitivas propias y una capa única de iconos. Lo determinista se resuelve con lint, no gastando tokens del LLM en cada generación.
4. **Paquete `@devground/chile-formats`**: helpers es-CL sin dependencias runtime — RUT (formateo con puntos y guion, validación módulo 11), teléfono (+56 9), moneda/UF/número vía `Intl.NumberFormat('es-CL')` memoizado. Código reutilizable pesa menos que instrucción reutilizable.
5. **Installer `ui-conventions` en `devground-init`**: instala el paquete y corre su bin solo si detecta stack React/Next; en Node/librería se omite (no aportaría nada). Se suma un puntero en `AGENTS.md` §9 para agentes no-Claude que no cargan skills de Claude Code.

## 6. Fuera del repo

Tres proyectos ya tienen su overlay `docs/ui-conventions.md` minado y commiteado: **Rentix**, **Capital Academy** (`Capitalacademy`) y **hclp** (`hclp-capitalinteligente`).

## 7. Cómo se publica

El repo publica con `changesets` (`@changesets/cli`) vía el workflow `.github/workflows/release.yml`: en cada push a `main`, corre `pnpm install`, `pnpm build`, y `changesets/action@v1`, que o bien abre un PR de "Version Packages" (si hay changesets pendientes) o publica a npm con `pnpm publish-packages` (`changeset publish`) cuando ese PR se mergea. Provenance de npm vía OIDC (`id-token: write`).

Flujo esperado: merge de esta rama a `main` → CI corre → se abre (o actualiza) el PR de "Version Packages" → al mergear ese PR, se publican los paquetes con bump pendiente.

Changesets pendientes que trae este deploy:

| Changeset | Paquete(s) | Bump |
| --- | --- | --- |
| `coverage-ratchet.md` | `devground-init`, `@devground/vitest-config`, `@devground/husky-config` | minor |
| `ui-conventions-skill.md` | `@devground/ui-conventions` | minor |
| `chile-formats-package.md` | `@devground/chile-formats` | minor |
| `eslint-config-ui-preset.md` | `@devground/eslint-config` | minor |
| `cli-ui-conventions-installer.md` | `devground-init` | minor |
| `agents-md-ui-pointer.md` | `@devground/agents-md` | patch |

`npx changeset status` sobre el estado actual del repo (incluye changesets previos a esta rama que seguían pendientes) reporta:

- **patch**: `@devground/agents-md`, `@devground/devground`
- **minor**: `@devground/chile-formats`, `devground-init`, `@devground/vitest-config`, `@devground/husky-config`, `@devground/design-taste`, `@devground/dev-metrics`, `@devground/dreaming`, `@devground/eslint-config`, `@devground/ui-conventions`
- **major**: ninguno

## 8. Versión corta para compartir

- `@devground/dreaming`: consolidación de memoria fuera de banda para Claude Code — propone un diff revisado de tu memoria, nunca escribe sin tu aprobación.
- Coverage ratchet (ADR-0022): nuevo installer `vitest` que scaffoldea un piso de cobertura que solo puede subir (nunca baja), más gate duro en CI y aviso suave en `pre-push`.
- `@devground/ui-conventions` (ADR-0023): las convenciones de UI ahora se cargan como contexto *antes* de generar código, no como corrección posterior — base universal + overlay por proyecto.
- Integración de ecosistema (ADR-0024): las convenciones de UI ahora llegan a sesiones orquestadas, se auditan con `aud-ui-conventions` en deepcheck (con ciclo de promoción overlay↔base), y lo mecánico (a11y, primitivas, iconos) se valida con un preset de eslint en vez de gastar tokens del LLM.
- Nuevo paquete `@devground/chile-formats`: RUT, teléfono y moneda es-CL sin dependencias.
- Instalación de todo lo nuevo vía `devground-init`: `npx devground-init` y eliges `vitest` y/o `ui-conventions` (auto-skip fuera de React/Next).
