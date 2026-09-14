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
- **Telemetría**: `premortem`, `spec_review`, `review.{passes, findings_capped, induced, redesigned}`; `findings` pasa a significar la primera pasada.

`@devground/dev-metrics` parsea los campos nuevos (y deja de convertir valores no numéricos como `"pending"` en cero) y añade el bloque "Review loop" al reporte: mediana de pasadas, tope alcanzado, inducidos, y hallazgos de primera pasada con vs sin pre-mortem — la medición que puede refutar v0.6.
