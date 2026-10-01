# ADR-0040: Plan de ejecución por agentes y contexto acotado

- **Estado**: Aceptado
- **Fecha**: 2026-10-01
- **Decisor**: edaza
- **Aplica a**: `@devground/sdd` (skill spec-flow v0.8, agentes `ejecutor*`, instalador), configuración de Claude Code (`autoCompactWindow`)
- **Reemplaza**: [ADR-0030](0030-delegacion-opt-in-por-peticion.md) para la ejecución de cambios Tier 2–3. `planner`, `planner-deep` y los agentes de review siguen siendo opt-in.
- **Extiende**: [ADR-0031](0031-modelo-explicito-al-delegar.md) (modelo explícito por naturaleza de la tarea), [ADR-0039](0039-review-opt-in-y-spec-como-gate.md)

## Contexto

Con el review ya opt-in (ADR-0039), el grueso del gasto restante está en las sesiones
principales. Medición sobre los transcripts de `~/.claude/projects` desde el 2026-09-01
(todos los modelos a precios de Opus, como indicador comparativo):

| Señal                                                                        | Valor                                                     |
| ---------------------------------------------------------------------------- | --------------------------------------------------------- |
| Costo de sesiones principales que es **releer contexto** (lecturas de caché) | 75 %                                                      |
| Costo que es texto generado                                                  | 10 %                                                      |
| Contexto por turno                                                           | mediana 293k tokens · p90 700k · máximo 999k              |
| Sesiones más caras                                                           | más de 1.000 turnos cada una                              |
| Compactaciones automáticas                                                   | 30 en 572 sesiones (la ventana de 1M casi nunca se llena) |

Cambiar de modelo mueve poco este número; el tamaño del contexto lo mueve todo. Dos
palancas lo atacan:

1. **Que el contexto no crezca sin techo.** Simulación turno a turno sobre las mismas
   sesiones (calibrada contra el gasto real con ~5 % de error), compactando al cruzar un
   umbral y dejando que el contexto vuelva a crecer:

   | Umbral   | Ahorro en sesiones principales | Compactaciones |
   | -------- | ------------------------------ | -------------- |
   | 500k     | 28 %                           | 189            |
   | 400k     | 35 %                           | 279            |
   | **300k** | **43 %**                       | **423**        |
   | 250k     | 47 %                           | 556            |
   | 200k     | 51 %                           | 776            |

   Hasta 300k cada escalón ahorra 6–8 puntos. Más abajo, el ahorro marginal cae a la mitad
   y las compactaciones (cada una, una oportunidad de perder detalle) se disparan.

2. **Que el trabajo pesado no ocurra en el contexto largo.** Un agente arranca con un
   contexto chico y devuelve un resumen; el loop principal no acumula los archivos que el
   agente leyó.

El ADR-0030 hizo opt-in la delegación porque la regla dura anterior lanzó 232 agentes que
nadie pidió. Esa lección se conserva como límites, no como prohibición.

## Decisión

1. **Compactación automática con techo de ~300k.** `autoCompactWindow: 320000` en
   `~/.claude/settings.json` (el mismo ajuste que guarda `/autocompact`). Claude Code toma
   el menor entre ese valor y la ventana del modelo, así que un modelo con ventana de 200k
   no cambia. Se descartó `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`: en el código figura como
   override de prueba y es un porcentaje de la ventana de cada modelo.
2. **spec-flow 0.8 — plan de ejecución en Tier 2–3** (Paso 3.5). El brief lleva una tabla
   `### Ejecución` con una fila por tarea: agente, modelo · esfuerzo, archivos y entrega.
   La asignación sigue el piso de `model-orchestrator/policy.json` según la naturaleza de
   la tarea:

   | Naturaleza                                                                     | Agente                          | Modelo · esfuerzo |
   | ------------------------------------------------------------------------------ | ------------------------------- | ----------------- |
   | Buscar / leer código                                                           | `Explore` con `model: sonnet`   | sonnet            |
   | Mecánica (docs, rename, bump, formato)                                         | `ejecutor-mecanico`             | haiku · low       |
   | Lógica (feat, fix, refactor, tests)                                            | `ejecutor`                      | sonnet · medium   |
   | Lógica de riesgo alto (auth, dinero, migración irreversible, contrato externo) | `ejecutor-critico`              | opus · high       |
   | Juicio (diseño, decisión, integración)                                         | el orquestador (loop principal) | modelo de sesión  |

   El esfuerzo vive en la definición de cada agente, por eso la tabla nombra agentes y no
   solo modelos.

3. **Límites:** máximo 5 agentes por cambio; las tareas que tocan los mismos archivos van
   en secuencia; ningún agente de review; el plan es visible en el brief (Tier 2 avanza
   salvo objeción, Tier 3 se presenta antes). Tier 0–1 se quedan en el loop principal.
4. **Contrato del agente:** recibe el objetivo, su tarea, los archivos, los escenarios e
   invariantes que le tocan y los tests que debe escribir; devuelve en 15 líneas como
   máximo los archivos cambiados, el comando de tests con su resultado real y las
   desviaciones. El orquestador integra leyendo resúmenes y `git diff --stat`, corre la
   suite y hace el chequeo de cierre. Una desviación vuelve primero al brief.
5. **Una sesión por cambio.** Al cerrar un cambio, spec-flow sugiere en una línea seguir
   en una sesión nueva: todo lo necesario vive en el brief, el code map y git.
6. **Distribución:** `npx @devground/sdd` instala, además de la skill, los tres
   `ejecutor*` (sin sobrescribir los existentes), porque el plan depende de ellos. La capa
   de hooks de orquestación (ADR-0027/0028) sigue siendo opt-in y aparte.

## Consecuencias

**Positivas**

- Ataca el 75 % del gasto de las sesiones principales en vez del modelo, que pesaba poco.
- El esfuerzo por tarea queda explícito y visible en el brief; lo mecánico deja de correr
  en Opus.
- La compactación y la sesión por cambio se refuerzan: menos sesiones llegan a 300k.

**Negativas / Trade-offs**

- Cada agente cuesta su arranque, y el contrato tiene que ser autocontenido: un brief
  pobre produce un agente que adivina. El pre-mortem y el chequeo de cierre (ADR-0039)
  son la defensa.
- Integrar trabajo de varios agentes puede chocar; por eso las tareas con archivos en
  común van en secuencia.
- Cada compactación puede perder detalle. Se mitiga porque la spec vive en el brief y no
  solo en la conversación.
- Revierte parcialmente el ADR-0030. El riesgo que motivó ese ADR (agentes que nadie
  pidió) queda acotado por el tope de 5, la tabla visible y que Tier 0–1 no delegan.

## Medición

`~/.claude/scripts/spec-flow-v07-medicion.py`, a correr desde el 2026-10-15: gasto diario
y participación del review frente a septiembre (~US$1.074/día, review 43 %). El uso de
agentes por modelo se lee de los `meta.json` de los transcripts; no se agregan campos a la
telemetría de spec-flow.

## Alternativas consideradas

1. **Bajar el modelo de sesión por defecto** (Sonnet en vez de Opus): descartado como
   palanca principal; el costo dominante es el contexto, que se relee igual con cualquier
   modelo.
2. **Compactar al 15–20 %**: descartado; ahorra 8–11 puntos más que 300k a cambio de
   triplicar las compactaciones.
3. **Usar siempre `model-orchestrator`** con su router: descartado como default; agrega
   una llamada de router por tarea. Sigue disponible cuando se pide.
