# spec-flow v0.6: pre-mortem en la spec y cota al ciclo de revisión

**Classification**: feat · large · risk med · known · touches `~/.claude/skills/spec-flow/` (canónica), `packages/sdd/`, `packages/dev-metrics/`, `docs/adr/`
**Tier**: 3 — Full
**Fecha**: 2026-09-14 · **Extiende**: ADR-0029 (tests como DoD), ADR-0036 (review como DoD)

## Goal

Que una implementación que pasa por spec-flow llegue **en una o dos pasadas de review** al
estado que hoy alcanza después de muchas, porque la spec ya escribió lo que el revisor va a
buscar (caminos, fallas, invariantes, simetrías) y porque el ciclo de revisión tiene una cota
y un ledger en vez de ser un bucle abierto. Y que se pueda **medir** si funcionó.

## Evidencia que motiva el cambio (medida el 2026-09-14)

- 73 sesiones con `/code-review`, 171 invocaciones; **44% itera ≥2 veces**, 15 sesiones ≥3,
  máximos 18 (atlas) y 14 (Operacionrenta). 68/73 pasaron por spec-flow en la misma sesión.
- En atlas, **10 de 16 pasadas completas** reportan hallazgos "consecuencia de mi corrección
  anterior"; una pieza nacida en la pasada 12 sin invariante escrito apareció en las 4
  siguientes. En Operacionrenta el mismo bug volvió 3-5 rondas hasta un **rediseño** (ronda 8).
- 42/66 hallazgos estructurados son `correctness` y caen en cinco familias sin sección en el
  brief: caminos no cubiertos, modos de falla de dependencias, invariantes bajo
  concurrencia/tiempo, asimetrías (lectura/escritura, presupuesto/estado) y tests que no prueban.
- El tope del revisor (15, o 10 vía ReportFindings) **censura** `review.findings`: la
  distribución es 13 ceros, un bloque de 10 y varios 24. "10" significa "al menos 10".
- 116 `assumption_reversed` sobre 1.129 specs (10%); 112 de 116 en Tier 2-3.
- Costo aprox. (precios Opus, cota superior): ~US$198 por invocación; sesiones con ≥2 reviews
  gastan ~US$766 en subagentes vs ~US$226 las de una.

## Assumptions made (correct me if wrong)

1. La fuente de verdad de la skill es `~/.claude/skills/spec-flow/` y `packages/sdd/skill/` es
   el espejo (verificado en `packages/sdd/scripts/sync-spec-flow.mjs`). Se edita la canónica y
   se sincroniza con `pnpm --filter @devground/sdd sync`.
2. El pre-mortem es obligatorio **solo desde Tier 2**. Tier 1 no cambia: 3 de 116 reversiones
   fueron Tier 1 y la fricción en Tier 0-1 es el ancla de la skill.
3. La "revisión de la spec" (design gate) en Tier 2 es una autocomprobación del main loop con
   la misma checklist; en Tier 3 la hace un agente de solo lectura (`planner-deep`, Opus, ya
   existe; se le pide abrir su plan con los huecos de la spec)
   con el brief y el code map. Delegar sigue siendo opt-in (ADR-0030): el gate de Tier 3 se
   **propone** al usuario, y si lo rechaza se hace como en Tier 2.
4. La cota es **2 pasadas por defecto, 3 como máximo**, y la tercera solo existe después de
   volver a la spec y rediseñar la pieza que causó hallazgos inducidos.
5. El revisor forkeado (`/code-review`) **hereda el contexto de la conversación** (verificado:
   "Skill launched (forked execution)"), así que el ledger de hallazgos diferidos se le pasa
   escribiéndolo en la conversación antes de lanzar la pasada, sin archivo nuevo ni cambios al
   skill nativo.
6. No se toca `/code-review` ni su tope: se cambia cómo se invoca (alcance por pasada) y cómo se
   interpreta (`findings_capped`).
7. `chile-formats`, deepcheck y model-orchestrator no cambian; deepcheck ya tiene la dimensión
   `aud-premortem` y spec-flow la cita como origen del enfoque en vez de duplicarla.

## Acceptance criteria

- [ ] Un brief Tier 2+ producido con v0.6 tiene la sección `### Pre-mortem` con sus cinco
      filas (caminos, fallas, invariantes, simetrías, reutilización), cada una llena o con
      `n/a — <motivo>` en una línea.
- [ ] Cada invariante del pre-mortem nombra el test que lo rompe, y el DoD exige que ese test
      se haya visto **fallar con el arreglo revertido** antes de declararlo verificado.
- [ ] La sección `### Review` es un ledger por pasada (alcance, hallazgos, cerrados, diferidos
      con motivo, refutados con motivo, inducidos) y el flujo se detiene en 2 pasadas salvo
      rediseño documentado; nunca pasa de 3.
- [ ] El evento `spec` emite `premortem` y `spec_review`; el evento `review` emite
      `level, passes, findings, findings_capped, found_total, induced, resolved, open,
    redesigned, tests`; `dev-metrics` los parsea (tolerando ausentes y valores malformados
      como `"pending"`, que cuentan como "sin cierre") y los reporta según el modelo de datos
      de "Design › Lectura de la telemetría".
