---
"@devground/sdd": patch
---

orchestrator-gate: fail-closed and correct subagent detection.

Two fixes to the shipped hooks: (1) when a hook event lacks current_model the
gate now falls back to the model configured in ~/.claude/settings.json and
lowercases it before matching — previously such events bypassed the gate
entirely; (2) subagent tool calls are now recognized by the agent_id field in
the event payload (transcript_path always points at the main session, so the
path-based pattern never matched; it remains as a fallback).
