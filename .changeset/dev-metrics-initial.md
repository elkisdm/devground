---
'@devground/dev-metrics': minor
---

New package `@devground/dev-metrics`: a CLI that builds a labelled time-series of
"coding with agents" — code volume, quality, velocity and efficiency — from git
history and Claude Code transcripts.

Commands:

- `collect` — write a self-describing metrics snapshot (git churn, conventional
  commit type distribution, rework ratio, file re-touch; transcript tokens by
  model, tool_use counts, Edit/Write ratio, per-file iteration; derived
  tokens/commit and churn↔tokens R²).
- `report <snapshot>` — render a markdown report.
- `diff <A> <B>` — delta table between two snapshots, aligned with event
  annotations.
- `event` — record a standard/tool adoption to separate transition cost from
  steady-state regime in diffs.

Methodology and caveats documented in docs/adr/0006-dev-metrics.md.
