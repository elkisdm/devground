---
"@devground/dreaming": minor
---

Add `@devground/dreaming`: out-of-band memory consolidation for Claude Code, installable
via `devground-dreaming` (project-level `.claude/skills/`, or `--global`).

It reviews a project's recent session transcripts against its memory store and proposes a
reviewed diff — merge duplicates, deprecate stale/contradicted memories, add
recurring-but-uncaptured patterns and feedback, and fix `MEMORY.md` index drift. A
deterministic Python harness (`scripts/dream-gather.py`) does the token-free gather
(window selection + transcript distillation + memory snapshot); the skill reasons over
the bundle and writes a proposal with evidence per change. Nothing is written to memory
without approval; deprecate moves files to `.dream/archive/` and never hard-deletes.
