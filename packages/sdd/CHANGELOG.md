# @devground/sdd

## 0.2.0

### Minor Changes

- 8bbaffa: Add `@devground/sdd`: packages the spec-flow intake skill with a `devground-sdd`
  installer (project-level `.claude/skills/spec-flow/`, or `--global`). Step 0 now makes
  reading `docs/codemap.md` mandatory when present.

  dev-metrics: add `orientation` command (orientation cost = output tokens before the
  first edit, plus a size-robust share and a codemap-payoff comparison restricted to
  codemap-having repos) and `spec-flow-impact` (segments spec-flow vs same-repo pre-rollout
  control with strict detectors, baseline-relative aggregation, and recency-matched control).
