#!/bin/bash
# orchestrator-gate.sh — Regla dura de orquestación.
# Si el modelo de sesión es Fable/Mythos/Opus, el MAIN LOOP no ejecuta cambios:
# bloquea Edit/Write/NotebookEdit y Bash mutante, y exige delegar en subagentes
# (planner=opus, ejecutor=sonnet). Los subagentes NO son bloqueados.
# Excepciones: archivos bajo ~/.claude/ y el scratchpad de sesión.
# Bypass puntual: CLAUDE_ORCHESTRATOR_GATE=off

INPUT=$(cat)

[ "$CLAUDE_ORCHESTRATOR_GATE" = "off" ] && exit 0

# --- #23: jq es requisito duro del gate. Sin jq no se puede parsear el evento;
# fallar-abierto dejaría pasar todo en silencio sobre una "regla dura". Fail-closed
# con diagnóstico. Va DESPUÉS del bypass (línea 11) para no romper el escape
# consciente, y ANTES del primer uso de jq. deny() usa jq -n, así que aquí el
# JSON se emite estático con printf.
if ! command -v jq >/dev/null 2>&1; then
  printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"jq no está instalado; el gate de orquestación no puede evaluar y falla-cerrado por seguridad — instala jq (brew install jq)."}}'
  exit 0
fi

TOOL=$(jq -r '.tool_name // empty' <<<"$INPUT")
MODEL=$(jq -r '.current_model // empty' <<<"$INPUT")
TRANSCRIPT=$(jq -r '.transcript_path // empty' <<<"$INPUT")

# Tool calls de subagentes (Agent tool / Workflow) siempre permitidas.
# Discriminador real (verificado 2026-07-13 con payloads capturados): los
# eventos de subagentes traen agent_id/agent_type; transcript_path apunta
# SIEMPRE a la sesion principal, asi que el patron por ruta solo queda como
# respaldo por si el harness cambia de contrato.
AGENT_ID=$(jq -r '.agent_id // empty' <<<"$INPUT")
[ -n "$AGENT_ID" ] && exit 0
case "$TRANSCRIPT" in
  *"/subagents/"*|*"/agent-"*) exit 0 ;;
esac

# Los eventos PreToolUse pueden no traer current_model: fallback al modelo
# configurado (mismo criterio que orchestrator-context.sh). Sin esto, un evento
# sin current_model deja pasar todo — fail-open del gate.
if [ -z "$MODEL" ]; then
  MODEL=$(jq -r '.model // empty' "$HOME/.claude/settings.json" 2>/dev/null)
fi
MODEL=$(tr '[:upper:]' '[:lower:]' <<<"$MODEL")

# Solo aplica a modelos orquestadores; sonnet/haiku ejecutan libre
case "$MODEL" in
  *fable*|*mythos*|*opus*) ;;
  *) exit 0 ;;
esac

deny() {
  jq -n --arg r "$1" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
  exit 0
}

REASON="REGLA DE ORQUESTACIÓN: este modelo ($MODEL) actúa como advisor/orquestador y NO ejecuta cambios directamente. Delega según tier: Tier 0-1 → Agent(subagent_type=ejecutor) con brief autocontenido del orquestador (rutas + fragmentos inline, sin planner); Tier 2 → Agent(subagent_type=planner, Opus high) y luego ejecutor; Tier 3/riesgo alto → Agent(subagent_type=planner-deep, Opus xhigh) y luego ejecutor. Permitido sin delegar: leer, buscar, y escribir bajo ~/.claude/ o el scratchpad. Bypass consciente del usuario: CLAUDE_ORCHESTRATOR_GATE=off. Permitido también inline (allowlist administrativa): git add/commit/push/fetch/tag, gh pr create/merge/view/checks, gh run view/watch, y limpieza dentro del scratchpad — siempre como comando único sin encadenar."

