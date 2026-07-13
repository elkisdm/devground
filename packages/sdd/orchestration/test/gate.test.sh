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

echo "passed=$pass failed=$fail"
[ "$fail" -eq 0 ]