- [ ] Un evento v0.5 o anterior sigue parseando exactamente igual (test de regresión).
- [ ] Tier 0 y Tier 1 no ganan ninguna sección ni paso obligatorio nuevo.
- [ ] `SKILL.md` crece como máximo ~120 líneas netas; el detalle vive en
      `references/premortem-and-review-loop.md` (carga bajo demanda).
- [ ] Existe ADR-0037 (Aceptado al mergear), changesets minor para `@devground/sdd` y
      `@devground/dev-metrics`, y un eval nuevo derivado de un cambio real.

## Files & routes to touch (verified against code: yes)

| Path                                                                   | Acción | Qué cambia                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `~/.claude/skills/spec-flow/SKILL.md`                                  | modify | versión 0.6; plantilla Step 3 (+`### Pre-mortem` Tier 2+, `### Review` como ledger); nuevo **Step 3.6 — Design gate**; Step 4 DoD de tests (ambos sentidos, fakes con contrato) y "Review as the closing gate" reescrito (pasadas, alcance, cota, censura del tope, arreglos por clase); Step 6 campos nuevos; 3 anti-patrones |
| `~/.claude/skills/spec-flow/references/premortem-and-review-loop.md`   | new    | checklist detallada de las cinco filas con preguntas espejo de los 11 ángulos de `/code-review`, protocolo del ledger, regla de parada, ejemplo real (atribución GHL de atlas)                                                                                                                                                 |
| `~/.claude/skills/spec-flow/references/examples.md`                    | modify | Example C (Tier 3) gana pre-mortem + ledger; nota en la heurística de calibración                                                                                                                                                                                                                                              |
| `~/.claude/skills/spec-flow/references/measurement-design.md`          | modify | revisión v0.6: nuevas señales y la pregunta causal "¿el pre-mortem baja los hallazgos de la 1ª pasada?"                                                                                                                                                                                                                        |
| `~/.claude/skills/spec-flow/evals/tier2-premortem-atribucion-ghl.json` | new    | caso real: `expected_premortem` con los caminos alta/reingreso/backfill/histórico/sync que la revisión encontró después                                                                                                                                                                                                        |
| `~/.claude/skills/spec-flow/evals/README.md`                           | modify | documenta el campo `expected_premortem`                                                                                                                                                                                                                                                                                        |
| `packages/sdd/skill/**`                                                | sync   | `pnpm --filter @devground/sdd sync`                                                                                                                                                                                                                                                                                            |
| `packages/sdd/README.md`                                               | modify | sección "qué hace" menciona pre-mortem y cota                                                                                                                                                                                                                                                                                  |
| `.changeset/spec-flow-v06.md`                                          | new    | minor `@devground/sdd`, minor `@devground/dev-metrics`                                                                                                                                                                                                                                                                         |
| `packages/dev-metrics/src/lib/spec-flow-events.ts`                     | modify | `review` gana `passes`, `findingsCapped`, `induced`, `redesigned`; `premortem`; `num()` tolerante a strings no numéricos (hoy `"pending"` → 0 en silencio)                                                                                                                                                                     |
| `packages/dev-metrics/src/lib/spec-flow-events.test.ts`                | modify | casos: evento 0.4, 0.5, 0.6, `"pending"`, campos parciales                                                                                                                                                                                                                                                                     |
| `packages/dev-metrics/src/lib/spec-flow-report.ts` (+test)             | modify | bloque "Review loop": mediana de pasadas, % de cambios con ≤2 pasadas, tasa de `findings_capped`, tasa de inducidos, hallazgos 1ª pasada con vs sin pre-mortem                                                                                                                                                                 |
| `packages/dev-metrics/README.md`                                       | modify | documenta las señales nuevas                                                                                                                                                                                                                                                                                                   |
| `docs/adr/0037-premortem-en-la-spec-y-cota-al-ciclo-de-revision.md`    | new    | decisión + evidencia + alternativas                                                                                                                                                                                                                                                                                            |
| `docs/adr/README.md`                                                   | modify | fila del índice                                                                                                                                                                                                                                                                                                                |
| `docs/codemap.md`                                                      | modify | filas sdd (v0.6) y dev-metrics                                                                                                                                                                                                                                                                                                 |
| `.spec-flow/events.jsonl`                                              | append | el evento de este mismo cambio, ya en formato 0.6                                                                                                                                                                                                                                                                              |

Referencias externas a numeración de pasos que **no** se rompen: `tools/model-orchestrator/patches/spec-flow-step-3.5.md` inserta entre Step 3 y Step 4; el nuevo Step 3.6 va **después** de 3.5 y antes de 4, así que el patch sigue aplicando.

## Tests

- `spec-flow-events.test.ts`: (a) evento v0.4 sin `review` → `review` undefined; (b) v0.5 objeto
  → campos nuevos undefined/false, sin romper; (c) v0.6 completo → todos los campos; (d)
  `findings:"pending"` → `findings` undefined, no 0; (e) `premortem:"n/a"` y `true`/`false`.
- `spec-flow-report.test.ts`: bloque "Review loop" con 3 eventos sintéticos (uno capped, uno con
  inducidos, uno sin review) → agregados correctos y ausencia del bloque cuando no hay datos.
