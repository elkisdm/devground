# @devground/ui-conventions

## 0.1.0

### Minor Changes

- ff9e6f5: Add `@devground/ui-conventions`: UI convention skill for Claude Code, installable via
  `devground-ui-conventions` (project-level `.claude/skills/`, or `--global`). Loads a
  universal base layer of frontend conventions — own components vs. browser primitives,
  es-CL input formatting, accessibility, error/loading states, microinteractions — as
  context before generating or editing UI, with an optional per-project overlay
  (`docs/ui-conventions.md`) that takes precedence when present.
