# @devground/sdd

## 1.1.2

### Patch Changes

- 8ce7b98: orchestrator-gate: resolve the session model from the transcript.

  The previous fail-closed fix (03b66cf) was inert. Hook events never carry
  current_model — verified against real payloads captured from the hook itself on
  Claude Code 2.1.210, where the event keys are cwd, effort, hook_event_name,
  permission_mode, prompt_id, session_id, tool_input, tool_name, tool_use_id and
  transcript_path — and the fallback read `.model` from ~/.claude/settings.json,
  which is null whenever the model is picked with /model instead of pinned in
  settings. Both hooks therefore saw an empty model and let every event through:
  the gate never fired once.

  Both hooks now resolve the model from the transcript: the last `assistant` entry
  with isSidechain != true, field .message.model. The tool_use entry is persisted
  before the tool executes, so the model is always available at PreToolUse. If the
  model still cannot be determined, the gate applies the rule instead of allowing
  (reads are unaffected — only mutations are denied). current_model is still read
  first in case the harness reintroduces it.

## 1.1.1

### Patch Changes

- 6ca4aa7: El gate de orquestación ahora falla-cerrado cuando jq no está instalado: en vez
  de dejar pasar todo en silencio (fail-open), emite un deny pidiendo instalar jq.
  En máquinas con jq el comportamiento no cambia. setup-orchestration valida que el
  directorio orchestration/ exista en el paquete antes de copiarlo y aborta con
  mensaje claro si falta. Se amplió gate.test.sh para cubrir las ramas MCP
  mutante/read-only, el allowlist de file-ops en el scratchpad, el stripping de
  comillas y el nuevo caso de jq ausente.

## 1.1.0

### Minor Changes

- 617adfe: Ship the orchestration hard-rule as an installable, versioned layer.

  Adds the `devground-orchestration` installer (gate + context hooks and the
  planner/planner-deep/ejecutor agents) plus a `sync-orchestration` script, so the
  Fable/Opus orchestration rule that lived only in a single machine's ~/.claude is now
  reproducible for the team. Executes the bus-factor commitment of ADR-0026 §4; the
  full tier model is documented in ADR-0027 (supersedes ADR-0022). Additive: no
  existing behaviour changes.

### Patch Changes

- 03b66cf: orchestrator-gate: fail-closed and correct subagent detection.

  Two fixes to the shipped hooks: (1) when a hook event lacks current_model the
  gate now falls back to the model configured in ~/.claude/settings.json and
  lowercases it before matching — previously such events bypassed the gate
  entirely; (2) subagent tool calls are now recognized by the agent_id field in
  the event payload (transcript_path always points at the main session, so the
  path-based pattern never matched; it remains as a fallback).

## 1.0.0

### Major Changes

- 48dd01b: Declare the package stable at 1.0.0 (ADR-0026, consolidation phase).

  No behaviour changes: the bump is the semver commitment itself. From 1.0.0 on,
  any breaking change to the `devground-sdd` installer, the spec-flow skill
  contract (tiers, telemetry events) or the installed file layout requires a
  major release. Internal adoption depends on this package; `0.x` no longer
  reflects its contract.

### Minor Changes

- 56d7f96: Rebalance simétrico de spec-flow (v0.3): la skill ahora mide los **dos** modos de fallo, no solo la sobre-interrogación.

  - **Telemetría bidireccional**: nuevo evento `assumption_reversed` en `.spec-flow/events.jsonl` como contrapeso de calidad al `questions_asked` (mata el Goodhart de "preguntar 0 = éxito"). Se añade el campo `assumptions` y un discriminador `event` (ausente ⇒ `"spec"`, compatible con eventos previos).
  - **Tier 0 deja de emitir telemetría**: honra su promesa de "no artifacts"; la telemetría corre de Tier 1 en adelante.
  - **Prime Directive simétrico**: nueva sección "The opposite failure" y anti-patrón espejo contra inferir con confianza y equivocarse.
  - **Codemap degradado** de obligatorio a default fuerte (su uso real medido es marginal).
  - El evento de reversión lleva un `task_id` opcional que lo liga al `decisions.jsonl` de model-orchestrator, para atribuir el retrabajo al modelo asignado.

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
