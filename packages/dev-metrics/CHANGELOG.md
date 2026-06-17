# @devground/dev-metrics

## 0.3.0

### Minor Changes

- 8bbaffa: Add `@devground/sdd`: packages the spec-flow intake skill with a `devground-sdd`
  installer (project-level `.claude/skills/spec-flow/`, or `--global`). Step 0 now makes
  reading `docs/codemap.md` mandatory when present.

  dev-metrics: add `orientation` command (orientation cost = output tokens before the
  first edit, plus a size-robust share and a codemap-payoff comparison restricted to
  codemap-having repos) and `spec-flow-impact` (segments spec-flow vs same-repo pre-rollout
  control with strict detectors, baseline-relative aggregation, and recency-matched control).

## 0.2.0

### Minor Changes

- 9c95a0f: New package `@devground/dev-metrics`: a CLI that builds a labelled time-series of
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

### Patch Changes

- Updated dependencies [38a68ec]
  - @devground/logger@0.2.0
