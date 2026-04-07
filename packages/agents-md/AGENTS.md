# Development Standards

These rules are mandatory for all AI agents and human contributors working in this codebase.

---

## 1. Test-Driven Development (TDD) — Strict

All development follows the strict TDD cycle:

1. **Test first.** Before writing production code, create the test that defines the expected contract/behavior. The test must fail initially (red).
2. **Then implement.** Write the minimum code necessary to make the test pass (green).
3. **Refactor.** Improve the code while keeping all tests green.

This applies to: new features, behavior changes, bug fixes, service functions, API routes, and any non-trivial logic. Only purely visual/layout changes without logic are exempt.

**No feature is considered complete without its corresponding tests.**

---

## 2. Conventional Commits — Atomic

Use standard prefixes on every commit:

- `feat:` — new feature
- `fix:` — bug fix
- `test:` — new tests or test changes
- `docs:` — documentation
- `refactor:` — changes without altering behavior
- `chore:` — tasks with no code impact (deps, config, tooling)
- `style:` — formatting, whitespace, semicolons
- `perf:` — performance improvements
- `ci:` — CI/CD changes
- `revert:` — reverting a previous commit

**Atomic commits**: each commit must represent one complete idea. This enables clean reviews, `git bisect`, and rollbacks.

Example:

```
feat: add email validation to signup form

- Validate email format on client and server
- Show error message if invalid
- Tests: validators.email.test.ts

Closes #123
```

---

## 3. Continuous Documentation

Document always. Every feature, improvement, fix, or incident must be documented:

- **In code**: comments on non-obvious logic, JSDoc on public service functions.
- **In commits**: descriptive messages with conventional prefixes.
- **In project docs**: update guides when adding patterns, services, or architectural decisions.
- **In docs/**: create or update documents for complex features, integration flows, or important design decisions.

The goal is that any developer (human or AI) can understand the what, why, and how of every change without asking.

---

## 4. Testing Pyramid

```
Unit tests       (fast, many)    ▲
Integration      (medium, some)  █
E2E              (slow, few)     █
```

Maintain the balance: more fast tests at the base, few slow tests at the top.

- **Unit**: classification, utilities, helpers, pure functions
- **Integration**: API contracts, service integrations
- **E2E**: critical end-to-end flows only

Run relevant tests before considering any task complete.

---

## 5. Zero Dead Code

- Never leave unused files, functions, variables, or imports.
- Never comment out old code — **delete it and trust `git log`** for recovery.
- Keep the codebase clean and readable.
- Verify no dead code exists before merging (linters help detect this).

---

## 6. Consistent Error Handling

Define clear error handling patterns:

- **In API routes**: `try-catch`, input validation, HTTP responses with appropriate status codes.
- **In services**: throw descriptive errors (e.g., `throw new Error('Lead not found: ${leadId}')`).
- **In components**: catch and log errors, show user feedback.
- **In jobs/crons**: log errors to runtime logs.

Never silence errors with `.catch(() => {})` unless deliberate (document why).

---

## 7. Architecture Decision Records (ADR)

When choosing a pattern, technology, or architectural approach, document the **why**:

- Create `docs/ADR/NNN-decision-name.md` with: **Context**, **Decision**, **Consequences**, **Alternatives considered**.
- Or update the project's main documentation with a section in "Key Design Decisions".

This prevents repeating discussions and facilitates onboarding.

---

## 8. Directory READMEs

Add `README.md` in directories with complex or non-obvious logic:

- `lib/services/README.md` — index of services, what each one solves
- `tests/README.md` — how to run tests, folder structure
- `docs/README.md` — documentation index

This facilitates onboarding and prevents "where is X?" questions.

---

## 9. Semantic Tokens in UI

Projects with dark/light mode must use semantic design tokens. **Never hardcode colors** in components.

**Canonical mapping:**

| Hardcoded | Semantic token |
|-----------|---------------|
| `bg-white` (card/panel) | `bg-card` |
| `bg-white` (page/body) | `bg-background` |
| `bg-slate-50` / `bg-slate-100` | `bg-muted` or `bg-muted/40` |
| `border-slate-200` | `border-border` |
| `text-slate-900` / `text-slate-950` | `text-foreground` |
| `text-slate-500` / `text-slate-600` | `text-muted-foreground` |
| `hover:bg-slate-50` | `hover:bg-muted/50` |

**Status colors** (emerald/rose/amber/sky) — always add dark variants:

```
border-emerald-200 bg-emerald-50 text-emerald-700
dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400
```

**Exceptions** — intentional hardcoded colors:
- Brand colors (gradients, accent colors)
- Public-facing pages (always light mode)
- Auth pages (always dark)

---

## 10. `cn()` Helper — Mandatory

Always use a utility function (like `cn()` from `clsx` + `tailwind-merge`) to combine classes in components that accept `className`:

```tsx
// Correct
import { cn } from '@/lib/utils';

function MyCard({ className, ...props }) {
  return <div className={cn('bg-card border border-border rounded-lg', className)} {...props} />;
}

// Incorrect — fragile concatenation
function MyCard({ className }) {
  return <div className={`bg-card border ${className}`} />;
}
```

This allows clean overrides from the caller without fragile string concatenation.

---

## General Principles

- **Concepts over code** — understand fundamentals before writing implementations.
- **Solid foundations** — design patterns, architecture, and testing before frameworks.
- **No shortcuts** — real quality takes effort and time.
- **AI is a tool** — humans direct, AI executes. The human always leads.
- **Push back** on code without context or understanding of the problem.
