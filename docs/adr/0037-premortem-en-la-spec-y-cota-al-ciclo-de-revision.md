# ADR-0037: Pre-mortem en la spec y cota al ciclo de revisión

- **Estado**: Propuesto
- **Fecha**: 2026-09-14
- **Decisor**: edaza
- **Aplica a**: `@devground/sdd` (skill spec-flow v0.6), `@devground/dev-metrics` (parser y reporte de telemetría)
- **Extiende**: [ADR-0029](0029-tests-como-definition-of-done.md), [ADR-0036](0036-review-como-definition-of-done.md)

## Contexto

[ADR-0036](0036-review-como-definition-of-done.md) puso el code review dentro de la Definition
of Done y apostó una hipótesis concreta: "los hallazgos por cambio deberían **bajar** con el
tiempo si el flujo mejora. Si no bajan, spec-flow está produciendo briefs que parecen completos
y no lo son". La medición del 2026-09-14 confirma la segunda mitad de esa frase.

Con 73 sesiones que pasaron por `/code-review` (171 invocaciones), el **44% itera 2 o más
veces**, 15 sesiones llegan a 3 o más, y los máximos son 18 (atlas) y 14 (Operacionrenta). 68 de
esas 73 sesiones venían de spec-flow en la misma sesión. En atlas, **10 de 16 pasadas
completas** reportan hallazgos "consecuencia de mi corrección anterior" — una pieza nacida en
la pasada 12 sin invariante escrito reapareció en las 4 pasadas siguientes; en Operacionrenta el
mismo bug volvió 3-5 rondas hasta forzar un rediseño en la ronda 8. De 66 hallazgos
estructurados, **42 son `correctness`** y caen en cinco familias que no tienen sección propia en
el brief: caminos no cubiertos, modos de falla de dependencias, invariantes bajo
concurrencia/tiempo, asimetrías (lectura/escritura, presupuesto/estado) y tests que no prueban
nada. Aparte, hay 116 eventos `assumption_reversed` sobre 1.129 specs (10%), 112 de ellos en
Tier 2-3 — la spec original no anticipó lo que el review sí encontró. El costo asociado, a
precios Opus como cota superior, es de ~US$198 por invocación de review; una sesión con 2 o más
pasadas gasta ~US$766 en subagentes contra ~US$226 en las de una sola pasada.

La medición expone cuatro mecanismos, no uno:

1. **El tope del revisor censura la señal.** `/code-review` corta en 15 hallazgos (10 vía
   `ReportFindings`); la distribución real es 13 ceros, un bloque de 10 y varios 24 — "10"
   significa "al menos 10", no "diez problemas". Sin saberlo, un review que reporta 10 puede
   estar escondiendo el doble.
2. **Los arreglos se hacen dentro del bucle de review, sin volver a la spec.** Un hallazgo se
   corrige en el código, pero el invariante que lo hubiera prevenido nunca se escribe en el
   brief, así que la siguiente pasada — u otro cambio en la misma pieza — lo vuelve a pisar.
3. **La spec no escribe lo que el revisor busca.** Los 11 ángulos de `/code-review` (caminos
   cruzados, fallas de dependencia, invariantes, simetrías, reutilización, entre otros) no
   tienen contraparte en Step 3 del brief; el review es la primera vez que alguien se hace esas
   preguntas.
4. **Cada pasada relee toda la rama y re-marca lo diferido.** Sin un ledger que se herede entre
   pasadas, un hallazgo ya diferido con motivo puede volver a aparecer y consumir otra ronda de
   discusión.

La exploración del código sumó dos hallazgos independientes que agravan el problema de medición:
`spec-flow-report.ts` **nunca mostró** el campo `review` — la métrica que ADR-0036 llamó "el
punto del ADR" se parseaba pero jamás se reportó — y `num()` en `spec-flow-events.ts` convierte
cualquier valor no numérico en `0` en silencio, así que dos eventos reales con
`"findings":"pending"` cuentan hoy como cero hallazgos en vez de como datos ausentes.

## Decisión

Spec-flow pasa a **v0.6** con cinco piezas, todas escaladas por tier igual que ADR-0029 y
ADR-0036:

