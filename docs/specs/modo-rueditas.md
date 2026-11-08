# Modo rueditas: Claude te guía mientras construyes tu primer producto

**Clasificación**: feat · medium · riesgo medio (contrato público aditivo del CLI y paquete npm nuevo) · conocido · toca `packages/rueditas/` (nuevo), `packages/cli/src/`
**Tier**: 2 — Standard
**Origen**: Builder Labs, arnés del primer producto (`~/Developer/personal/elkisdev/docs/builder-labs/README.md` §4). Builder Labs es el consumidor real que pide ADR-0047.

## Objetivo

Una persona que nunca programó instala Devground con `devground-init --preset rueditas`. Desde ese momento, Claude la lleva por las 5 etapas del arnés (definir, diseñar, construir, comprobar y publicar, validar con alguien), le explica cada concepto la primera vez que aparece y gasta pocos tokens, porque la mayoría tendrá el plan más económico de Claude. Cuando ya no lo necesita, dice «quita las rueditas» y el modo desaparece sin dejar costo.

## Supuestos (corrígeme si alguno está mal)

- Es una **skill de proyecto**: está instalada solo en los proyectos de quien eligió el modo. Que esté instalada significa que el modo está encendido. No se agrega nada a `AGENTS.md`, que ya pesa 11,5 KB y se lee en cada mensaje.
- El contenido de la skill está en **español neutro**, porque su público es la comunidad hispanohablante. Los nombres de archivo y de paquete siguen la convención del repo.
- Paquete nuevo `@devground/rueditas`, con el mismo patrón que `@devground/ui-conventions`: `setup.js` copia la skill a `.claude/skills/` sin sobrescribir nada.
- El glosario para novatos es **nuevo** y distinto de `docs/glossary.md`. Ese explica las herramientas de Devground; este explica conceptos como base de datos, API, deploy, variable de entorno, dominio o commit.
- **Apagar** borra `.claude/skills/rueditas/` y deja intacto el archivo de progreso. Así el modo apagado cuesta cero tokens y se vuelve a encender con `npx devground-rueditas`.
- Para no depender de otro paquete se copia `copy-guarded.js` (40 líneas) de `ui-conventions`. Extraerlo a un paquete común queda fuera de alcance.

## Criterios de aceptación

- [ ] `devground-init --preset rueditas` instala todo lo de `full` más la skill `rueditas`.
- [ ] `--preset full`, `--yes` y el valor por defecto sin TTY **no** instalan rueditas. En el menú interactivo aparece desmarcada.
- [ ] `npx devground-rueditas` copia la skill a `.claude/skills/rueditas/` sin sobrescribir archivos existentes. Con `--global`, la copia va a `~`.
- [ ] Al usarse, la skill crea `.devground/rueditas.md` con la etapa actual, la ficha del producto y los conceptos vistos, y lo actualiza al avanzar.
- [ ] Un concepto que ya está en «conceptos vistos» no se vuelve a explicar.
- [ ] El glosario se consulta por término (una línea por término, que se encuentra con grep). No se lee entero.
- [ ] «Quita las rueditas» pide confirmación, borra `.claude/skills/rueditas/` y le dice al usuario cómo volver a encenderlo.
- [ ] Cada etapa deja un archivo verificable en `producto/` del proyecto del usuario (`ficha.md`, `recorrido.md`, `evidencia.md`, `validacion.md`; la etapa 3 deja commits) y termina con «Listo cuando», donde cada punto lleva su marca: `[revisas]` (lo comprueba Claude), `[evidencia]` (lo muestra la persona) o `[decide]` (lo elige la persona).
- [ ] Presupuesto de tokens, comprobado por tests: `SKILL.md` ≤ 6 KB, cada archivo de etapa ≤ 2 KB y cada línea del glosario ≤ 240 caracteres.

## Proceso paso a paso

El detalle de cada etapa (pasos, plantilla y validaciones) vive en `packages/rueditas/skills/rueditas/references/etapa-{1..5}.md`. La etapa 4 incluye publicar, porque la etapa 5 necesita una dirección en internet. Reglas del primer producto: un tipo de usuario, una función principal, como máximo tres pantallas y sin cuentas ni pagos salvo que sean la función principal.

## Cómo se comporta la skill (contenido de `SKILL.md`)

