# ADR-0036: El code review es parte de la Definition of Done en spec-flow

- **Estado**: Aceptado
- **Fecha**: 2026-09-07
- **Decisor**: edaza
- **Aplica a**: `@devground/sdd` (skill spec-flow), `@devground/dev-metrics` (parser de telemetría)
- **Extiende**: [ADR-0029](0029-tests-como-definition-of-done.md)

## Contexto

[ADR-0029](0029-tests-como-definition-of-done.md) llevó spec-flow a v0.4 poniendo los **tests**
en la Definition of Done, escalados por tier. Cerró la brecha entre "el estándar de tests existe"
y "el flujo que genera los cambios lo exige".

Queda una brecha del mismo tipo, un paso más allá. El autor **ya hace un code review después de
cada implementación**, de forma sistemática, y reporta que **siempre encuentra hallazgos por
resolver**. Ese hábito no está en ninguna parte del flujo: no aparece en el brief, no es condición
de cierre, y —lo que más pesa— **no se mide**. Un hábito que produce hallazgos en cada corrida es
demasiado valioso para depender de que alguien se acuerde.

Los tests y el review no cubren lo mismo, y confundirlos es la razón por la que ADR-0029 no basta:

- Los **tests** prueban que el código hace lo que la spec dijo.
- El **review** encuentra que la spec estaba incompleta, que el cambio rompió un invariante que
  nadie escribió, o que duplica algo que ya existía tres módulos más allá. Un test verde no puede
  detectar nada de eso, porque el test se derivó de la misma spec incompleta.

Además, hay herramientas para hacerlo y ninguna está enganchada al flujo: `/code-review` nativo con
sus niveles de esfuerzo, y `@devground/deepcheck` para revisiones multi-agente con confirmación
adversarial.

## Decisión

Spec-flow pasa a **v0.5**: el review es parte de la Definition of Done, con el mismo principio de
proporcionalidad por tier que ya rige la ceremonia (Step 2) y los tests (ADR-0029).

1. **Brief (Step 3)** — la plantilla gana una sección `### Review` (REQUIRED desde Tier 1), después
   de `### Tests`. Declara el nivel que corresponde al tier y, **una vez implementado**, qué
   hallazgos salieron y qué pasó con cada uno.

2. **Implementación (Step 4)** — nuevo bloque "Review as the closing gate":

   | Tier | Review |
   | --- | --- |
   | 0 | ninguna (preserva la promesa "no artifacts") |
   | 1 | `/code-review medium` sobre el diff |
   | 2 | `/code-review high` |
   | 3 | `/code-review max`, o `deepcheck` si el cambio cruza módulos |

   La regla de cierre: **corre la revisión del tier y cierra todos los hallazgos.** Un hallazgo se
   cierra arreglándolo, o con una línea que diga por qué no es real o no es ahora. Un cambio con
   hallazgos abiertos y sin razón registrada **no está hecho**.

   Se corre **después de que los tests estén verdes**, no en su lugar: un revisor leyendo código
   roto gasta su atención en lo que los tests habrían atrapado gratis.

3. **Telemetría (Step 6)** — el evento `spec` gana el campo opcional
   `"review": {"level", "findings", "resolved"} | "n/a"`. `@devground/dev-metrics` lo parsea con
   tolerancia a las tres formas que toma en la práctica (ausente en eventos previos a 0.5, la
   cadena `"n/a"`, o el objeto), porque una línea malformada nunca puede tumbar una corrida entera
   de métricas.

   **Este campo es el punto del ADR, no un accesorio.** Es el tercer gauge, y responde una pregunta
   que los otros dos no pueden: *¿los cambios están saliendo más limpios?* Los hallazgos por cambio
   deberían **bajar** con el tiempo si el flujo mejora. Si no bajan, spec-flow está produciendo
   briefs que parecen completos y no lo son — y eso es exactamente lo que hoy no se sabe.
   `findings > resolved` al cierre es deuda, y está pensado para verse.

4. **Relación con las herramientas** — spec-flow **no compite** con `/code-review` ni con deepcheck:
   las **agenda**. Elige el nivel por tier y exige el cierre de los hallazgos; el trabajo de revisar
   lo siguen haciendo ellas.

## Consecuencias

**Positivas**

- Convierte un hábito personal no registrado en un estándar con enforcement de proceso y señal
  medible.
- Da una métrica de calidad de la que hoy no hay ninguna: hallazgos por cambio a lo largo del
  tiempo. Es la primera medición que puede **refutar** que spec-flow sirva.
- El review es la vía principal por la que se descubre que una inferencia fue equivocada, así que
  alimenta directamente los eventos `assumption_reversed` del ADR-0014, que llevaban 16 corridas
  sin registrarse nunca.
- Retrocompatible: los eventos sin `review` siguen parseando.

**Negativas / Trade-offs**

- Agrega un paso obligatorio a todo cambio Tier 1+. Es fricción real, y se paga en cada cambio
  pequeño. Se acepta porque la evidencia del autor es que la revisión **siempre** encuentra algo:
  el paso que se saltaría es justamente el que produce hallazgos.
- `findings` y `resolved` dependen de que el agente los reporte con honestidad; no hay enforcement
  mecánico de esos números, igual que con `tests:"deferred"` en ADR-0029.
- Contar hallazgos invita a Goodhart: un flujo que quiere lucir bien puede reportar menos. El
  contrapeso es que `resolved < findings` es deuda **visible**, y que `assumption_reversed` sigue
  llegando desde afuera del propio reporte.

## Alternativas consideradas

1. **Un flujo aparte, fuera de spec-flow**: descartado — es el mismo error que ADR-0029 corrigió
   con los tests. Un estándar que vive fuera del flujo que genera los cambios depende de que
   alguien se acuerde, y no se mide.
2. **Exigir review también en Tier 0**: descartado — rompe la promesa "no artifacts" de Tier 0, que
   es el ancla anti-fricción de toda la skill.
3. **Un solo nivel de review para todos los tiers**: descartado — o es demasiado caro para un fix
   de una línea, o demasiado superficial para una migración. La proporcionalidad es el principio
   que sostiene la skill entera.
4. **Registrar solo si hubo review, sin contar hallazgos**: descartado — el conteo es justamente lo
   que permite ver la tendencia. Sin él el campo solo confirma que el ritual se cumplió, que es lo
   que menos importa.