1. **`### Pre-mortem` en el brief, desde Tier 2** (Step 3). Cinco filas, cada una espejo de un
   ángulo del revisor, respondidas **antes** de codificar. `n/a — <motivo>` es respuesta válida
   por fila; omitir la fila no lo es. Máximo ~15 líneas.

   | Fila              | Pregunta                                                                                                                                                     | Ángulo del revisor que anticipa        |
   | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
   | **Caminos**       | ¿Por cuántas entradas fluye este dato o comportamiento (alta, reingreso, backfill, histórico, sync, API/MCP/UI, undo)? Cada una: cubierta o fuera con motivo | C cross-file, B removed-behavior       |
   | **Fallas**        | Por dependencia externa: caída, lento/timeout, respuesta malformada, éxito parcial, reintento. Por operación: ¿falla abierto o cerrado?                      | A line-by-line, D pitfalls, E wrappers |
   | **Invariantes**   | 3-5 frases que deben ser verdad siempre; cada una con el test que la rompe                                                                                   | B removed-behavior, altitude           |
   | **Simetrías**     | Si la regla aplica a lectura/presupuesto/crear, ¿aplica igual a escritura/estado/editar/borrar?                                                              | C, gap sweep                           |
   | **Reutilización** | ¿Qué helper ya hace esto? Nómbralo o di que no existe                                                                                                        | reuse, simplification                  |

2. **Step 3.6 — Design gate, desde Tier 2**, antes de la primera edición. En Tier 2 es una
   autocomprobación del main loop contra la checklist de
   `references/premortem-and-review-loop.md`. En Tier 3 se **propone** delegar a `planner`
   (solo lectura, Opus) con el brief y el code map; sigue siendo opt-in por ADR-0030, y si el
   usuario lo rechaza se hace como en Tier 2. Cada hueco aceptado se convierte en escenario
   Given/When/Then o invariante antes de implementar.

3. **DoD de tests "verificado en ambos sentidos" y "fakes con contrato"** (Step 4). Un test que
   protege un invariante o una guarda se declara verificado solo si se lo vio fallar con el
   arreglo revertido (o la guarda borrada) y pasar con el arreglo puesto; un fake que ignora sus
   argumentos no cuenta como test de un filtro o guarda de seguridad. `tests` gana el valor
   `"verified"`, esperado desde Tier 2.

4. **Review como puerta con cota** (Step 4, reescrito). Pasada 1 al nivel del tier sobre el diff
   completo: antes de tocar código, agrupar los hallazgos por causa raíz y corregir por clase,
   no uno por uno. Cerrar todo — arreglado con su test en ambos sentidos, diferido con motivo, o
   refutado con motivo — y escribir el **ledger** en la conversación, que hereda la pasada
   siguiente. Pasada 2 con alcance por tier: Tier 2 revisa el diff de los arreglos más sus
   callers, Tier 3 revisa la rama completa. Regla de parada: un hallazgo de la pasada 2 cuyo
   `file:line` cae dentro del diff de los arreglos de la pasada 1 es **inducido**; si los hay, no
   se corrigen en línea — se vuelve al brief, se escribe el invariante que faltó, se rediseña la
   pieza y se corre la **pasada 3, la última**. Sin inducidos, se cierra lo que queda y se
   termina. Lo que sigue abierto tras la pasada 3 se registra como deuda visible, no se persigue.
   **Cero hallazgos no es la meta**; la meta medible es una pasada 1 baja y que la pasada 2 sea
   la última.

5. **Telemetría nueva** (Step 6): `premortem` (`true|false|"n/a"`), `spec_review`
   (`{gaps_found, gaps_adopted}` o `"n/a"`), y `review` gana `passes`, `findings_capped`,
   `induced` y `redesigned` junto a los campos existentes de ADR-0036. `findings` pasa a
   significar explícitamente los hallazgos de la **primera pasada**, para que sea comparable
   entre cambios. `dev-metrics` reporta mediana de `passes`, porcentaje de cambios con
   `passes ≤ 2`, tasa de `findings_capped`, tasa de `induced > 0`, y `findings` de la pasada 1
   segmentado por si hubo `premortem` — esta última es la que dice si v0.6 funcionó.

`/code-review` (skill nativa) **no se modifica**: ni su tope de hallazgos ni sus 11 ángulos. Lo
que cambia es cómo spec-flow lo invoca (alcance por pasada) y cómo interpreta su salida
(`findings_capped`, `induced`).

## Consecuencias

**Positivas**

- Mueve las preguntas del revisor al momento de la spec, antes de que el código exista, en vez
  de descubrirlas después de escribirlo y corregirlo a ciegas.
- Convierte el bucle de review, hoy abierto (44% itera ≥2, máximos de 18 y 14 pasadas), en una
  puerta con cota conocida de antemano: 2 pasadas por defecto, 3 como máximo duro.
- Corrige dos defectos de medición reales que dejaban ciego a ADR-0036: `spec-flow-report.ts`
  empieza a mostrar el bloque "Review loop", y `num()` deja de convertir `"pending"` en `0`.
- Da una métrica causal nueva — hallazgos de la pasada 1 con pre-mortem vs. sin él — que puede
  **refutar** si v0.6 sirve, en vez de asumirlo.
- Retrocompatible: los campos son aditivos y `dev-metrics` tolera eventos 0.2-0.5 sin romper.

