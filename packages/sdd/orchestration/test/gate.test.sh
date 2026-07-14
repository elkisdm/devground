#!/usr/bin/env bash
# Pipe-tests de los hooks de orquestación. Hermético: se pasa current_model
# explícito, no depende de ~/.claude/settings.json. Requiere jq + bash.
set -u
DIR="$(cd "$(dirname "$0")" && pwd)"
GATE="$DIR/../scripts/orchestrator-gate.sh"
CTX="$DIR/../scripts/orchestrator-context.sh"
pass=0; fail=0
check() { if [ "$2" = "$3" ]; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: $1 — esperado [$2] obtuve [$3]"; fi; }
# Los hooks no emiten stdout en el caso "allow" (solo exit 0): stdin vacío -> default.
dec() { local raw; raw=$(cat); [ -z "$raw" ] && { echo "allow"; return; }; jq -r '.hookSpecificOutput.permissionDecision // "allow"' <<<"$raw"; }
evt() { local raw; raw=$(cat); [ -z "$raw" ] && { echo "none"; return; }; jq -r '.hookSpecificOutput.hookEventName // "none"' <<<"$raw"; }

o=$(echo '{"tool_name":"Edit","current_model":"claude-opus-4","tool_input":{"file_path":"/repo/a.ts"}}' | bash "$GATE" | dec)
check "opus Edit repo -> deny" "deny" "$o"
o=$(echo '{"tool_name":"Edit","current_model":"claude-sonnet-4","tool_input":{"file_path":"/repo/a.ts"}}' | bash "$GATE" | dec)
check "sonnet Edit -> allow" "allow" "$o"
o=$(echo "{\"tool_name\":\"Edit\",\"current_model\":\"claude-opus-4\",\"tool_input\":{\"file_path\":\"$HOME/.claude/x\"}}" | bash "$GATE" | dec)
check "opus Edit ~/.claude -> allow" "allow" "$o"
o=$(echo "{\"tool_name\":\"Edit\",\"current_model\":\"claude-opus-4\",\"tool_input\":{\"file_path\":\"$HOME/.claude/scripts/orchestrator-gate.sh\"}}" | bash "$GATE" | dec)
check "opus auto-modificar gate -> deny" "deny" "$o"
o=$(echo '{"tool_name":"Bash","current_model":"claude-opus-4","tool_input":{"command":"git status"}}' | bash "$GATE" | dec)
check "opus git status -> allow" "allow" "$o"
o=$(echo '{"tool_name":"Bash","current_model":"claude-opus-4","tool_input":{"command":"rm -rf /repo/x"}}' | bash "$GATE" | dec)
check "opus rm -> deny" "deny" "$o"
o=$(echo '{"tool_name":"Bash","current_model":"claude-opus-4","tool_input":{"command":"git commit -m x"}}' | bash "$GATE" | dec)
check "opus git commit (allowlist) -> allow" "allow" "$o"
o=$(echo '{"tool_name":"Edit","current_model":"claude-opus-4","tool_input":{"file_path":"/repo/a.ts"}}' | CLAUDE_ORCHESTRATOR_GATE=off bash "$GATE" | dec)
check "bypass=off -> allow" "allow" "$o"
o=$(echo '{"current_model":"claude-opus-4"}' | bash "$CTX" | evt)
check "context opus -> inyecta" "UserPromptSubmit" "$o"
o=$(echo '{"current_model":"claude-sonnet-4"}' | bash "$CTX" | evt)
check "context sonnet -> silencio" "none" "$o"

# --- fallback a settings.json cuando el evento no trae current_model (fail-closed) ---
TMPHOME=$(mktemp -d); mkdir -p "$TMPHOME/.claude"
echo '{"model":"claude-fable-5"}' > "$TMPHOME/.claude/settings.json"
o=$(echo '{"tool_name":"Bash","transcript_path":"/x/main.jsonl","tool_input":{"command":"rm -rf /repo/x"}}' | HOME="$TMPHOME" bash "$GATE" | dec)
check "sin current_model + settings fable -> deny" "deny" "$o"
echo '{"model":"claude-sonnet-5"}' > "$TMPHOME/.claude/settings.json"
o=$(echo '{"tool_name":"Bash","transcript_path":"/x/main.jsonl","tool_input":{"command":"rm -rf /repo/x"}}' | HOME="$TMPHOME" bash "$GATE" | dec)
check "sin current_model + settings sonnet -> allow" "allow" "$o"
# --- exención de subagentes por agent_id (transcript_path apunta a la sesión principal) ---
echo '{"model":"claude-fable-5"}' > "$TMPHOME/.claude/settings.json"
o=$(echo '{"tool_name":"Bash","agent_id":"a123","agent_type":"ejecutor","transcript_path":"/x/main.jsonl","tool_input":{"command":"touch /repo/x"}}' | HOME="$TMPHOME" bash "$GATE" | dec)
check "subagente por agent_id -> allow" "allow" "$o"
# --- lowercase del modelo ---
o=$(echo '{"tool_name":"Edit","current_model":"Claude-Fable-5","transcript_path":"/x/main.jsonl","tool_input":{"file_path":"/repo/a.ts"}}' | bash "$GATE" | dec)
check "modelo en mayúsculas -> deny" "deny" "$o"
rm -rf "$TMPHOME"

# --- #22: MCP mutante vs read-only ---
o=$(echo '{"tool_name":"mcp__supabase__apply_migration","current_model":"claude-opus-4","tool_input":{}}' | bash "$GATE" | dec)
check "MCP mutante (apply_migration) -> deny" "deny" "$o"
o=$(echo '{"tool_name":"mcp__supabase__list_tables","current_model":"claude-opus-4","tool_input":{}}' | bash "$GATE" | dec)
check "MCP read-only (list_tables) -> allow" "allow" "$o"
# --- #22: allowlist de file-ops en el scratchpad de sesión ---
o=$(echo '{"tool_name":"Bash","current_model":"claude-opus-4","tool_input":{"command":"rm /private/tmp/claude-501/foo/bar.txt"}}' | bash "$GATE" | dec)
check "rm dentro del scratchpad -> allow" "allow" "$o"
o=$(echo '{"tool_name":"Bash","current_model":"claude-opus-4","tool_input":{"command":"rm /Users/foo/bar"}}' | bash "$GATE" | dec)
check "rm fuera del scratchpad -> deny" "deny" "$o"
# --- #22: stripping de comillas (el > vive dentro de comillas, no es redirección) ---
o=$(echo '{"tool_name":"Bash","current_model":"claude-opus-4","tool_input":{"command":"echo \"a > b\""}}' | bash "$GATE" | dec)
check "echo con > entre comillas -> allow" "allow" "$o"
o=$(echo '{"tool_name":"Bash","current_model":"claude-opus-4","tool_input":{"command":"echo x > /repo/f"}}' | bash "$GATE" | dec)
check "redirección real -> deny" "deny" "$o"
# --- #23: jq ausente -> fail-closed (deny), y el bypass sigue funcionando sin jq ---
JQLESS=$(mktemp -d); ln -s "$(command -v cat)" "$JQLESS/cat"
o=$(echo '{"tool_name":"Edit","current_model":"claude-opus-4","tool_input":{"file_path":"/repo/a.ts"}}' | PATH="$JQLESS" "$(command -v bash)" "$GATE" | dec)
check "jq ausente -> deny (fail-closed)" "deny" "$o"
o=$(echo '{"tool_name":"Edit","current_model":"claude-opus-4","tool_input":{"file_path":"/repo/a.ts"}}' | PATH="$JQLESS" CLAUDE_ORCHESTRATOR_GATE=off "$(command -v bash)" "$GATE" | dec)
check "jq ausente + bypass=off -> allow" "allow" "$o"
rm -rf "$JQLESS"

echo "passed=$pass failed=$fail"
[ "$fail" -eq 0 ]
