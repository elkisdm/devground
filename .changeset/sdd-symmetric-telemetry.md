---
"@devground/sdd": minor
---

Rebalance simétrico de spec-flow (v0.3): la skill ahora mide los **dos** modos de fallo, no solo la sobre-interrogación.

- **Telemetría bidireccional**: nuevo evento `assumption_reversed` en `.spec-flow/events.jsonl` como contrapeso de calidad al `questions_asked` (mata el Goodhart de "preguntar 0 = éxito"). Se añade el campo `assumptions` y un discriminador `event` (ausente ⇒ `"spec"`, compatible con eventos previos).
- **Tier 0 deja de emitir telemetría**: honra su promesa de "no artifacts"; la telemetría corre de Tier 1 en adelante.
- **Prime Directive simétrico**: nueva sección "The opposite failure" y anti-patrón espejo contra inferir con confianza y equivocarse.
- **Codemap degradado** de obligatorio a default fuerte (su uso real medido es marginal).
- El evento de reversión lleva un `task_id` opcional que lo liga al `decisions.jsonl` de model-orchestrator, para atribuir el retrabajo al modelo asignado.
