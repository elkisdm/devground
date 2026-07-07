---
name: dreaming
description: >
  Out-of-band memory consolidation for the user's persistent memory vault — the
  "dreaming" pattern from Anthropic's context-engineering work. Reviews recent
  session transcripts of a project against its memory store and proposes a diff:
  merge duplicates, deprecate stale/contradicted memories, add recurring patterns
  and user feedback that were never captured, and fix MEMORY.md index drift.
  NOTHING is written without the user's approval; nothing is ever hard-deleted.
  Trigger when the user says "dreaming", "consolida la memoria", "limpia el vault",
  "revisa memorias obsoletas/duplicadas", "haz que la memoria mejore sola", or runs
  /dreaming. Optional arg: the project scope (default: home-global).
---

# Dreaming — out-of-band memory consolidation

## What this is

A second-order process over the user's memory vault. In-band memory (what the
agent writes mid-session) can't see patterns *across* sessions and *across*
projects, and it competes with the actual task for attention. Dreaming runs
separately, with dedicated attention, and its only job is to make the memory
store better over time: dedupe, de-stale, fill gaps, tidy the index.

The division of labor is deliberate and must be respected:

- **The harness (`scripts/dream-gather.py`)** does the mechanical, deterministic,
  token-free part: window selection, transcript distillation, memory snapshot.
- **You (the agent)** do the reasoning: read the bundle, find patterns, propose
  changes with evidence.
- **The user** is the approval gate. You never write to the vault until they say so.

## Hard safety rules (non-negotiable)

1. **No write without explicit approval.** Every run stops at a proposal. You apply
   only what the user approves, item by item or in bulk if they say "aplica todo".
2. **Never hard-delete.** DEPRECATE = move the file to `<memory>/.dream/archive/`
   and remove its line from `MEMORY.md`. Reversible always. Never `rm` a memory.
3. **Preserve provenance.** On UPDATE/MERGE: keep the original `created` and
   `originSessionId`; set `updated: <today>`; keep every `[[backlink]]`; keep the
   memory's `name` slug unless the user approves a rename.
4. **Respect the format.** Frontmatter stays valid: `name`, `description`,
   `metadata.{node_type, created, updated, type, originSessionId}`. Body follows the
   user's convention (feedback/project memories get **Why:** / **How to apply:**).
5. **Keep the index in sync.** Any file added/merged/deprecated ⇒ update its
   one-line entry in `MEMORY.md` in the same apply step.
6. **Don't invent evidence.** Every proposed change cites a real transcript session
   (id + date) and/or the concrete memories involved. If you can't cite it, drop it.
7. **Scope isolation.** Only ever read/write within the one project's memory dir and
   its own transcripts. Never bleed one project's memory into another.

## Procedure

### Step 1 — Gather (deterministic, no tokens)

Resolve the project scope (default `-Users-macbookpro`, i.e. home-global). The gather
script sits next to this SKILL.md at `scripts/dream-gather.py`. Resolve its path from
the skill directory — it is installed either project-level or globally:

```bash
# global install:
python3 ~/.claude/skills/dreaming/scripts/dream-gather.py --project <ENCODED_DIR>
# project install:
python3 ./.claude/skills/dreaming/scripts/dream-gather.py --project <ENCODED_DIR>
```

Useful flags: `--since last` (default; since the last dream) · `--days 14`
(fallback window when no prior dream) · `--force-days` (ignore state, use `--days`) ·
`--since 2026-06-01` (explicit) · `--max-sessions N` · `--out PATH`. It prints a JSON
summary and writes the bundle to `<memory>/.dream/bundle-latest.md`. Note: the encoded
project dir starts with a dash, so pass it as `--project=-Users-...` (with `=`) so it
isn't parsed as a flag.

The encoded dir is the folder name under `~/.claude/projects/`. Map friendly names
if the user gives one (e.g. "home-global" → `-Users-macbookpro`, "atlasengine" →
`-Users-macbookpro-Documents-atlasengine`). List `~/.claude/projects/*/memory` if
unsure.

