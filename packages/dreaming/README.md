# @devground/dreaming

**dreaming** — out-of-band memory consolidation for Claude Code. It reviews a project's
recent session transcripts against its memory store and proposes a *reviewed diff*:
merge duplicates, deprecate stale/contradicted memories, add recurring patterns and
feedback that were never captured, and fix index drift. **Nothing is written to memory
without your approval; nothing is ever hard-deleted.**

Inspired by the "dreaming" idea from Anthropic's context-engineering work: in-band memory
(what an agent writes mid-session) can't see patterns *across* sessions and competes with
the task for attention. Dreaming runs separately, with dedicated attention, and its only
job is to make the memory store better over time.

## Install

Into the current project:

```bash
npx @devground/dreaming
# -> .claude/skills/dreaming/
```

For all your projects (user-level):

```bash
npx @devground/dreaming --global
# -> ~/.claude/skills/dreaming/
```

Existing files are never overwritten — re-run after an upgrade to add new files while
keeping your local edits. `npx @devground/dreaming` (no args) runs the `install` command;
`devground-dreaming gather` runs the harness (see below). Node ≥ 20, no Python needed.

## How it works

Three actors, deliberately separated:

1. **The harness** (`devground-dreaming gather`) does the cheap, deterministic, token-free
   part: pick the transcripts in the window (since the last dream, else `--days`),
   distill each to its conversational spine + tool-error signals (stripping command
   noise, thinking, and bulky tool output), and snapshot the current memory store. It
   emits one compact markdown bundle.
2. **The agent** (the `dreaming` skill) reasons over the bundle: finds duplicates, stale
   or contradicted memories, recurring-but-uncaptured patterns, missing feedback, and
   index drift — then writes a **proposal** with evidence (session id + date) per change.
3. **You** are the approval gate. The skill stops at the proposal and applies only what
   you approve, item by item.

```bash
# run the harness directly (the skill does this for you):
devground-dreaming gather --project=-Users-you --days 30
# -> writes <memory>/.dream/bundle-latest.md + prints a JSON summary
```

The harness is a compiled TypeScript CLI that **reuses `@devground/dev-metrics`'s
transcript reader** (`parseTranscriptLine`, `extractToolUses`) and memory helpers
(`defaultMemoryRoot`, `parseCreatedFrontmatter`) — no duplicated JSONL parsing.

Then, in Claude Code, run `/dreaming` (or say *"consolida la memoria"*) and review the
proposed diff.

## Safety

- No write without explicit approval; every run stops at a proposal.
- Deprecate = move the file to `<memory>/.dream/archive/` (reversible), never `rm`.
- Preserves `created` / `originSessionId` / `[[backlinks]]`; bumps `updated`; keeps
  `MEMORY.md` in sync.
- Scope isolation: only ever reads/writes within one project's memory dir and its own
  transcripts.

## Status

Incubation — private pilot, unpublished. Ships the skill + a compiled TypeScript harness
(reusing `@devground/dev-metrics`' transcript reader) with vitest coverage of the pure
functions (distill, frontmatter, window).