- Verificación en ambos sentidos (dogfood del DoD nuevo): el test (d) debe fallar si se revierte
  la tolerancia de `num()`.
- La skill no tiene tests ejecutables; el eval nuevo es el artefacto de regresión, y la prueba
  real es correr este mismo cambio con el flujo v0.6 (design gate + ledger).
- Cobertura: `pnpm test:coverage` en dev-metrics no baja (ratchet).

## Review (ledger, se llena al implementar)

**Pasada 1** — `/code-review max` sobre `2db5dff..061966b` (rama completa). Una corrida
murió por límite de uso (no cuenta); la segunda completó: **15 hallazgos confirmados, tope
alcanzado** (`findings_capped: true`), 3 recortados por el tope, 1 refutado. Agrupados por
causa raíz:

| Causa                                          | Hallazgos                                                                                                                                                                                                              | Cierre                                                                                                                                                                          |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Telemetría definida sin definir cómo se lee | #1 momento de emisión, #2 deuda `findings > resolved`, #3 sin grupo de control ni detección de cinco `n/a`, #14 `tests:"added"` cumple en T2+, recorte (c) ejemplo T1 inconsistente                                    | **Rediseño** (ver Technical › Telemetría): segundo evento `review`, campo `open`, `premortem:{na}`, línea base 0.5 como control, `verified` único cumplimiento en T2+           |
| B. Protocolo del bucle con huecos              | #6 inducido por ubicación, #7 T1 con pasada 2 obligatoria y sin parada en limpio, #13 deepcheck no hereda y `planner` devuelve plan, recorte (b) `retry` faltante                                                      | **Rediseño**: inducido por causa (`git show` pre-fix), pasada 2 solo con diff de arreglos, alcance T1–T2 = diff + callers, ledger pegado cuando no hay herencia, `planner-deep` |
| C. Agregación de dev-metrics                   | #4 denominador de `cappedRate`, #5 censurados en la media, #8 pool sin `--until` ni dedupe de worktrees, #11 `level:"n/a"`/`"pending"` cuentan como review, #12 sin n por métrica, #15 test (f) sobrevive a 7 mutantes | Arreglo por clase en `reviewLoopStats` + test con mutantes                                                                                                                      |
| D. Parser sin discriminador                    | #9 reversiones cuentan como spec Tier 0 (185 repos con fila T0 falsa)                                                                                                                                                  | Filtrar por `event`                                                                                                                                                             |
| E. Prettier reescribe el espejo y los docs     | #10 comas finales en JSON, codemap ×3, espejo ≠ canónica                                                                                                                                                               | `.prettierignore` para espejos y codemap; restaurar codemap compacto                                                                                                            |
| F. Convenciones                                | recorte (a) trailers de atribución en los commits                                                                                                                                                                      | Reescribir mensajes (aprobado por el usuario)                                                                                                                                   |
| Refutado                                       | `sharePassesAtMost2` ignorando `redesigned`                                                                                                                                                                            | Coincide con el ADR; `redesigned` se reporta aparte                                                                                                                             |
| Refutado (convenciones, confianza baja)        | reformateo de tablas/cursivas en codemap, README y TS                                                                                                                                                                  | Lo forzó el hook de lint-staged, no una edición manual; la parte dañina es la causa E                                                                                           |

Las causas A y B son hallazgos **de la spec**, no del código: el pre-mortem original no tenía
la fila que los atrapa (ver Invariantes, abajo). Por eso el cierre empieza por este brief, la
skill y el ADR, y recién después por dev-metrics. Los arreglos van en un commit aparte.

**Pasada 2** — `/code-review max` sobre `72b38e0..888abbd` (rama completa, Tier 3), ledger en
contexto: **15 hallazgos confirmados, tope alcanzado**, 29 candidatos sin refutar. **13 son
inducidos** (el defecto no existe en `913aeef`: viven en `reviewLoopStats`, el join por
`change`, `dedupeWorktrees` y el filtro `--until`, todo escrito en `888abbd`); 2 son restos
de la pasada 1 cerrados a medias (#12 `"pending"` no cuenta como "sin cierre"; #14 campos
parseados sin consumidor). **Regla de parada disparada**: no se corrige en línea. La pieza
"lectura de la telemetría" se rediseña con invariantes explícitas (Design, abajo) y va a la
**pasada 3, la última**.

