# @devground/sdd

**spec-flow** — the spec-driven development _intake_ skill for Claude Code. It turns a
raw, vague change request into a right-sized, professional spec, then routes it to the
minimum process the change actually deserves. Infer aggressively, state assumptions,
proceed — escalate ceremony only when the change is big or risky enough to earn it.

## Install

Into the current project:

```bash
npx @devground/sdd
# -> .claude/skills/spec-flow/
```

For all your projects (user-level):

```bash
npx @devground/sdd --global
# -> ~/.claude/skills/spec-flow/
```

Existing files are never overwritten — re-run after an upgrade to add new reference
files while keeping your local edits.

## What it does

Given a change request ("add login", "make this faster", "fix this bug"), the skill:

1. **Orients** via `docs/codemap.md` (reading it is mandatory when it exists) and verifies
   paths against real code.
2. **Classifies** along 5 orthogonal axes: type · size · risk · uncertainty · surface.
3. **Routes** to one of 4 tiers (Express → Light → Standard → Full) so a typo skips
   straight to the fix while a risky migration gets explore + spec + design + ADR.
4. **Enriches** into a dual-audience brief (plain-language summary + technical depth)
   with the concrete files & routes to touch — and, from Tier 2 up, a **pre-mortem**:
   paths, failure modes, invariants (each with the test that breaks it), symmetries and
   reuse, answered _before_ code exists. It is the reviewer's question list, moved to spec
   time (ADR-0037).
5. **Gates the design** (Step 3.6): the brief is reviewed against that checklist before
   the first edit; on Tier 3 the gate can be delegated to a read-only planner.
6. **Closes with tests and a bounded review**: new logic ships with tests watched to
   fail with the fix reverted (ADR-0029), then `/code-review` runs as a gate with a
   ledger — two passes by default, a third only after a redesign (ADR-0036, ADR-0037).
7. **Emits telemetry** (one line per change to `.spec-flow/events.jsonl`) so impact is
   measurable — including first-pass findings with vs without a pre-mortem, the number
   that says whether the whole thing works.

## Measuring impact

This package ships the skill only. Whether spec-flow actually helps — test-coupling,
code survival, orientation cost, friction — is measured by
[`@devground/dev-metrics`](../dev-metrics) (`dev-metrics spec-flow-impact` and
`dev-metrics orientation`), which reads the `.spec-flow/events.jsonl` telemetry plus git
and transcript history.

## Fuente canónica y sincronización

La skill viva se desarrolla en `~/.claude/skills/spec-flow/` (validada en uso real). El
directorio `skill/` de este paquete es una **copia versionada** de esa fuente. Tras un
cambio en la skill canónica, resincroniza el mirror:

    node scripts/sync-spec-flow.mjs   # o: pnpm --filter @devground/sdd sync

El script copia `SKILL.md` + `references/` desde `~/.claude/skills/spec-flow/`; **no** copia
`evals/` (vive solo en la fuente canónica). No se corre en `prepublishOnly` a propósito: la
fuente está fuera del repo, así que el mirror commiteado es lo que se publica y sincronizar
es un acto deliberado del desarrollador, no un paso de release.

## License

MIT