### Step 2 — Analyze (this is the reasoning; read the whole bundle)

Read `bundle-latest.md`. It has the current MEMORY STORE (table + verbatim
`MEMORY.md`) and the distilled RECENT SESSIONS (real user turns + tool errors + a
trimmed last assistant reply per session). Look for these five signal types:

| Signal | What you're hunting for |
|--------|--------------------------|
| **DUPLICATE / OVERLAP** | Two+ memories covering the same fact; or a memory whose scope another already subsumes. → propose MERGE. |
| **STALE / CONTRADICTED** | A memory the recent sessions prove wrong, done, or superseded (a "pending" that's now shipped; a path/flag that changed; a decision reversed). → propose UPDATE or DEPRECATE. |
| **MISSING / RECURRING** | A fact, decision, gotcha, or preference that shows up repeatedly in sessions but has no memory. → propose ADD (following the memory template + type rules). |
| **FEEDBACK NOT CAPTURED** | The user correcting your behavior or confirming an approach (a `feedback` memory the vault is missing). → propose ADD (type `feedback`, with **Why:** / **How to apply:**). |
| **INDEX DRIFT** | `MEMORY.md` line missing, wrong, or describing a memory that no longer matches its file. → propose INDEX-FIX. |

Discipline: prefer few high-confidence proposals over a long noisy list. A
duplicate you're sure of beats five "maybe" tidy-ups. Weight by prevalence — how
many sessions show the pattern. Don't re-propose things already consistent with the
vault. Don't memorialize one-off conversation trivia (the user's own rule).

### Step 3 — Write the proposal (never touch memories yet)

Write to `<memory>/.dream/proposals/<YYYY-MM-DD>.md`. One table row per proposed
change, each with: **action** · **target file(s)** · **evidence** (session id +
date, or the memory names involved) · **rationale** · **prevalence**. Below the
table, for each ADD/UPDATE/MERGE include the **exact final content** (full
frontmatter + body) so the user reviews the real thing, not a summary. For
DEPRECATE, state what moves to archive and why. For INDEX-FIX, show the old and new
`MEMORY.md` line.

Then present a tight summary to the user in chat (counts per action + the headline
changes) and **stop for approval.** Offer: approve all, approve a subset (by row
number), or reject.

### Step 4 — Apply (only what's approved)

For each approved item, respecting every safety rule:

- **ADD**: write the new `<memory>/<slug>.md` (full frontmatter, `created` = today,
  `originSessionId` = the cited session if known) + add its `MEMORY.md` line.
- **UPDATE / MERGE**: rewrite the target file preserving `created`/`originSessionId`,
  set `updated` = today, fold in backlinks; for MERGE, DEPRECATE the absorbed
  file(s). Update the `MEMORY.md` line(s).
- **DEPRECATE**: `mkdir -p <memory>/.dream/archive/` and move the file there; remove
  its `MEMORY.md` line.
- **INDEX-FIX**: edit only the `MEMORY.md` line(s).

Use the Write/Edit tools (they travel through the Obsidian symlink correctly — do
not write to vault paths directly). The vault is git-versioned, so every apply is
recoverable.

### Step 5 — Record the dream

Update `<memory>/.dream/state.json`:

```json
{ "last_dream_ts": "<now ISO-8601>",
  "history": [ { "ts": "<now>", "sessions_reviewed": N,
                 "proposed": P, "applied": A } ] }
```

Append to `history` (don't overwrite it). This is what makes the next run
incremental — it only looks at transcripts newer than `last_dream_ts`.

Then report in one line: `dreaming <project>: N sesiones · P propuestas · A aplicadas`.

## Notes

- **Not coding-specific.** Works for any memory (preferences, project state,
  references), exactly like the user's vault already mixes types.
- **Scaling later (out of scope now, offer if asked):** a `--all` sweep across every
  project dir; a cron/`SessionEnd`-style hook that runs the gather nightly and leaves
  a proposal for the user to review in the morning (mirrors the "next day the agents
  are smarter" idea) — but keep the approval gate.
- The gather script never modifies memory; only Step 4 does, and only post-approval.
