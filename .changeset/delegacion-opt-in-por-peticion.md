---
"@devground/sdd": minor
---

Delegation to subagents is now opt-in per request, not a session default (ADR-0030).
`CLAUDE.rule.md` splits into two bullets — a base rule that never delegates and an
add-on that only applies once the orchestration hooks are registered — and the
installer warns that pasting the add-on without the hooks delegates on every request.
The `orchestration/` README documents the measured post-mortem: 232 unrequested
subagent launches in 4 days with the hooks already off, caused by the rule text alone.
