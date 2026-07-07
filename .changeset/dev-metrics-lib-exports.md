---
"@devground/dev-metrics": minor
---

Expose `transcript` and `memory` library subpaths (`@devground/dev-metrics/transcript`,
`@devground/dev-metrics/memory`) via the package `exports` map, so other packages can
reuse the transcript reader (`parseTranscriptLine`, `TranscriptRecord`, `extractToolUses`,
`dedupByUuid`) and memory enumeration (`defaultMemoryRoot`, `listMemoryNotes`,
`parseCreatedFrontmatter`) without deep-importing from `dist/`. Additive — no behavior
change to the CLI.
