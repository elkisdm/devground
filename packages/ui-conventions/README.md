# @devground/ui-conventions

**UI convention skill for Claude Code.** Loads a project's frontend conventions — own
components vs. browser primitives, es-CL input formatting for RUT/phone/currency,
accessibility and focus, error/loading states, microinteractions — as context **before**
generating or editing UI, instead of relying on a design audit to catch inconsistencies
after the fact.

## Install

Into the current project:

```bash
npx @devground/ui-conventions
# -> .claude/skills/ui-conventions
```

For all your projects (user-level):

```bash
npx @devground/ui-conventions --global
# -> ~/.claude/skills/ui-conventions
```

Existing files are never overwritten — re-run after an upgrade to pull in new reference
files while keeping your local edits.

## How it triggers

The skill fires before you generate or modify any frontend UI — forms, inputs, modals,
buttons, pages, React/Next.js/Tailwind components — even if you don't name the skill
explicitly.

## Base → overlay → mining

1. It always loads the universal base layer (`references/base.md`): rules that hold across
   any stack or design system.
2. It looks for a project-specific overlay at `docs/ui-conventions.md` in the repo you're
   working in. If one exists, it loads it, and on conflict the overlay wins over the base
   — concrete tokens, own components, and helpers replace the generic rule.
3. If no overlay exists yet, it offers to mine one from your actual code (never without
   asking) using `references/mining-prompt.md`, producing a `docs/ui-conventions.md` in the
   format of `references/overlay-template.md`.

## Relationship with design-taste / design-audit

`@devground/design-taste` owns aesthetics — layout, typography, motion, spacing taste.
`ui-conventions` is a different layer: correctness and consistency (input semantics,
focus management, error states) applied while the code is being written. A later
design-audit remains a safety net, but with this skill loaded up front there should be
little left for it to catch.

## License

MIT
