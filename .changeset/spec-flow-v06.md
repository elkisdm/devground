---
'@devground/sdd': minor
'@devground/dev-metrics': minor
---

spec-flow pasa a v0.6: pre-mortem en la spec y cota al ciclo de revisión (ADR-0037), extendiendo el ADR-0036 que puso el review en la Definition of Done.

La medición del 2026-09-14 mostró por qué los hallazgos por cambio no bajaban: en 73 sesiones con `/code-review` el 44% iteró dos o más veces (máximos de 18 y 14 pasadas), y desde la tercera pasada la mayoría de los hallazgos eran consecuencia de los arreglos de la anterior. La spec no escribía lo que el revisor iba a buscar, y el bucle no tenía cota.

- **Pre-mortem** (Tier 2+): cinco filas en el brief — caminos, fallas, invariantes → test, simetrías, reutilización — cada una espejo de un ángulo del revisor, respondidas antes de codificar.
- **Design gate** (Step 3.6): la spec se revisa con esa checklist antes del primer Edit; en Tier 3 se propone delegarla a `planner`.
- **Tests verificados en ambos sentidos**: un test que protege una guarda cuenta solo si se le vio fallar con el arreglo revertido; los fakes llevan contrato. Valor nuevo `tests:"verified"`.
- **Review como puerta, no bucle**: pasada 1 → agrupar por causa raíz → cerrar todo con un ledger → pasada 2 (alcance por tier) → regla de parada por hallazgos inducidos → pasada 3 máxima y última.
- **Telemetría en dos eventos**: el evento `spec` (tras el design gate, commiteado con el cambio) gana `premortem: {na}` y `spec_review`; un evento `review` nuevo (al cerrar el bucle, commiteado con los arreglos, unido por `change`) lleva `passes`, `findings` (solo la primera pasada), `findings_capped`, `found_total`, `induced`, `resolved`, `open` (la deuda, explícita), `redesigned` y `tests`. Un `spec` sin `review` es una revisión que nunca cerró.

`@devground/dev-metrics` discrimina los eventos por `event` (las reversiones ya no se cuentan como specs de Tier 0), rechaza conteos que no sean enteros no negativos (un `"pending"` deja de valer cero) y añade el bloque "Review loop": por repo, con mediana entre repos y el n de cada métrica; los hallazgos censurados por el tope del revisor se reportan aparte y nunca entran en una media. La comparación central — hallazgos de primera pasada con pre-mortem contra la línea base 0.5 — es la medición que puede refutar v0.6.
