# ADR-0039: El review pasa a ser opt-in; el gate de cierre es la spec

- **Estado**: Aceptado
- **Fecha**: 2026-10-01
- **Decisor**: edaza
- **Aplica a**: `@devground/sdd` (skill spec-flow v0.7), `@devground/dev-metrics` (métricas del ciclo de review)
- **Reemplaza**: el gate de review del Paso 4 de [ADR-0036](0036-review-como-definition-of-done.md) y el protocolo de pasadas de [ADR-0037](0037-premortem-en-la-spec-y-cota-al-ciclo-de-revision.md). El pre-mortem, el design gate y los tests verificados en ambos sentidos de esos ADR se mantienen.

## Contexto

[ADR-0036](0036-review-como-definition-of-done.md) metió `/code-review` en la Definition of
Done de todo cambio Tier 1+. [ADR-0037](0037-premortem-en-la-spec-y-cota-al-ciclo-de-revision.md)
le agregó pre-mortem y una cota de 3 pasadas, apostando a que una primera pasada baja y
una segunda final cerrarían el ciclo. La telemetría de la v0.6 refuta esa apuesta.

**88 cambios con review desde el 2026-09-15** (eventos `.spec-flow/events.jsonl`, sin
duplicados de worktrees):

| Señal                                                             | Valor                                   |
| ----------------------------------------------------------------- | --------------------------------------- |
| Llegaron al tope de 3 pasadas                                     | 50 de 88                                |
| Con hallazgos **inducidos** (los creó el fix del review anterior) | 55 de 88                                |
| Cerraron con deuda abierta (`open > 0`)                           | 65 de 88 · 293 ítems                    |
| Hallazgos de la 1ª pasada, media                                  | 7,7 (26 cambios censurados por el tope) |
| Huecos que el design gate ya había encontrado en la spec          | 361                                     |

**Costo** (transcripts de `~/.claude/projects`, desde el 2026-09-01, precios aproximados
de Opus): los subagentes de review y verificación suman ~US$14.200 de ~US$32.800, el
**43 % del gasto total**. Ningún otro proceso de devground se acerca: el devlog
automático cuesta ~1,5 %.

Los hallazgos que siguieron apareciendo en la v0.6 caen en cuatro familias que el
pre-mortem de cinco filas no preguntaba:

- **Consumidores**: quién lee lo que se cambió. Un correo que pasa a mostrar "Ver anuncio",
  un grafo de cadencias que no conoce un estado nuevo, un resumen que sigue mostrando a un
  proveedor que ya no se consulta.
- **Datos reales**: la forma que ya tienen los datos en producción (`''` frente a `null`,
  valores que no son string).
- **Variantes**: dos variables de entorno que eligen el mismo camino.
- **Afirmaciones**: documentación, contratos o textos de PR que prometen más de lo que el
  código hace.

El ciclo de review no converge porque **genera su propia deuda**: cada fix hecho dentro
del loop, sin el invariante escrito en la spec, es el hallazgo de la pasada siguiente.

## Decisión

Spec-flow pasa a **v0.7**:

1. **El review es opt-in.** spec-flow no corre `/code-review` ni deepcheck por defecto, en
   ningún tier. Corre solo si el usuario lo pide. En Tier 3 con riesgo alto (auth/seguridad,
   dinero, migración irreversible, contrato externo) se **propone en una línea** y el
   usuario decide.
2. **Cuando corre, es una sola pasada.** Triage por ítem con su motivo. Un hallazgo que
   revela un hueco vuelve primero al brief (fila y escenario) y después al código. No hay
   segunda pasada automática.
3. **El gate de cierre es el chequeo de conformidad contra la spec** (`### Closing check`,
   Tier 1+), en el loop principal y sin subagentes: cada criterio y escenario apunta a su
   test; cada fila del pre-mortem, a su `archivo:línea` y su test; el grep de Consumidores
   se re-corre sobre el diff final; y la suite, el typecheck y el lint quedan verdes.
4. **El pre-mortem crece de 5 a 9 filas**: Consumidores (por grep, con `archivo:línea`),
   Datos reales, Variantes y Afirmaciones. **Tier 1** responde una versión mínima
   (Consumidores + Fallas), porque pierde el review `medium` que tenía.
5. **La spec se mueve primero.** Lo que la implementación descubre y la spec no decía se
   escribe en el brief antes de codificarse.
6. **Telemetría.** El evento `spec` se escribe al cerrar, después del chequeo de cierre, y
   lleva `tests`. El evento `review` solo existe si se pidió un review. `premortem.na`
   sigue contando solo las cinco filas originales, para no romper los brazos de
   comparación de dev-metrics. En `@devground/dev-metrics`, un `spec` 0.7 sin `review` ya
   no cuenta como "review sin cierre", y `verifiedShare` toma `tests` del evento `spec`
   cuando no hubo review.

## Consecuencias

**Positivas**

- Se elimina por defecto el 43 % del gasto, y con él la deuda inducida por el propio loop.
- El esfuerzo va a donde nacen los defectos: la spec. Las cuatro filas nuevas cubren las
  familias que la v0.6 seguía dejando pasar.
- El review sigue disponible y es más barato cuando se pide: una pasada y contra la spec.

**Negativas / Trade-offs**

- Se pierde la red de seguridad por defecto. Lo que el pre-mortem y el chequeo de cierre
  no vean llega a producción hasta que alguien lo note. Se acepta: con review, 65 de 88
  cambios igual cerraban con deuda abierta.
- Las métricas de "¿salen más limpios los cambios?" se basaban en los hallazgos de la 1ª
  pasada. Sin review por defecto, esa señal queda solo en el subconjunto que pide review
  (sesgado hacia lo riesgoso). La señal principal pasa a ser `assumption_reversed` y los
  commits `fix` sobre los mismos archivos, que dev-metrics ya mide (one-shot rate).
- El chequeo de cierre depende de que el agente lo haga con honestidad; no hay
  enforcement mecánico, igual que con `tests` en ADR-0029.

## Alternativas consideradas

1. **Bajar el nivel del review** (`medium` en todos los tiers): descartado. Abarata cada
   pasada, pero el problema es el loop y no el nivel: los hallazgos inducidos nacen igual.
2. **Mantener el review y cortar a una sola pasada obligatoria**: descartado. Sigue
   pagando ~1 review por cambio para una señal que, con 7,7 hallazgos de media y deuda
   abierta en el 74 %, no cierra el cambio.
3. **Apagar el review sin reforzar la spec**: descartado. Deja el mismo hueco que el
   review tapaba mal; las cuatro filas nuevas salen directamente de los hallazgos que se
   repetían.
