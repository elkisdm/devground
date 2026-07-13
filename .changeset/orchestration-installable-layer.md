---
"@devground/sdd": minor
---

Ship the orchestration hard-rule as an installable, versioned layer.

Adds the `devground-orchestration` installer (gate + context hooks and the
planner/planner-deep/ejecutor agents) plus a `sync-orchestration` script, so the
Fable/Opus orchestration rule that lived only in a single machine's ~/.claude is now
reproducible for the team. Executes the bus-factor commitment of ADR-0026 §4; the
full tier model is documented in ADR-0027 (supersedes ADR-0022). Additive: no
existing behaviour changes.