| #   | Hallazgo (pasada 2)                                                                              | Inducido            | Invariante que faltaba |
| --- | ------------------------------------------------------------------------------------------------ | ------------------- | ---------------------- |
| 1   | `specFlowHashes` cuenta el commit del evento `review` como un cambio spec-flow más               | sí (diseño A)       | L-9                    |
| 2   | `unclosed` ignora el `review` inline de un spec 0.6 (contrato intermedio ya usado en atlas/core) | sí                  | L-6                    |
| 3   | `level` n/a solo excluido de `passes`, no del resto                                              | sí                  | L-2                    |
| 4   | métricas por línea, no por cambio (varias líneas `review` del mismo change)                      | sí                  | L-1                    |
| 5   | `unclosed.count` puede superar `n`                                                               | sí                  | L-1, L-4               |
| 6   | specs no colapsados por `change`                                                                 | sí                  | L-1                    |
| 7   | `gitCommonDir` sin canonicalizar (symlink `trabajo/Claudia IA` → doble conteo)                   | sí                  | L-7                    |
| 8   | `--until` con dos intérpretes (lexicográfico vs approxidate)                                     | sí                  | L-8                    |
| 9   | dedupe conserva el primero, no el worktree principal                                             | sí                  | L-7                    |
| 10  | `na` ausente entra al brazo "real"; `"n/a"`/ausente en T2+ no entra a ninguno                    | sí                  | L-5                    |
| 11  | `findings_capped` ausente = "no censurado" en los brazos                                         | sí                  | L-3                    |
| 12  | `"pending"` en 0.5 no cuenta como "sin cierre"                                                   | no (resto pasada 1) | L-4                    |
| 13  | brazo totalmente censurado devuelve `null` y pierde su n                                         | sí                  | L-3                    |
| 14  | reversiones, `assumptions`, `spec_review`, `found_total`, `resolved`, `tests` sin consumidor     | no (resto pasada 1) | L-10                   |
| 15  | encabezado "mediana entre N repos" cuenta repos sin datos                                        | sí                  | L-11                   |

Recortados por el tope (se cierran en la misma pasada 3 porque caen en las mismas
invariantes): `passes:0` cuenta como bucle acotado (L-2: conteo válido ≥ 1); `tier` vía
`num()` puede dar T0 falso (L-2); `change` ausente colapsa líneas (L-1); `unclosed` agrupado
entre repos (L-11); `gitCommonDir` filtra stderr de git y corre antes de `isGitRepo` (L-7);
`warn()` escribe en stdout dentro del render (L-11); fricción sin n (L-11); `max-lines`
superado en `spec-flow-events.ts` (se parte el módulo). **Diferidos con motivo**: `collect`
también duplica worktrees (comando distinto, misma utilidad reutilizable; se anota como
seguimiento); SKILL.md duplica ~20 líneas de la referencia (deliberado: la regla operativa se
carga siempre, el detalle bajo demanda); `sync` no versiona `evals/` (decisión documentada en
el script).

## Out of scope

- Cambiar `/code-review` (skill nativa) o su tope de hallazgos.
- Un pre-mortem en Tier 1, o cualquier sección nueva en Tier 0-1.
- Automatizar la detección de "hallazgo inducido" con tooling; en v0.6 la hace el main loop
  cruzando `file:line` contra el diff de los arreglos previos.
- Propagar la skill a otros proyectos/máquinas (eso lo hace el release de `@devground/sdd`).
- Tocar deepcheck, model-orchestrator o `chile-formats`.

## Technical

### Pre-mortem (Step 3, Tier 2+)

Cinco filas, cada una espejo de un ángulo del revisor, respondidas **antes** de codificar:

| Fila              | Pregunta                                                                                                                                                     | Ángulo de `/code-review` que anticipa  | Evidencia                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Caminos**       | ¿Por cuántas entradas fluye este dato o comportamiento (alta, reingreso, backfill, histórico, sync, API/MCP/UI, undo)? Cada una: cubierta o fuera con motivo | C cross-file, B removed-behavior       | "el reingreso nunca escribe el nivel anuncio"; "los 757 históricos nunca re-drenan"; "el camino de estado se quedó atrás" |
| **Fallas**        | Por dependencia externa: caída, lento/timeout, respuesta malformada (200 sin JSON), éxito parcial, reintento. Por operación: ¿falla abierto o cerrado?       | A line-by-line, D pitfalls, E wrappers | JWKS caído → 500 en cadena; pool lleno; Meta 400 en nivel campaña                                                         |
| **Invariantes**   | 3-5 frases que deben ser verdad siempre; cada una con el test que la rompe                                                                                   | B removed-behavior, altitude           | `previous_state` fuera del cerrojo; dos relojes; una fila por intento                                                     |
| **Simetrías**     | Si la regla aplica a lectura/presupuesto/crear, ¿aplica igual a escritura/estado/editar/borrar?                                                              | C, gap sweep                           | lectura fail-closed y escritura fail-open (3 veces)                                                                       |
| **Reutilización** | ¿Qué helper ya hace esto? Nómbralo o di que no existe                                                                                                        | reuse, simplification                  | `PyJWKClient` reimplementado a mano                                                                                       |

Formato: una tabla o cinco viñetas, máximo ~15 líneas. `n/a — <motivo>` es respuesta válida
por fila; lo que no es válido es omitir la fila.

### Design gate (Step 3.6, Tier 2+)

Antes de la primera edición, la spec se revisa con los mismos ojos que después revisarán el
código. Tier 2: el main loop recorre la checklist de `references/premortem-and-review-loop.md`
contra su propio brief y agrega escenarios/invariantes que falten. Tier 3: se propone delegar
a `planner` (solo lectura, Opus) con el brief + code map + archivos de la superficie; su salida
son huecos de la spec, no un plan nuevo. Cada hueco aceptado se convierte en escenario
Given/When/Then o invariante **antes** de implementar. Sale un `spec_review: {gaps_found,
gaps_adopted}` a telemetría.

### DoD de tests (Step 4)

- **Verificado en ambos sentidos**: un test que protege un invariante o una guarda se declara
  verificado solo si se lo vio fallar con el arreglo revertido (o la guarda borrada) y pasar
  con el arreglo puesto. Es mutación manual de un solo paso; cuesta un minuto y cerró las dos
  cadenas más largas medidas.