1. **Al empezar**: lee `.devground/rueditas.md`. Si no existe, lo crea y arranca en la etapa 1.
2. **En cada pedido**: dice en una o dos líneas qué va a hacer y por qué, y después lo hace. Si toca un concepto que no está en la lista de vistos, lo explica en una línea (con `grep` sobre `references/glosario.md`) y lo agrega a la lista.
3. **Etapas**: carga solo el archivo de la etapa actual (`references/etapa-N.md`). Cada uno trae el objetivo, una plantilla, qué hacer con el agente y el checklist de salida. Para avanzar a la siguiente etapa, el checklist tiene que estar cumplido y el usuario confirma.
4. **Ahorro**: no lanza subagentes. Arma un plan corto antes de construir. Al cerrar una etapa, sugiere empezar una conversación nueva (`/clear`), porque el progreso queda guardado en el archivo. No relee archivos que no necesita.
5. **Comprobar**: nunca da algo por terminado porque «compila». Pide evidencia de que el recorrido funciona: la prueba, la demo o el error.
6. **Apagar**: ante «quita las rueditas», confirma y borra su propia carpeta.

## Archivos y rutas a tocar (verificado contra el código: sí)

- `packages/rueditas/package.json` — nuevo — `@devground/rueditas`, bin `devground-rueditas`, `files` con `setup.js`, `skills/` y `lib/`.
- `packages/rueditas/setup.js` — nuevo — mismo flujo que `packages/ui-conventions/setup.js`.
- `packages/rueditas/lib/copy-guarded.js` (+ test) — nuevo — copia de `packages/ui-conventions/lib/copy-guarded.js`.
- `packages/rueditas/skills/rueditas/SKILL.md` — nuevo — el comportamiento de arriba.
- `packages/rueditas/skills/rueditas/references/etapa-{1..5}.md` — nuevo — una por etapa.
- `packages/rueditas/skills/rueditas/references/glosario.md` — nuevo — unos 40 conceptos, en formato `- **término**: explicación en una línea`.
- `packages/rueditas/skills/rueditas/references/progreso-plantilla.md` — nuevo — forma de `.devground/rueditas.md`.
- `packages/rueditas/README.md`, `CHANGELOG.md`, `vitest.config.mts` — nuevos.
- `packages/cli/src/select.ts` — modificar — `VALID_PRESETS` suma `rueditas`; `selectPresetValues` recibe la lista de instaladores opt-in y los excluye de `full`, de `--yes` y del valor por defecto.
- `packages/cli/src/run.ts` — modificar — entrada `rueditas` en `ALL_INSTALLERS` marcada como opt-in (`selected: false` en el menú).
- `packages/cli/src/installers/rueditas.ts` (+ test) — nuevo — mismo patrón que `installers/ui-conventions.ts`, pero en cualquier stack.
- `packages/cli/src/index.ts` — modificar — texto de ayuda de `--preset`.
- `packages/cli/README.md`, `README.md`, `docs/codemap.md` — fila y preset nuevos.
- `docs/adr/0048-modo-rueditas.md` — nuevo — por qué es una skill de proyecto y no reglas en `AGENTS.md`, el presupuesto de tokens y el apagado por borrado.

## Tests

- `packages/cli/src/select.test.ts`: `rueditas` es un preset válido; `rueditas` da todos los instaladores; `full`, `--yes` y el valor sin TTY excluyen los opt-in; `agents-only` no cambia.
- `packages/cli/src/installers/rueditas.test.ts`: instala y corre el bin; si la carpeta ya existe, devuelve `skipped`.
- `packages/rueditas/lib/copy-guarded.test.js`: no sobrescribe y cuenta los archivos escritos y omitidos.
- `packages/rueditas/test/contenido.test.js`: verifica el presupuesto de tamaños; que existan `etapa-1..5`; que cada etapa tenga «Listo cuando»; que el glosario tenga una línea por término sin duplicados; que la frontmatter de `SKILL.md` tenga `name: rueditas` y una descripción de 300 caracteres o menos; que `SKILL.md` mencione «quita las rueditas».

## Pre-mortem

