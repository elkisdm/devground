# Contributing to devground

Gracias por considerar contribuir. Este documento describe el flujo de trabajo, las convenciones y lo que esperamos de cada PR.

## Tabla de contenidos

- [Filosofia del proyecto](#filosofia-del-proyecto)
- [Antes de abrir un PR](#antes-de-abrir-un-pr)
- [Setup local](#setup-local)
- [Flujo de trabajo](#flujo-de-trabajo)
- [Convenciones de commit](#convenciones-de-commit)
- [Tests](#tests)
- [Changesets](#changesets)
- [Tipos de contribucion bienvenidas](#tipos-de-contribucion-bienvenidas)
- [Que NO aceptamos](#que-no-aceptamos)
- [Codigo de conducta](#codigo-de-conducta)

## Filosofia del proyecto

devground es **opinado a proposito**. Las decisiones de diseño priorizan:

1. **Cero configuracion por defecto** — si tu proyecto es estandar, no deberias tener que tocar nada.
2. **No sobreescribir** — los archivos existentes del usuario son sagrados.
3. **Modularidad** — cada paquete se puede usar de forma independiente.
4. **Portabilidad** — si quitas devground, las herramientas (ESLint, Prettier, TS) siguen funcionando con sus configs nativas.
5. **Dogfooding** — el repo usa sus propios paquetes.

Toda contribucion deberia alinearse con estos principios. Si tu PR los rompe, espera pushback.

## Antes de abrir un PR

**Para cambios no triviales** (features nuevas, refactor de un paquete, cambios en la API publica), **abri un issue primero** describiendo:

- **Problema** que resuelve
- **Propuesta** de solucion
- **Alternativas** consideradas

Esto evita PRs grandes que terminan rechazados por desalineacion con el roadmap.

**Para fixes pequeños o mejoras de documentacion**, podes ir directo a PR.

## Setup local

Requisitos: **Node ≥20**, **pnpm ≥10**.

```bash
git clone https://github.com/elkisdm/devground.git
cd devground
pnpm install
pnpm build
pnpm test
```

Si todo pasa, estas listo.

## Flujo de trabajo

1. Forkea el repo y clona tu fork.
2. Crea una rama desde `main`: `git checkout -b feat/mi-feature`.
3. Implementa el cambio + tests.
4. Corre `pnpm typecheck && pnpm test && pnpm build` antes de commitear.
5. Crea un changeset: `pnpm changeset` (ver [seccion Changesets](#changesets)).
6. Commit con mensaje convencional (ver [Convenciones de commit](#convenciones-de-commit)).
7. Push y abri PR contra `main`.
8. Espera review. Responde feedback con cambios incrementales, no force-push.

## Convenciones de commit

Usamos **commits convencionales** (validados por `@devground/commitlint-config`):

| Prefijo | Cuando usar |
|---------|-------------|
| `feat:` | Feature nueva |
| `fix:` | Bug fix |
| `docs:` | Solo documentacion |
| `test:` | Agregar o modificar tests |
| `refactor:` | Cambio sin alterar comportamiento |
| `chore:` | Tareas de mantenimiento (deps, config) |
| `ci:` | Cambios en CI/CD |
| `perf:` | Mejora de rendimiento |

**Ejemplos validos:**

```
feat(cli): add --dry-run flag to preview changes
fix(eslint-config): respect ignores option in next preset
docs(readme): clarify monorepo compatibility
```

**Reglas:**
- Tipo en minusculas, obligatorio.
- Subject sin punto final.
- Header maximo 100 caracteres.
- Scope opcional pero recomendado: nombre del paquete sin el prefijo `@devground/`.

## Tests

**Toda contribucion al CLI requiere tests.** No se aceptan PRs sin cobertura del codigo nuevo.

Stack de tests: [Vitest](https://vitest.dev/).

```bash
pnpm --filter devground-init test          # corre una vez
pnpm --filter devground-init test:watch    # modo watch
```

**Que debe testearse:**
- Funciones puras: tests unitarios directos.
- Operaciones sobre filesystem: usa `mkdtempSync` + `tmpdir()` para tests aislados.
- No mockees lo que podes correr de verdad. Si la funcion lee un archivo, escribi un archivo temporal y leelo.

**Que NO debe testearse:**
- Dependencias externas (commander, prompts) — confiamos en sus tests.
- Output de `console.log` exacto — testea comportamiento, no formato.

## Changesets

Cada cambio publicable necesita un **changeset**. Es un archivo markdown que describe el cambio + bump de version.

```bash
pnpm changeset
```

El comando te pregunta:
1. Que paquetes cambian.
2. Tipo de bump por paquete (`patch` / `minor` / `major`).
3. Descripcion del cambio (va al CHANGELOG).

**Cuando es `patch`:** bug fixes, mejoras internas sin cambio de API.
**Cuando es `minor`:** features nuevas retrocompatibles.
**Cuando es `major`:** breaking changes en API publica. **Requiere justificacion en el issue previo.**

Si tu PR es solo docs o solo CI, no necesitas changeset.

## Tipos de contribucion bienvenidas

| Tipo | Que esperamos |
|------|----------------|
| **Bug fix** | Test que reproduce el bug + fix. PR vinculado a issue. |
| **Nuevo paquete** | Issue previo aceptado + paquete con README + tests + changeset |
| **Mejora de doc** | PR directo sin issue esta OK |
| **Nuevo ADR template** | Sigue el formato de los existentes en `packages/architecture-guide/knowledge/adr/` |
| **Traduccion** | Coordina por issue antes para no duplicar esfuerzos |
| **Preset nuevo** (otro framework, otro stack) | Issue previo con justificacion de demanda + propuesta de API |

## Que NO aceptamos

- PRs sin issue previo para features grandes.
- Cambios que rompen retrocompatibilidad sin un changeset `major` justificado.
- "Estilo personal" como motivacion (ej. "yo prefiero tabs"). Las decisiones son comunitarias.
- Dependencias nuevas sin justificacion clara (cada dep es deuda).
- PRs que mezclan multiples cambios no relacionados — separa en PRs atomicos.
- Force-push despues de iniciada la review (rompe el historial de discusion).
- Cambios en CI/release sin discusion previa.

## Codigo de conducta

Discusiones tecnicas, no personales. Critica al codigo, no a quien lo escribio.

- **Asumi buena fe.** Si algo te suena hostil, releelo. Probablemente sea diferencia cultural o de idioma.
- **Argumenta con evidencia.** "Esto es mejor porque X" gana sobre "esto es mejor".
- **Aceptar feedback es parte del oficio.** Los reviewers no son enemigos.
- **No toleramos** acoso, discriminacion, ni ataques personales. Reportalo a los maintainers.

## ¿Dudas?

Abri un [Discussion](https://github.com/elkisdm/devground/discussions) o un issue con label `question`. Respondemos lo antes posible.