- **Fakes con contrato**: un fake que ignora sus argumentos (un `eq()` que devuelve lo mismo
  reciba lo que reciba) no cuenta como test de un filtro o guarda de seguridad.
- `tests` gana el valor `"verified"` (añadidos/actualizados y verificados en ambos sentidos);
  esperado en Tier 2+; `"added"`/`"updated"` siguen valiendo en Tier 1.

### Review as the closing gate (Step 4, reescrito)

1. **Pasada 1** al nivel del tier, sobre el diff completo del cambio. Antes de tocar código:
   leer la lista entera, **agrupar por causa raíz** (altitud) y corregir por clase, no hallazgo
   por hallazgo. Si la lista llegó al tope (10/15), anotarlo: es "al menos", no "exactamente".
2. **Cerrar todos** los hallazgos: arreglado (con su test en ambos sentidos), diferido con
   motivo, o refutado con motivo. Escribir el **ledger** en la conversación (o en el brief
   persistido). Commit de los arreglos separado del commit del cambio.
3. **Pasada 2** (la puerta): Tier 2 revisa el diff de los arreglos más sus callers; Tier 3
   revisa la rama completa. El ledger está en el contexto que hereda el revisor, con la
   instrucción explícita de no re-marcar lo diferido/refutado salvo que el motivo sea falso.
4. **Regla de parada**: un hallazgo de la pasada 2 cuyo `file:line` cae dentro del diff de los
   arreglos de la pasada 1 es **inducido**. Si hay inducidos, no se corrigen en línea: se vuelve
   al brief, se escribe el invariante que faltó, se rediseña esa pieza y se corre la **pasada
   3, la última**. Sin inducidos: se cierran los restantes y se termina. Lo que quede abierto
   tras la pasada 3 se registra como deuda (`findings > resolved`), visible, no se persigue.
5. Cero hallazgos **no es la meta**: el revisor trabaja en modo recall y tiene piso. La meta
   medible es hallazgos bajos en la pasada 1 y que la pasada 2 sea la última.

### Telemetría (Step 6)

