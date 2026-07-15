#!/bin/bash
# orchestrator-context.sh — Activación automática del modo orquestador.
# UserPromptSubmit hook: si el modelo de sesión es Fable/Mythos/Opus, inyecta
# en cada prompt la instrucción de orquestar (planner=Opus, ejecutor=Sonnet)
# ANTES de que el modelo decida ejecutar por su cuenta.
# Se desactiva junto con el gate: CLAUDE_ORCHESTRATOR_GATE=off

INPUT=$(cat)

[ "$CLAUDE_ORCHESTRATOR_GATE" = "off" ] && exit 0

MODEL=$(jq -r '.current_model // empty' <<<"$INPUT")
TRANSCRIPT=$(jq -r '.transcript_path // empty' <<<"$INPUT")

# --- Misma resolución que orchestrator-gate.sh (ver comentario extenso allí):
# el payload de hooks no trae current_model; el modelo real se lee del transcript.
# Se duplica a propósito para que cada hook sea autocontenido.
# Diferencia con el gate: acá la inyección es advisory, así que si el modelo no se
# puede determinar (primer prompt de una sesión nueva: aún no hay entrada
# assistant) se sale en silencio en vez de fallar-cerrado. El gate es el respaldo.
if [ -z "$MODEL" ] && [ -n "$TRANSCRIPT" ] && [ -r "$TRANSCRIPT" ]; then
  MODEL=$(tail -n 100 "$TRANSCRIPT" 2>/dev/null \
    | jq -Rr 'fromjson? | select(.type=="assistant" and (.isSidechain != true)) | .message.model // empty' 2>/dev/null \
    | tail -1)
fi
if [ -z "$MODEL" ]; then
  MODEL=$(jq -r '.model // empty' "$HOME/.claude/settings.json" 2>/dev/null)
fi

MODEL=$(tr '[:upper:]' '[:lower:]' <<<"$MODEL")
case "$MODEL" in
  *fable*|*mythos*|*opus*) ;;
  *) exit 0 ;;
esac

jq -n '{hookSpecificOutput:{hookEventName:"UserPromptSubmit",additionalContext:"MODO ORQUESTADOR ACTIVO (regla dura respaldada por el hook orchestrator-gate): este modelo asesora y orquesta, NO ejecuta. Si esta petición implica desarrollo (feature, fix, refactor, perf, cambio de código o de sistema), clasifícala primero (spec-flow cuando aplique) y rutea por tier: Tier 0 (typo/chore trivial) → delega directo a Agent(subagent_type=ejecutor, model haiku) con la instrucción puntual, sin ceremonia. Tier 1 (cambio pequeño y de bajo riesgo, ~1-3 archivos) → SIN planner: el orquestador explora lo mínimo necesario, escribe él mismo un brief autocontenido y delega a Agent(subagent_type=ejecutor, Sonnet). Tier 2 → Agent(subagent_type=planner, Opus effort high) para el plan, luego ejecutor. Tier 3 o riesgo alto (migraciones, cambios irreversibles, contratos externos, seguridad) → Agent(subagent_type=planner-deep, Opus effort xhigh), luego ejecutor. REGLA DEL BRIEF: todo brief o plan entregado al ejecutor DEBE traer rutas exactas y los fragmentos de código relevantes inline, para que el ejecutor NO re-explore el repo desde cero. El orquestador siempre revisa el resultado y reporta. NO intentes Edit/Write/NotebookEdit ni Bash mutante en el main loop: el hook los denegará. Operaciones ADMINISTRATIVAS de un solo comando (git add/commit/push/fetch/tag; gh pr create/merge/view/checks; gh run view/watch; limpieza del scratchpad) SÍ se ejecutan inline en el main loop. Preguntas, análisis, lecturas y memoria se atienden directo sin delegar."}}'
exit 0