**Negativas / Trade-offs**

- Agrega fricción real en Tier 2, que es el tier más frecuente (605 de 1.129 eventos
  registrados). Se mitiga acotando el pre-mortem a un formato de ~15 líneas y aceptando
  `n/a — <motivo>` como respuesta legítima por fila.
- La detección de "hallazgo inducido" y las cifras del ledger dependen de que el agente las
  reporte con honestidad — el mismo trade-off ya aceptado en ADR-0029 y ADR-0036, sin
  enforcement mecánico nuevo.
- Un agente puede llenar las cinco filas del pre-mortem con `n/a` para saltárselo sin violar el
  formato; esto queda detectable en telemetría (`premortem:true` con cinco `n/a`), pero no
  bloqueado.
- La cota deja deuda visible (`findings > resolved` tras la pasada 3) en vez de perseguirla
  hasta cero; es una decisión deliberada, no un descuido.
- Limitación preexistente que este cambio no resuelve: `setup.js` de `@devground/sdd` copia con
  guarda y nunca pisa archivos existentes, así que los proyectos con una copia local de
  `.claude/skills/spec-flow/` no reciben v0.6 al reinstalar.
- `SKILL.md` se carga en cada invocación (1.129 corridas registradas); de ahí la cota de
  ~120 líneas netas de crecimiento y que el detalle del pre-mortem y del ledger viva en
  `references/premortem-and-review-loop.md`, cargado bajo demanda.

## Alternativas consideradas

1. **Solo la cota, sin pre-mortem**: descartado — corta el bucle pero no baja la pasada 1; deja
   la misma deuda de siempre, solo que con un límite más visible.
2. **Pre-mortem también en Tier 1**: descartado — apenas 3 de 116 reversiones son Tier 1, y
   Tier 0-1 son el ancla anti-fricción de toda la skill; agregar ceremonia ahí rompe esa promesa
   sin evidencia que lo justifique.
3. **Un agente nuevo "spec-reviewer"**: descartado — sería superficie sin consumidor, justo lo
   que ADR-0032 acaba de congelar. `planner` ya existe, es de solo lectura, corre en Opus
   (juicio → Opus, ADR-0031) y es opt-in (ADR-0030); no hace falta duplicarlo.
4. **Subir o quitar el tope de `/code-review`**: descartado — no es una decisión de spec-flow,
   es de la skill nativa. Además, un tope más alto no cambia que los hallazgos de pasadas
   tardías sean mayormente inducidos por arreglos previos, no hallazgos nuevos genuinos.
5. **Automatizar la detección de "inducido" con tooling**: descartado por prematuro sin medir
   primero. En v0.6 la detección la hace el main loop cruzando `file:line` contra el diff de los
   arreglos de la pasada anterior; automatizarlo puede revisarse después con datos reales.
6. **Seguir iterando hasta cero hallazgos**: descartado — los datos muestran que desde la pasada
   3 en adelante la mayoría de los hallazgos son inducidos por las correcciones previas, no
   defectos nuevos. Seguir es cambiar deuda visible por riesgo invisible.

## Medición

- **Hallazgos de la pasada 1 con pre-mortem vs. sin él**: si v0.6 funciona, los cambios con
  `premortem:true` deben mostrar menos `findings` en la pasada 1 que los que no lo tienen. Esta
  es la pregunta causal central del cambio.
- **Mediana de `passes` ≤ 2**: si la mediana de pasadas por cambio no baja hacia 2, la cota está
  produciendo rediseños en vez de cierres, o el pre-mortem no está capturando lo que el revisor
  encuentra.
- **Tasa de `induced > 0` a la baja**: si los hallazgos inducidos no bajan con el tiempo, el
  ledger no está evitando que se corrija a ciegas dentro del bucle.

Detalle de señales y diseño de la medición en
`~/.claude/skills/spec-flow/references/measurement-design.md`.

## Referencias

- [ADR-0029 — Tests como Definition of Done en spec-flow](0029-tests-como-definition-of-done.md)
- [ADR-0030 — La delegación a subagentes es opt-in por petición](0030-delegacion-opt-in-por-peticion.md)
- [ADR-0031 — Al delegar, el modelo del subagente va explícito por naturaleza de la tarea](0031-modelo-explicito-al-delegar.md)
- [ADR-0032 — Veredicto de los 11 experimentales al cierre del ciclo de 8 semanas](0032-veredictos-experimentales.md)
- [ADR-0036 — El code review es parte de la Definition of Done en spec-flow](0036-review-como-definition-of-done.md)
- `docs/specs/spec-flow-v06-premortem-y-cota-de-revision.md` — spec fuente de este ADR, con la
  evidencia completa, el diseño técnico y el pre-mortem del propio cambio.