Dos eventos, porque se conocen en momentos distintos y viajan en commits distintos (la
versión de un solo evento obligaba a placeholders como `"findings":"pending"` o a reescribir
una línea de un log append-only — hallazgo #1 de la pasada 1):

```jsonc
// evento spec — tras el design gate, commiteado con el cambio
{"event":"spec", ..., "premortem": {"na": 1},          // {na} escrito · false omitido · "n/a" en Tier 1
 "spec_review": {"gaps_found": 3, "gaps_adopted": 2}}  // "n/a" en Tier 1
// evento review — al cerrar el bucle, commiteado con los arreglos, unido por change
{"event":"review", "change": "...", "level":"high", "passes":2,
 "findings":10, "findings_capped":true, "found_total":13,
 "induced":0, "resolved":11, "open":2, "redesigned":false, "tests":"verified"}
```

`findings` = solo la **pasada 1** (comparable). `found_total` = todas las pasadas. `open` =
la deuda, explícita (`findings > resolved` dejó de significar algo al partir los conteos).
Un `spec` sin `review` = revisión sin cierre. `tests:"verified"` es el único valor que
cumple el DoD en Tier 2+. `dev-metrics` reporta con el n de cada métrica, por repo y con
mediana entre repos: `passes` (mediana, % ≤ 2), `findings_capped` entre quienes lo
reportan, `induced > 0`, reviews sin cierre, `open`, y `findings` de pasada 1 **no
censurados** en tres brazos — 0.6 con pre-mortem real (`na ≤ 3`), 0.6 de cumplimiento
(`na ≥ 4`) u omitido, y línea base 0.5 (etiquetada: contaba todas las pasadas, sin tope).
El brazo con pre-mortem contra la línea base es la que dice si v0.6 funcionó.

## Spec (Given/When/Then)

**Scenario: brief Tier 2 con pre-mortem**

- GIVEN una petición clasificada Tier 2 que toca un dato con más de una entrada
- WHEN spec-flow produce el brief
- THEN incluye `### Pre-mortem` con las cinco filas y al menos una entrada en Caminos que no es
  la del camino feliz

**Scenario: Tier 1 no cambia**

- GIVEN una petición Tier 1
- WHEN se produce el brief
- THEN no hay sección Pre-mortem, ni design gate, y el evento lleva `premortem:"n/a"`

**Scenario: design gate encuentra un hueco**

- GIVEN un brief Tier 3 y la checklist
- WHEN el gate detecta un camino no cubierto
- THEN el brief gana un escenario G/W/T para ese camino antes del primer Edit y
  `spec_review.gaps_adopted` lo cuenta

**Scenario: pasada 2 con inducidos**

- GIVEN un ledger de pasada 1 con arreglos en `actions.py:120-160`
- WHEN la pasada 2 reporta un hallazgo en `actions.py:141`
- THEN se marca inducido, no se corrige en línea, se escribe el invariante en el brief y se
  rediseña; la pasada 3 es la última

**Scenario: pasada 2 limpia**

- GIVEN un ledger de pasada 1 y una pasada 2 sin inducidos
- WHEN quedan hallazgos no inducidos
- THEN se cierran y el flujo termina con `passes:2`

**Scenario: evento antiguo**

- GIVEN un `events.jsonl` con eventos 0.2-0.5
- WHEN dev-metrics parsea
- THEN los campos nuevos son `undefined`/`false` y ninguna línea se descarta

**Scenario: valor malformado**

- GIVEN `"review":{"level":"high","findings":"pending"}`
- WHEN dev-metrics parsea
- THEN `findings` es `undefined` (no 0) y el evento cuenta como "review sin cierre"

## Exploration findings

- `spec-flow-report.ts` no usa `review` en absoluto: el parser lo normaliza (ADR-0036) pero
  ningún reporte lo muestra. La métrica que ADR-0036 llamó "el punto del ADR" nunca se leyó.
- `num()` en `spec-flow-events.ts` convierte cualquier no-número en 0: dos eventos reales de
  Capitalacademy llevan `"findings":"pending"` y hoy cuentan como cero hallazgos.
- El revisor nativo a `high` corre 11 ángulos (A-E, reuse, simplification, efficiency, altitude,
  conventions, gap sweep) con verificación de un voto en modo recall y tope de 15 (10 vía
  ReportFindings). Nada de esto se puede cambiar desde spec-flow; sí el alcance y la lectura.
- `/code-review` se lanza como **fork** que hereda la conversación: el ledger no necesita
  archivo ni parámetro.
- deepcheck ya tiene `aud-premortem` (composición y supuestos rotos, costuras A↔B). El
  pre-mortem de spec-flow es la versión de 15 líneas de eso, en tiempo de spec.
- `setup.js` de `@devground/sdd` copia con guarda (no pisa archivos existentes): los proyectos
  con `.claude/skills/spec-flow/` local **no** recibirán v0.6 al reinstalar. Limitación
  preexistente; se anota en el ADR, no se resuelve aquí.
- SKILL.md tiene 499 líneas / 27 KB y se carga en cada invocación (1.129 corridas registradas).
  Cada línea añadida se paga en todas; de ahí la cota de ~120 líneas y la referencia aparte.

## Design

**Decisión central**: mover las preguntas del revisor al momento de la spec, y convertir el
review de bucle abierto en puerta con cota. Las dos piezas se necesitan: sin pre-mortem, la
cota solo deja deuda; sin cota, el pre-mortem baja la pasada 1 pero el bucle sigue.

**Por qué cinco filas y no las 11 dimensiones**: las 11 son ángulos de lectura de un diff; antes
del diff solo cuatro tienen sentido (caminos, fallas, invariantes, reutilización) y la quinta
(simetrías) es un patrón que apareció tres veces en los datos y que ningún ángulo nombra.

**Por qué el gate de Tier 3 es `planner` y no un agente nuevo**: ya existe, es de solo lectura,
en Opus (juicio → Opus, ADR-0031) y opt-in (ADR-0030). Un agente nuevo sería superficie sin
consumidor, justo lo que ADR-0032 acaba de congelar.

**Por qué la pasada 2 tiene alcance distinto por tier, y por qué es condicional**: en Tier
1–2 la rama completa re-marca lo diferido y cuesta lo mismo que la primera; el riesgo que la
pasada 2 persigue (inducidos) vive en el diff de los arreglos. En Tier 3 la puerta final tiene
que ver el todo, porque el cambio cruza módulos. Y si la pasada 1 no dejó diff de arreglos, no
hay nada que pueda haberse inducido: el bucle cierra en `passes: 1` (antes la pasada 2 era
incondicional, lo que imponía a Tier 1 una segunda revisión sin alcance definido).

**Por qué "inducido" se decide por causa y no por ubicación**: con la pasada 2 acotada al diff
de los arreglos, todo hallazgo cae "dentro del diff" por construcción; un bug preexistente que
el tope escondió en una función que el arreglo tocó se habría clasificado como inducido y
forzado un rediseño de código que el arreglo no rompió. La prueba es leer la versión pre-fix.

**Por qué 3 como máximo duro**: los datos muestran que desde la pasada 3 en adelante la
mayoría de hallazgos son inducidos. Seguir es cambiar deuda visible por riesgo invisible.

**Rollback**: la skill es texto versionado; revertir = `git revert` + `sync`. Los campos de
telemetría son aditivos y el parser tolera su ausencia, así que eventos 0.6 leídos por un
dev-metrics viejo no rompen nada (los ignora).

**Pasada 3 (última)** — `/code-review max` sobre `72b38e0..d75867a` (rama completa), ledger en
contexto: **15 hallazgos confirmados, tope alcanzado**, 19 votos sin refutar. Ninguno es de
diseño ni inducido de la clase anterior: son bordes de la implementación de L-1…L-11. Por
protocolo no hay pasada 4. **Se cierran 11** con test verificado en ambos sentidos (F1–F11 en
el commit de cierre): `specFlowHashes` reescrito en una sola llamada `git log -p` y con spec
reescrita = seguimiento (#1, #10); `verifiedShare` solo 0.6 T2+ sin `n/a` (#3); `resolvedShare`
sobre aplicables (#12); `reversalRate` con el máximo de `assumptions` por cambio (#6); inline
`"review":"n/a"` = `level:"n/a"` (#7); inline review con el mismo normalizador que el evento
(#8); `unclosed`/`open` como mediana entre repos (#9); join por `date` cuando `ts` es fallback
(#11); `null` no tumba el parser (#13); identidad de repo por root commit, huérfanos excluidos,
rutas idénticas deduplicadas (#4, #5, #14); `findings_capped:false` sin `findings` no es exacto
(recorte). **Quedan abiertos (`open: 4`), con motivo:**

| #   | Abierto                                                                                                                         | Motivo                                                                                                                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2   | La telemetría de una rama sin fusionar que solo vive en un worktree descartado no se cuenta                                     | Decisión deliberada: un repo se lee una vez, desde su worktree principal; lo que está en una rama entra cuando se fusiona. Contarlo hoy exigiría unir eventos entre worktrees y atribuir commits a dos HEADs. El texto del descarte ya lo dice. |
| —   | La tabla de fricción sigue siendo un pool crudo entre repos                                                                     | Preexistente a v0.6; cambiarla altera una serie que dev-metrics viene publicando. Se anota para la siguiente versión con su propio ADR de ruptura.                                                                                              |
| 15  | `--until` compara fecha de committer (git) contra fecha del evento (autor); un rebase posterior al corte separa commit y evento | Preexistente; el `T23:59:59` corrige el borde del día, que era el defecto de esta versión. Unificar el reloj requiere `--date=format-local` y `%ad` vs `%cd`, un cambio de `collect` también.                                                   |
| —   | `spec-flow-review-loop.ts` supera `max-lines` (≈457)                                                                            | Partirlo es cosmético y abre otra ronda; se deja el warning visible.                                                                                                                                                                            |

### Lectura de la telemetría (rediseño tras la pasada 2)

La pieza se especifica como modelo de datos con invariantes, no como lista de métricas.
`dev-metrics` la implementa en un módulo propio (`lib/spec-flow-review-loop.ts`) y cada
invariante tiene su test.

**Entidades.** `SpecEvent`, `ReviewRecord` (un evento `review`, o el `review` inline de un
spec — misma forma normalizada, mismo normalizador), `Reversal`. Un `ReviewRecord` con `level`
ausente o `"n/a"` es **"no aplicó"**.

- **L-1 Unidad = cambio.** Los specs se colapsan por `change` conservando el último por `ts`;
  un spec sin `change` válido se descarta (no se agrupa con otros). El review de un cambio es
  el último `ReviewRecord` con el mismo `change` y `ts ≥ ts` del spec (evento), o el inline de
  ese spec; si no hay ninguno, el cambio está **abierto**. Por construcción, ningún conteo de
  cambios supera su n.
- **L-2 Ausente = desconocido, nunca cero ni falso.** Todo campo pasa por `count()` (entero
  seguro ≥ 0) o por booleano estricto; `tier` también (un tier no parseable es desconocido, no
  0). `passes` válido es ≥ 1. Un review "no aplicó" excluye al cambio de **todas** las
  métricas de review, incluida "sin cierre".
- **L-3 Censura tripartita.** Por cambio, `findings` es exacto (`findings_capped === false`),
  censurado (`=== true`) o desconocido (ausente). Las medias usan solo exactos; cada brazo y
  cada tasa reporta `n_total`, `n_exactos`, y `cappedShare` sobre los que declaran el flag. Un
  brazo con n_total > 0 **nunca** es `null` aunque su media lo sea.
- **L-4 Sin cierre.** Universo: cambios con spec Tier ≥ 1 que **o** son 0.6 **o** traen review
  inline. Sin cierre = sin review aplicable, o review con `findings` no numérico
  (`"pending"`). Aplica a 0.5 y 0.6 por igual; `count ≤ n`.
- **L-5 Brazos exhaustivos y excluyentes** sobre cambios 0.6 Tier ≥ 2 con review aplicable:
  `premortem` (`na ≤ 3`), `compliance` (`na ≥ 4` o `premortem:false`), `undeclared` (ausente,
  `"n/a"`, `true` legado del contrato intermedio, o valor sucio). `baseline05` = cambios < 0.6
  con review inline. Los cuatro se reportan con su n; ninguno se omite en silencio.
- **L-6 El contrato intermedio se lee.** Un spec 0.6 con `review` inline (formato que ya
  existe en atlas/core) se trata exactamente como un evento `review` con el mismo `ts`.
- **L-7 Dedupe de repos por identidad real.** Clave = `realpath` del `--git-common-dir`
  (`git rev-parse --path-format=absolute`), calculada solo tras `isGitRepo`, con stderr
  descartado. Se conserva el **worktree principal** (aquel cuyo git dir es el common dir), no
  el primero; el descarte se reporta una sola vez, en el reporte, no por stdout.
- **L-8 Un solo reloj para `--until`.** Se valida `YYYY-MM-DD` (error claro si no); eventos
  por `date ≤ until`; git con `--until=<until>T23:59:59` para que ambos incluyan el día
  completo.
- **L-9 El segmento spec-flow no cambia de población.** Un commit que solo añade líneas
  `review`/`assumption_reversed` a `events.jsonl` es un **seguimiento** del cambio: no cuenta
  como commit spec-flow ni como control (se excluye de ambos segmentos). Solo los commits que
  añaden una línea `spec` definen el segmento, igual que en 0.5.
- **L-10 Todo campo escrito se lee.** El reporte muestra además: tasa de reversión
  (`reversals ÷ Σ assumptions`, la fila "Calidad de inferencia" de measurement-design §5),
  adopción del gate (`Σ gaps_adopted ÷ Σ gaps_found`), proporción de `tests:"verified"` en
  Tier 2+ y `resolved ÷ found_total`. Test: quitar cualquier campo del parser cambia la
  salida.
- **L-11 Cada número con su n, y el encabezado con los repos que aportan.** `repos` = repos
  con al menos una métrica no nula; la fricción también lleva n; nada escribe en stdout desde
  el render.

Estas once son la fila **Invariantes** que el pre-mortem de este brief debió tener para la
pieza de lectura, y son la razón de que la pasada 2 trajera 13 inducidos: la pieza se escribió
sin ellas.

## Pre-mortem (de este cambio)

| Fila              | Respuesta                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Caminos**       | La skill llega por tres vías: (1) canónica `~/.claude/skills` → todas las sesiones de esta máquina, se cubre editando ahí; (2) `packages/sdd/skill` → npm → `npx @devground/sdd` en otros proyectos, se cubre con `sync` + changeset; (3) copias locales en `.claude/skills/spec-flow/` de proyectos → **no se actualizan** por la guarda de `setup.js` (fuera, anotado en ADR). Los eventos llegan a dev-metrics desde 36 repos con formatos 0.2-0.6 mezclados → cubierto por tests de compatibilidad.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Fallas**        | Parser: valores no numéricos (`"pending"`), `review` parcial (`passes` sin `findings`), `premortem` con tipos raros → `num()` devuelve `undefined`, nunca 0; ningún campo nuevo es requerido. Skill: el agente puede llenar el pre-mortem con `n/a` en todas las filas para saltárselo → el design gate lo revisa y `premortem:true` con cinco `n/a` es detectable en telemetría. Revisor forkeado que muere (watchdog/429, pasó 3 veces en atlas): una pasada muerta **no cuenta** como pasada.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Invariantes**   | (1) Tier 0-1 no ganan ceremonia → test: Example A/B de `examples.md` sin cambios y evento Tier 1 con `premortem:"n/a"`. (2) Eventos ≤0.5 parsean igual → test (a)(b). (3) `findings` = pasada 1 siempre → documentado en Step 6 y en el ledger. (4) SKILL.md ≤ ~620 líneas → `wc -l` en la revisión. **Añadidas tras la pasada 1** (las que faltaban): (5) toda comparación que el reporte imprime tiene un grupo de control **no vacío bajo el protocolo cumplido** → test con un corpus 0.6 conforme (T2+ con pre-mortem, T1 n/a) y eventos 0.5: los tres brazos tienen n. (6) cada métrica del bloque lleva su propio n y su denominador son solo los eventos que reportan el campo → test: ausente nunca cuenta como cero ni como falso. (7) todo campo de telemetría que se escribe se lee en algún reporte → test: quitar cualquier campo del parser cambia la salida. (8) cada valor del evento tiene un momento de emisión en el que ya se conoce y un commit al que pertenece → dos eventos. (9) la deuda es un campo, no una resta → `open`. |
| **Simetrías**     | Si el spec event gana `spec_review`, el reversal event no necesita campo nuevo: un hueco que el gate no vio y el review sí, ya es `assumption_reversed`. Pasada 2 con alcance por tier es una asimetría deliberada (arriba). `tests:"verified"` aplica igual a tests añadidos y actualizados.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Reutilización** | `planner-deep` para el gate; `aud-premortem` de deepcheck como origen del enfoque; los 11 ángulos del revisor como espejo de las filas; `normalizeReview` existente se extiende, no se duplica.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

## Tasks

1. **ADR-0037** (borrador Propuesto) con evidencia, decisión, alternativas → verificar: enlaza
   0029/0036 y el índice tiene la fila.
2. **SKILL.md v0.6** — plantilla, Step 3.6, Step 4 (DoD + closing gate), Step 6, anti-patrones,
   versión → verificar: diff ≤ ~120 líneas netas; Steps 0-2 intactos; patch 3.5 sigue encajando.
3. **`references/premortem-and-review-loop.md`** + Example C + measurement-design → verificar:
   la checklist tiene las cinco filas con las preguntas espejo y el ejemplo real.
4. **Eval** `tier2-premortem-atribucion-ghl.json` + README de evals.
5. **Design gate sobre este brief** (dogfood, Tier 3): proponer `planner`; incorporar huecos como
   escenarios → verificar: `spec_review` con cifras reales.
6. **dev-metrics**: parser + tests (a-e) + bloque de reporte + README → verificar: `pnpm test`,
   `test:coverage` sin bajar, test (d) rojo con `num()` revertido.
7. **sync + changesets + codemap + README de sdd** → verificar: `git diff packages/sdd/skill` es
   exactamente la canónica.
8. **Review pasada 1** (`/code-review max`) → ledger → arreglos por clase → **pasada 2** con la
   regla de parada → evento 0.6 en `.spec-flow/events.jsonl` → PR.
