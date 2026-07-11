# @devground/sdd

## 0.3.0

### Minor Changes

- 591bac2: Sincroniza spec-flow a v0.3. La skill ahora:

  - Cuida el fallo opuesto a la sobre-interrogación: **inferir con confianza y equivocarse** en
    un desconocido de alto impacto. `questions_asked = 0` deja de ser la meta; la meta es el
    número correcto de preguntas para el riesgo del cambio.
  - Telemetría **bidireccional**: además del evento `spec`, emite `assumption_reversed` cuando
    un supuesto inferido resulta equivocado, para que "preguntó 0 y construyó lo incorrecto" no
    puntúe igual que una corrida limpia. Tier 0 deja de emitir eventos.
  - **Step 3.5** (opcional, Tier 2-3): emite un `tasks.json` machine-readable para orquestar las
    tareas por complejidad con model-orchestrator.
  - **Step 0** relajado: leer el codemap es un default fuerte, ya no un mandato rígido.

## 0.2.0

### Minor Changes

- 8bbaffa: Add `@devground/sdd`: packages the spec-flow intake skill with a `devground-sdd`
  installer (project-level `.claude/skills/spec-flow/`, or `--global`). Step 0 now makes
  reading `docs/codemap.md` mandatory when present.

  dev-metrics: add `orientation` command (orientation cost = output tokens before the
  first edit, plus a size-robust share and a codemap-payoff comparison restricted to
  codemap-having repos) and `spec-flow-impact` (segments spec-flow vs same-repo pre-rollout
  control with strict detectors, baseline-relative aggregation, and recency-matched control).
