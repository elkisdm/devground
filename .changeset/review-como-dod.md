---
"@devground/sdd": minor
"@devground/dev-metrics": minor
---

spec-flow pasa a v0.5: el code review es parte de la Definition of Done (ADR-0036), extendiendo el ADR-0029 que puso ahi los tests.

Los tests prueban que el codigo hace lo que la spec dijo. No pueden decirte que la spec estaba incompleta, que el cambio rompio un invariante que nadie escribio, o que duplica algo tres modulos mas alla — porque el test se derivo de la misma spec incompleta. Eso lo encuentra un review, y en la practica **siempre** encuentra algo.

Escalado por tier, como todo en la skill: Tier 0 ninguna, Tier 1 `/code-review medium`, Tier 2 `high`, Tier 3 `max` o deepcheck si cruza modulos. La regla de cierre: corre la revision del tier y cierra todos los hallazgos — arreglandolos, o con una linea que diga por que no es real o no es ahora. No compite con `/code-review` ni con deepcheck: los **agenda**.

La pieza que importa es la telemetria. El evento `spec` gana `"review": {level, findings, resolved}`, y `dev-metrics` lo parsea tolerando las tres formas que toma (ausente en eventos previos, `"n/a"`, o el objeto). Es el tercer gauge y responde lo que los otros dos no pueden: **¿los cambios estan saliendo mas limpios?** Los hallazgos por cambio deberian bajar con el tiempo; si no bajan, spec-flow produce briefs que parecen completos y no lo son. `findings > resolved` es deuda, y esta pensado para verse.