- **Caminos**: el preset, `--yes`, el modo sin TTY, el menú interactivo y el bin directo (local y `--global`) están cubiertos. Volver a correrlo después de una actualización queda cubierto por `copy-guarded`.
- **Fallas**: si npx falla, el instalador devuelve `failed` y el tally sale con código 1, como hoy. Si `.devground/rueditas.md` está dañado, la skill lo reconstruye preguntando la etapa, sin perder lo que pueda leer.
- **Invariantes**: (1) `full` nunca instala opt-in → test en `select.test.ts`; (2) nunca se sobrescriben archivos → test de `copy-guarded`; (3) la skill respeta su presupuesto → test de contenido; (4) apagar no borra el progreso → regla escrita en `SKILL.md` y verificada en el test de contenido.
- **Simetrías**: encender (bin) y apagar (borrar la carpeta) son simétricos; reinstalar recupera el progreso porque el archivo sigue ahí.
- **Reutilización**: `copyDirGuarded`, `delegateWrote` y `resolveOps` ya existen. No hay un helper común de skills (fuera de alcance).
- **Consumidores**: `VALID_PRESETS` lo usan `exit.ts` (`presetIsValid`) e `index.ts` (mensaje de error), y ninguno cambia. `selectPresetValues` lo usa `resolveInstall`, y su firma cambia en ambos. `ALL_INSTALLERS` lo usa `chooseInstallers`, que cambia el `selected` del menú.
- **Datos reales**: no aplica. No hay datos previos; los proyectos existentes no tienen la carpeta.
- **Variantes**: los stacks (React, Next, Node, sin `package.json`) instalan la skill en cualquiera con `package.json`. En un repo sin `package.json` el CLI sale antes, como hoy; ahí se usa el bin directo.
- **Afirmaciones**: el README dice «7 presets» y «full instala todo», y hay que aclarar que rueditas es opt-in. La ayuda de `--preset` también cambia.

## Fuera de alcance

- El validador automático por tipo de producto (sale de este mismo arnés más adelante).
- Extraer `copy-guarded` a un paquete común.
- Traducir la skill al inglés.
- Publicar en npm (lo autoriza Elkis después del merge).

## Escenarios

**Preset opt-in**

- GIVEN un proyecto Node con `package.json`
- WHEN corre `devground-init --preset full`
- THEN no se instala `@devground/rueditas`; con `--preset rueditas` sí, junto con todo lo de `full`.

**Concepto explicado una sola vez**

- GIVEN `.devground/rueditas.md` con «base de datos» entre los conceptos vistos
- WHEN la tarea usa una base de datos
- THEN Claude no la vuelve a explicar (regla en `SKILL.md`, verificada a mano en la prueba en vivo).

**Apagar**

- GIVEN la skill instalada y un progreso guardado
- WHEN el usuario dice «quita las rueditas» y confirma
- THEN desaparece `.claude/skills/rueditas/`, `.devground/rueditas.md` sigue ahí y Claude explica cómo volver a encenderlo.

## Ejecución

| #   | Tarea                                                      | Agente            | Modelo · esfuerzo | Archivos                                                               | Entrega             |
| --- | ---------------------------------------------------------- | ----------------- | ----------------- | ---------------------------------------------------------------------- | ------------------- |
| 1   | Contenido de la skill (SKILL, etapas, glosario, plantilla) | orquestador       | sesión            | `packages/rueditas/skills/**`                                          | archivos            |
| 2   | Paquete, `setup.js`, `copy-guarded` y test de contenido    | ejecutor          | sonnet · medium   | `packages/rueditas/{package.json,setup.js,lib,test,vitest.config.mts}` | diff + tests verdes |
| 3   | Preset opt-in en el CLI e instalador                       | ejecutor          | sonnet · medium   | `packages/cli/src/{select,run,index}.ts`, `installers/rueditas.ts`     | diff + tests verdes |
| 4   | README, codemap, CHANGELOG y ADR-0048                      | ejecutor-mecanico | haiku · low       | docs                                                                   | diff                |

Las tareas 2 y 3 tocan carpetas distintas y corren en paralelo, después de la 1. La 4 va al final.

## Definition of Ready

- [x] El objetivo y los criterios son verificables.
- [x] Archivos y rutas verificados contra el código (`select.ts`, `run.ts`, `installers/ui-conventions.ts`, `ui-conventions/setup.js`, `lib/copy-guarded.js`).
- [x] Los supuestos de alto impacto están declarados (skill de proyecto, apagado por borrado, español).
- [x] Dependencias externas: publicar en npm, que requiere la autorización de Elkis.
- [x] NFR: costo (presupuesto de tokens con test), accesibilidad cognitiva (una idea por paso) y seguridad (la skill solo borra su propia carpeta).
