---
name: ui-conventions
description: Fires BEFORE generating or modifying any frontend UI — forms, inputs, modals, buttons, pages, React/Next.js/Tailwind components — even if the user does not name the skill; loads the project's UI conventions so code is correct and consistent on the first pass instead of fixed by a later audit; especially for Chilean (es-CL) apps: RUT, phone +56, currency/UF formatting.
---

# UI Conventions

## 1. Purpose / when this fires

This skill acts **before** UI code is written, not after. It is a correctness/consistency
layer: own components vs. browser primitives, input formatting, accessibility and focus,
error/loading states, and microinteractions — plus region-specific rules for Chile (es-CL)
such as RUT, phone, and currency formatting.

Trigger it whenever you are about to generate or edit a form, input, modal, button, page,
or any React/Next.js/Tailwind component — even if the user's request does not mention this
skill by name.

## 2. Load order (mandatory)

1. **Always** load `references/base.md` first. It is the universal layer: rules that apply
   to any project regardless of stack or design system.
2. **Look for a project overlay** at `docs/ui-conventions.md` in the repo you are working in.
   - If it exists, load it. On conflict, **the overlay wins over base.md** — its concrete
     tokens, own components, and helpers replace the generic rule.
   - If it does **not** exist, continue with the base layer alone and **offer** to mine one,
     pointing at `references/mining-prompt.md`. Do not mine it unless the user asks for it.

## 3. Apply during generation, not after

Apply these conventions while writing the code — the first draft should already follow
them. This skill is not a linter that runs afterward; it is context loaded up front so the
correction pass a design-audit would otherwise require becomes unnecessary.

## 4. Relationship with other skills

`design-taste` / `frontend-design` own aesthetics — layout, typography, motion, spacing
taste. This skill is a different layer: correctness and consistency (does the input have
the right `type`/`inputMode`, does the modal trap focus, is the RUT validated). A later
design-audit still acts as a safety net, but with this skill loaded up front there should
be little left for it to catch.

## 5. Maintain the overlay

When you generate UI and establish a new pattern the overlay does not yet capture, pay down a
row from its "Deuda conocida" table, or discover that `docs/ui-conventions.md` contradicts the
real code, update the overlay in the **same** change — do not leave it stale. Same principle as
spec-flow's codemap: whoever uses the overlay maintains it. If the repo has no overlay yet and
you just wrote UI worth codifying, offer to mine one (`references/mining-prompt.md`); never
rewrite the overlay silently — surface the diff so the human can confirm it.
