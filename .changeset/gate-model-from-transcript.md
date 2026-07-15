---
"@devground/sdd": patch
---

orchestrator-gate: resolve the session model from the transcript.

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