case "$TOOL" in
  Edit|Write|NotebookEdit)
    FP=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' <<<"$INPUT")
    case "$FP" in
      "$HOME/.claude/settings.json"|"$HOME/.claude/settings.local.json"|"$HOME/.claude/scripts/orchestrator-gate.sh"|"$HOME/.claude/scripts/orchestrator-context.sh"|"$HOME/.claude/agents/planner.md"|"$HOME/.claude/agents/planner-deep.md"|"$HOME/.claude/agents/ejecutor.md"|"$HOME/.claude/CLAUDE.md")
        deny "el orquestador no puede modificar su propia regla; pide el cambio al usuario o delega con aprobación explícita"
        ;;
    esac
    case "$FP" in
      "$HOME/.claude/"*|/private/tmp/claude-*|/tmp/claude-*) exit 0 ;;
    esac
    deny "$REASON"
    ;;
  Bash)
    CMD=$(jq -r '.tool_input.command // empty' <<<"$INPUT")

    # --- Allowlist administrativa (aprobada 2026-07-11): operaciones de un solo
    # comando que administran trabajo ya revisado, sin decisiones de contenido.
    # Requisito duro: comando único (sin ; & | ni saltos de línea) para impedir
    # encadenar un mutante detrás del comando permitido. Se usa un `case` en vez
    # de `grep -E '\n'` porque grep -E no matchea saltos de línea literales de
    # forma portable; el patrón *$'\n'* de bash sí los detecta.
    case "$CMD" in
      *';'*|*'&'*|*'|'*|*$'\n'*) ;; # comando encadenado: no aplica el allowlist
      *)
        # git administrativo (add/commit/push/fetch/tag). NO merge/rebase/reset/checkout:
        # esos deciden contenido o reescriben historia.
        if grep -Eq '^[[:space:]]*git[[:space:]]+(-C[[:space:]]+[^[:space:]]+[[:space:]]+)?(add|commit|push|fetch|tag)([[:space:]]|$)' <<<"$CMD"; then
          exit 0
        fi
        # gh administrativo: PRs (create/merge/view/checks/list), runs, auth switch.
        if grep -Eq '^[[:space:]]*gh[[:space:]]+(pr[[:space:]]+(create|merge|view|checks|list|comment)|run[[:space:]]+(view|list|watch)|auth[[:space:]]+switch)([[:space:]]|$)' <<<"$CMD"; then
          exit 0
        fi
        # Limpieza/gestión de archivos SOLO dentro del scratchpad de sesión:
        # toda ruta absoluta del comando debe vivir bajo el scratchpad.
        if grep -Eq '^[[:space:]]*(rm|mv|cp|mkdir|touch|chmod)([[:space:]]|$)' <<<"$CMD"; then
          PATHS_OK=1
          HAS_ABS=0
          while IFS= read -r p; do
            HAS_ABS=1
            case "$p" in
              /private/tmp/claude-*|/tmp/claude-*) ;;
              *) PATHS_OK=0 ;;
            esac
          done < <(grep -oE '/[^[:space:]"'\'']+' <<<"$CMD")
          if [ "$HAS_ABS" -eq 1 ] && [ "$PATHS_OK" -eq 1 ]; then
            exit 0
          fi
        fi
        ;;
    esac

    # quitar segmentos entre comillas (simples y dobles) antes de analizar,
    # para que grep '=>' archivo o echo "a > b" no disparen falsos positivos
    C=$(sed -E "s/'[^']*'//g; s/\"[^\"]*\"//g" <<<"$CMD")
    # quitar redirecciones inocuas antes de buscar '>'
    C=$(sed -E 's/[0-9]*>&[0-9]+//g; s/[0-9]*>[[:space:]]*\/dev\/null//g' <<<"$C")
    if grep -Eq '(^|[;&|(][[:space:]]*)(sudo[[:space:]]+)?(rm|mv|cp|mkdir|touch|tee|dd|chmod|chown|ln|truncate|kill|pkill|launchctl)([[:space:]]|$)' <<<"$C" \
      || grep -Eq '>' <<<"$C" \
      || grep -Eq 'sed[^|;]*[[:space:]]-i' <<<"$C" \
      || grep -Eq 'git[[:space:]]+(commit|push|checkout|switch|reset|merge|rebase|restore|clean|stash|cherry-pick|revert|apply|am|tag)([[:space:]]|$)' <<<"$C" \
      || grep -Eq '(npm|pnpm|yarn|bun|pipx?|pip3|uv|brew|gem|cargo)[[:space:]]+(install|add|remove|rm|uninstall|update|upgrade|link|publish)' <<<"$C" \
      || grep -Eq '(vercel|netlify|railway|supabase|fly)[[:space:]]+[^|;]*(deploy|--prod)' <<<"$C" \
      || grep -Eq 'gh[[:space:]]+(pr[[:space:]]+(create|merge|close)|repo[[:space:]]+(create|delete)|release[[:space:]]+create)' <<<"$C" \
      || grep -Eq 'curl[^|;]*-X[[:space:]]*(POST|PUT|PATCH|DELETE)' <<<"$C"; then
      deny "$REASON [Comando Bash mutante detectado. Los comandos de solo lectura (ls, grep, git status/log/diff, cat) sí están permitidos.]"
    fi
    exit 0
    ;;
  mcp__*)
    ACTION="${TOOL##*__}"
    if grep -Eq '^(apply|execute|deploy|create|delete|edit|update|move|rename|add|remove|merge|reset|rebase|upload|write|publish|label|unlabel)([_-]|$)' <<<"$ACTION"; then
      deny "$REASON [Operación MCP mutante detectada ($TOOL): las operaciones MCP mutantes también se delegan al ejecutor.]"
    fi
    exit 0
    ;;
esac

exit 0
