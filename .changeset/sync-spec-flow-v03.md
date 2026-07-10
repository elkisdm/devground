---
"@devground/sdd": minor
---

Sincroniza spec-flow a v0.3. La skill ahora:

- Cuida el fallo opuesto a la sobre-interrogación: **inferir con confianza y equivocarse** en
  un desconocido de alto impacto. `questions_asked = 0` deja de ser la meta; la meta es el
  número correcto de preguntas para el riesgo del cambio.
- Telemetría **bidireccional**: además del evento `spec`, emite `assumption_reversed` cuando
  un supuesto inferido resulta equivocado, para que "preguntó 0 y construyó lo incorrecto" no
  puntúe igual que una corrida limpia. Tier 0 deja de emitir eventos.
- **Step 3.5** (opcional, Tier 2-3): emite un `tasks.json` machine-readable para orquestar las
  tareas por complejidad con model-orchestrator.
- **Step 0** relajado: leer el codemap es un default fuerte, ya no un mandato rígido.
