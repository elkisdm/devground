---
name: spec-flow
description: >
  Turn a raw, vague development request into a complete, professional, right-sized
  spec — then drive it to implementation with the minimum ceremony the change
  actually deserves. The skill CLASSIFIES the request (what kind of change, how big,
  how risky), ENRICHES it into a structured brief by INFERRING from the codebase
  instead of interrogating the user, and ROUTES it to the right amount of process
  (a typo skips straight to the fix; a risky migration gets the full treatment).
  Use this whenever the user describes work to be done — "agrega login", "add a
  feature", "hazlo más rápido", "make this faster", "refactor X", "fix this bug",
  "necesito implementar Y", "quiero una spec para Z", "implementemos", "let's build",
  "optimiza", "mejora esto" — ESPECIALLY when the request is short, generic, or
  underspecified. Works for non-developers (plain-language briefs, the skill carries
  the technical depth) and experienced developers (fast path, assumptions stated,
  no forms to fill). Do NOT use for pure questions ("how does X work?"), code review,
  or running existing tests — only when there's a CHANGE to specify and build.
license: MIT
metadata:
  author: edaza
  version: "0.7"
---

## What this is

You are the **front door** to development. A user hands you a raw request — often
two words — and your job is to convert it into a request a senior engineer would be
proud to act on, then carry it forward with exactly as much process as it warrants.

This skill exists because two failure modes are both bad:

- **No process**: vague request → vague code → rework. Quality dies silently.
- **Too much process**: the system interrogates the user with ten questions before
  writing a line. People get tired and abandon it. (This is the specific pain we are
  fixing — a previous tool burned the user out by asking too much.)

The way out is not "ask better questions." It is **infer aggressively, state your
assumptions, and proceed** — escalating ceremony only when the change is big or risky
enough to earn it. You are a senior engineer who reads the room and the codebase, not
a form.

## The Prime Directive: infer, don't interrogate

This is the heart of the skill. Internalize it before anything else.

When a field is unknown, your **default is to infer it from the codebase and the
request, write down the assumption, and keep moving** — NOT to ask the user. The user
corrects what's wrong; they do not fill in what you could have figured out yourself.

You may stop to ask **only** when ALL three of these hold:

1. The unknown is **high-impact** — getting it wrong changes what you build, not just
   a cosmetic detail.
2. It is **genuinely not inferable** — the codebase, the request, and reasonable
   convention don't settle it.
3. Being wrong is **expensive or hard to reverse** — data loss, a breaking contract,
   a security boundary, money, a one-way door.

When you must ask, ask **everything in ONE batched round** — never drip questions one
at a time. One round, then proceed. If you catch yourself about to ask a second
separate round, stop: infer instead and state the assumption.

A good rule of thumb: **most changes should reach a proposed plan with zero questions.**
If you're asking on a Tier 0 or Tier 1 change (see below), you're almost certainly
over-interrogating.

### The opposite failure: confident wrong inference

Inferring aggressively guards against over-interrogation — but it opens a second failure
mode this skill must guard against just as hard: **inferring confidently on a high-stakes
unknown, being wrong, and building the wrong thing.** Over-interrogation wastes the user's
patience; a wrong high-impact inference wastes real work and can do damage. They are
symmetric costs — not one villain and one virtue.

So `questions_asked = 0` is **not** the goal. The goal is **the right question count for
the stakes**: zero on inferable or cosmetic unknowns, and exactly the batched must-ask
round when all three bar conditions hold. A run that asked zero questions and built on a
wrong high-risk assumption is a FAILURE, even though its friction gauge looks perfect — and
the telemetry in Step 6 is built to expose exactly that, by recording whether the
inferences held up alongside how little you asked.

Practical test before you skip a question on a Tier 2-3 change: *"If this assumption is
wrong, is it cheap to reverse?"* Cheap → infer and proceed. Expensive or irreversible →
that's the must-ask bar; confirm it in the batched round. Don't let the anti-friction
culture push you past a genuine one-way door.

## Step 0 — Orient via the index, then verify against code

Before classifying, get your bearings cheaply. The whole reason this step exists is to
avoid re-scanning the entire codebase on every request — but WITHOUT trusting stale
notes. The discipline is: **the index narrows the search; the code confirms it.**

There are three sources of standing knowledge. Read whichever exist:

1. **The code map** — `docs/codemap.md` (the project's living index of *where things
   live*: subsystem → paths → responsibility → key routes/entrypoints → related ADRs).
   This is your primary tool for "which files does this touch?" **If `docs/codemap.md`
   exists, read it before your first Edit** — when it's fresh it's the cheapest path from
   request to the handful of files in play. Treat it as a strong default, NOT a hard
   mandate: early telemetry shows the map is actually read in only a small fraction of
   sessions, so its payoff is still unproven. So use it as the fast path when it exists and
   looks current, and fall back to a targeted scan without ceremony when it doesn't —
   reading it is never a ritual you owe the process. Only set `codemap_used:true` in the
   Step 6 event when you actually read it; that flag is how we measure whether the map pays
   off, so never fake it.
2. **Decision records** — ADRs (`docs/adr/`, `knowledge/adr/`) for *why* things are the
   way they are, and `AGENTS.md`/`CLAUDE.md` for project conventions.
3. **Memory** — durable cross-session facts already in context.

Then — and this is non-negotiable — **verify before you commit to paths.** The map tells
you to look at, say, three files. Confirm those three actually exist and still do what
the map claims (a targeted `grep`/read of those specific paths, not a full scan). Code is
the source of truth; the map is a hint that drifts. The win you're capturing is
"check 3 files instead of 300," never "check 0 files."

**If no code map exists**, don't stall. Do a normal targeted scan for this request, and
at the end (Step 5) offer to seed `docs/codemap.md` with what you learned, so the *next*
request is cheaper. The flywheel starts with one turn.

See `references/codemap-template.md` for the map's format and seeding rules.

## Step 1 — Classify along 5 axes

Read the request. Scan the relevant code (file names, the touched area, similar prior
changes, tests, conventions). Then place the request on five **orthogonal** axes.
They are independent — a request has a value on each, not one single label. (This is
why "improvement" or "mejora" isn't a category: it decomposes across these axes.)

| Axis | Values | What it decides |
|------|--------|-----------------|
| **1. Type** | `feat` · `fix` · `refactor` · `perf` · `docs` · `test` · `chore` · `spike` | What kind of change it is. Maps to Conventional Commits. Add a `breaking` flag if it breaks a public contract. |
| **2. Size** | trivial · small · medium · large | Rough effort. Drives how much process. |
| **3. Risk** | low · med · high | Blast radius. HIGH if it touches: data model / migrations, external contracts or public APIs, auth / security, money, concurrency, or any irreversible operation. |
| **4. Uncertainty** | known · unknown | Is the *how* clear? `unknown` ⇒ a short exploration comes first. |
| **5. Surface** | list of files / modules / packages | Where the change lands. Feeds the spec's scope and which coding standards apply. |

Infer every axis. For each one you couldn't read directly off the request, record a
one-line assumption (e.g. *"Assuming this is a `feat`, not a `fix` — there's no
existing login flow to repair"*). The Prime Directive applies: assume, don't ask.

**Disambiguating fuzzy words** (do this silently, in your head):
- "mejora" / "improve" → does a NEW capability appear? → `feat`. Same behavior, cleaner
  code? → `refactor`. Faster/lighter? → `perf`.
- "optimiza" / "optimize" → almost always `perf` (no behavior change). If it adds
  caching that changes observable results, flag `breaking`.
- "arregla" / "fix" → `fix` only if current behavior is wrong. "Fix it so it also does
  X" is a `feat`.

## Step 2 — Route to a tier (the anti-friction lever)

Ceremony must be **proportional** to the change. The intake (Steps 1–3) is cheap and
always runs. Everything downstream scales by tier. Pick the tier from the axes:

| Tier | Trigger | What runs |
|------|---------|-----------|
| **0 — Express** | trivial · `chore`/`docs`/`style`/tiny `fix` · low risk | No artifacts. State the one-line classification, make the change, verify it. |
| **1 — Light** | small `feat`/`fix` · low risk · known | A **thin brief** (goal + acceptance criteria) → implement → verify. No proposal, no design doc. |
| **2 — Standard** | medium · OR risk ≥ med · OR `refactor`/`perf` with observable impact | **Full brief + spec** (Given/When/Then) → implement → verify. Add a short design note if there's a real architectural choice. |
| **3 — Full** | large · OR high risk · OR `breaking` · OR `unknown` | **Explore first**, then brief + spec + design + task breakdown → implement → verify → record the decision (ADR if the project uses them). |

The matrix is a floor, not a cage. If your gut says a "small" change is actually
dangerous, bump the tier and say why in one line. Quality judgment overrides the table.

**Escalation override:** any HIGH risk forces at least Tier 2, regardless of size.
A one-line change to an auth check is small but not Express.

## Step 3 — Enrich into a brief, then proceed

Produce a brief at the depth the tier demands, **in the user's language**. The brief
is dual-audience by construction:

- The **Summary** and **Acceptance criteria** are in plain language a non-developer
  can read and approve.
- The **Technical** section carries the depth an experienced developer wants. A
  non-dev can ignore it; the skill (you) owns it on their behalf.

The **Files & routes to touch** section is the spec's executable core — it's what turns
a PRD into a build order. From Tier 1 up it is REQUIRED, and every path in it must have
been verified against the actual code in Step 0, not merely inferred from the map. A
spec that names concrete files and routes is one anyone can execute without re-deriving
the plan; a spec without them is a wish.

**Brief template** (include only the sections the tier calls for):

```
## <verb-first title>            e.g. "Agregar login con email + contraseña"

**Classification**: feat · small · low risk · known · touches `src/auth/`
**Tier**: 1 — Light

### Goal
<one or two sentences: what the user gets and why it matters>

### Assumptions made (correct me if wrong)
- <inferred thing 1>
- <inferred thing 2>

### Acceptance criteria
- [ ] <observable, testable outcome>
- [ ] <edge case / error state>

### Files & routes to touch        (REQUIRED from Tier 1 up)
- `path/to/file.ts` — <new / modify / delete> — <what changes>
- route `POST /api/...` — <new / changed> — <handler location>
- <"verified against code: yes" — confirms these paths were checked, not just inferred>

### Tests                          (REQUIRED from Tier 1 up)
- `path/to/file.test.ts` — <what it asserts, mapped to an acceptance criterion>
- <every new function/route gets at least one test: happy path + the key error/edge case>
- <Tier 2+: one test per Given/When/Then scenario>
- <if the project measures coverage: note impact — never drops; money/leads/auth routes meet the fixed threshold (ADR-0012)>
- <if no tests apply (docs/chore/style, no executable logic): say so with the reason, one line>

### Pre-mortem                     (Tier 1: Consumidores + Fallas · Tier 2+: all nine rows — see references/premortem-and-review-loop.md)
- **Caminos**: <every entry the data/behavior flows through — alta, reingreso, backfill, histórico, sync, API/MCP/UI, undo — each "covered" or "out: <reason>">
- **Fallas**: <per external dependency: down / slow-timeout / malformed / partial / retry semantics; per operation: fails open or closed>
- **Invariantes**: <3-5 statements that must always hold → the test that breaks each one>
- **Simetrías**: <if the rule applies to read/budget/create, does it apply to write/status/edit/delete?>
- **Reutilización**: <the existing helper that already does this, or "none exists">
- **Consumidores**: <every reader of each field / state / enum value / flag you add or change, found by grep, as `file:line` → "unchanged" or "changes: <how> → scenario">
- **Datos reales**: <the shape the data ALREADY has where it lives — `''` vs `null`, non-strings, historical rows, rows other code wrote; sampled read-only when reachable, else stated as a risk>
- **Variantes**: <every env var / flag / provider / mode that selects this same path — each covered or out>
- **Afirmaciones**: <docs, contracts, README, UI copy, PR text that describe this behavior → updated, and claiming no more than the code does>
- <`n/a — <reason>` is a valid answer per row; omitting a row is not. ~20 lines max.>

### Closing check                  (REQUIRED from Tier 1 up — filled AFTER implementing, see Step 4)
- <each acceptance criterion / scenario → the test that proves it>
- <each pre-mortem row that was not n/a → where the code handles it (`file:line`) and its test>
- <suite + typecheck + lint: green · tests verified both ways (Tier 2+)>
- <anything that did not match → fixed in the brief first, then in code — one line each>

### Out of scope
- <what we are deliberately not doing now>

--- (Tier 2+ adds:) ---

### Technical
<approach, affected files, key decisions, data/contract changes>

### Spec  (Given/When/Then, one per acceptance criterion)
**Scenario: <name>**
- GIVEN <precondition>
- WHEN <action>
- THEN <expected outcome>

--- (Tier 3 adds:) ---

### Exploration findings
<what you learned reading the code, constraints, prior art>

### Design
<architecture decision + rationale; rollback plan for risky changes>

### Tasks
1. <small, sequenced, each completable in one sitting>
```

After writing the brief, **do not wait for permission on low tiers**. For Tier 0–1,
state the classification and the assumptions and **proceed to implement**, telling the
user they can stop you if an assumption is wrong. For Tier 2–3, present the brief and
proceed unless you hit the narrow "must-ask" bar from the Prime Directive — and if you
do ask, batch it into one round, then go.

This is the whole point: the user experiences **forward motion with visible reasoning**,
not an interview.

## Step 3.5 — (opcional, Tier 2–3) Emitir `tasks.json` para orquestación

Si el cambio se va a **orquestar por modelo** (repartir las tareas a Opus/Sonnet/Haiku
según complejidad vía la skill `model-orchestrator`), emite además del brief una versión
machine-readable de la sección `### Tasks`, para que el orquestador no tenga que parsear
prosa. Es **aditivo y opcional**: no cambia el brief ni el flujo; solo escribe un archivo
extra cuando hay descomposición en tareas (Tier 2–3).

Escríbelo junto al brief: `docs/specs/<change>.tasks.json` (o en el scratchpad si el brief
es inline), conforme al contrato
`~/.claude/skills/model-orchestrator/references/tasks-input.schema.json`:

```json
{
  "change": "<kebab>", "spec_flow_tier": 2,
  "tasks": [
    { "id": 1, "title": "<tarea>", "kind": "decision|feat|fix|refactor|perf|test|docs|chore|spike|...",
      "size": "small|medium|large",
      "signals": { "type": "feat", "tier": 2, "risk": "med", "breaking": false },
      "depends_on": [] }
  ]
}
```

Reglas para llenarlo (lo infieres del brief que ya escribiste, sin preguntar):
- **`kind`** por tarea = su naturaleza (una "decisión de arquitectura" es `decision`,
  "implementar endpoint" es `feat`, "actualizar README" es `docs`). El orquestador rutea
  por `kind`, así que es el campo que más importa.
- **`signals`** = las señales globales del brief (`type`/`tier`/`risk`/`breaking` de la
  línea Classification); una tarea las hereda salvo que su naturaleza difiera.
- **`size`** = tamaño aproximado de esa tarea (no del cambio global).
- **`depends_on`** = el orden natural de tu sección Tasks (tarea 2 suele depender de la 1).

No dispares el orquestador tú: solo dejas el `tasks.json` listo. El usuario decide
orquestar. Si no se pide orquestación, omite este paso.

## Step 3.6 — Design gate: review the spec before the first Edit (Tier 2–3)

A code review asks a diff the questions the spec should have answered — which paths call
this, who reads what changed, what invariant did the deleted line enforce, what happens
when the dependency is down. Measured across 73 reviewed sessions, **most findings answer
questions the spec never asked**, and fixing them inside a review loop is what made it run
to 14–18 passes. Since 0.7 there is no default review behind you (Step 4), so this gate
is where those questions get asked — while a gap costs one line instead of a pass.

- **Tier 1**: no gate — but the two Tier 1 rows (Consumidores, Fallas) are answered with
  a real grep, not from memory.
- **Tier 2**: walk the checklist in `references/premortem-and-review-loop.md` against your
  own brief. Every gap you find becomes a Given/When/Then scenario or an invariant with
  its test — added to the brief *before* you touch code.
- **Tier 3**: propose delegating the gate to `planner-deep` (Tier 3's read-only planner,
  Opus): give it the brief, the code map, the files in the surface and the checklist, and
  ask it to **open its plan with a "Gaps in the spec" section** — one line per checklist
  item that the brief does not answer. That section is what you count; the rest of its
  plan is a bonus, not the deliverable. Delegation stays opt-in (ADR-0030) — if the user
  declines, do the Tier 2 walk.

Record the result as `spec_review: {gaps_found, gaps_adopted}` in the spec event. A gap
you saw and chose not to adopt needs its one-line reason in the brief, same rule as a
review finding. Zero gaps found on a Tier 3 change is a signal the gate was skimmed, not a
signal the spec was perfect.

## Step 4 — Implement and verify

Hand the work to the project's normal development flow. Honor whatever standards the
project already has — if there's a TDD / testing convention, an `AGENTS.md`/`CLAUDE.md`,
or coding skills for the stack, follow them. The spec's acceptance criteria become the
tests; Given/When/Then scenarios map directly to test cases. Verify against every
acceptance criterion before calling it done.

For Tier 2–3, if the project records decisions (ADRs, a CHANGELOG, a devlog), offer to
capture the decision once the change lands — don't force it.

### Definition of Done (by tier)

The DoD scales with the tier — this is not bureaucracy bolted on top, it's the same
proportionality principle from Step 2 applied to the finish line, not just the start.

- **Tier 0**: no test ceremony. This preserves Tier 0's "no artifacts" promise — a
  sanity check that the change does what it says is enough.
- **Tier 1+**: every piece of NEW code (routes and functions) ships with a test that
  exercises its behavior, including the obvious error/edge case. "Done" is not "it
  compiles and runs" — it's "it runs, and a test proves it."
- **Tier 2+**: each Given/When/Then scenario in the spec maps 1:1 to a test case. If a
  scenario has no corresponding test, the spec isn't actually verified yet.
- **Tier 2+, verified both ways**: a test that protects an invariant or a guard counts only
  once you have watched it **fail with the fix reverted** (or the guard deleted) and pass
  with it restored. One-step manual mutation, a minute of work — and the thing that ended
  the two longest review chains on record, where suites of 800+ tests stayed green through
  five rounds of the same bug because the fakes never exercised the guard.
- **Fakes carry a contract**: a fake that ignores its arguments (an `eq()` that returns the
  same rows whatever it is asked) does not test a filter or a security guard. If the real
  dependency selects, the fake must select.
- **Where the project measures coverage**: it never drops. On projects using
  devground's vitest standard, `test:coverage` stays green — critical paths (money,
  leads, auth — ADR-0012) meet the fixed threshold, and the global floor only moves up
  (ADR-0025).
- **Sensible exception**: docs/chore/style/config changes with no executable logic
  don't require new tests — but say so in one line when you skip (this maps to the
  `tests:"n/a"` telemetry value in Step 6). NEVER skip this on money/leads/auth logic —
  that's where the exception stops applying.

### The spec moves first (Tier 1+)

When implementing turns up something the brief did not foresee — a second entry path, a
consumer that reads the field you changed, a dependency that can answer malformed —
**stop, add one line to the brief, then code it.** Never patch silently. Measured on 88
changes under 0.6, 55 had review findings *caused by fixes made outside the spec*; the
defect class is "code that grew without the invariant it needed", and the brief is where
that invariant gets written.

### Closing check (Tier 1+) — the gate, run in the main loop

Done is proven against the spec, not discovered by a reviewer. Fill the brief's
`### Closing check`:

1. Every acceptance criterion and Given/When/Then scenario → the test that proves it.
2. Every pre-mortem row that was not `n/a` → where the code handles it (`file:line`) and
   the test that covers it. A row with no code and no test is a gap: close it now.
3. Re-run the **Consumidores** grep against the final diff — new readers appear while you
   code. Each one is "unchanged" or has its scenario.
4. Full test suite, typecheck and lint green; Tier 2+ invariant tests verified both ways.

This runs in the main loop with no subagents. It costs minutes; it replaces a review whose
loop cost hundreds of dollars per change and still closed with open debt in 65 of 88
changes.

### Review is opt-in (ADR-0039)

spec-flow **does not run `/code-review` or deepcheck by default**, at any tier. Measured
from 2026-09-01: review and verifier subagents were ~43% of all token spend, and under
0.6 half the reviewed changes still hit the 3-pass limit. The investment moves to the
spec (pre-mortem, design gate, closing check).

- It runs **only when the user asks**.
- On **Tier 3 with high risk** (auth/security, money, irreversible migration, external
  contract) **propose it in one line** after the closing check — the user decides; no
  answer means no review.
- When it runs: **one pass**, at the level the user picks (default `medium`), on the
  diff. Hand it the brief so it reviews against the spec. Triage every finding: a real
  defect or spec violation is fixed; anything else is refuted or deferred with one line.
  A finding that reveals a gap in the spec goes **back to the brief** (row + scenario),
  then the fix. **No automatic second pass** — another one runs only if the user asks.
- Record the result in the brief as `### Review` (found · fixed · deferred/refuted with
  reasons) and emit the `review` event (Step 6).

If a finding — from a review or from the closing check — reveals that an inferred
assumption was wrong, that's an `assumption_reversed` event (below), not just a fix.

## Step 5 — Update the code map (close the flywheel)

This is what makes Step 0 get cheaper over time instead of rotting. After the change
lands, reconcile `docs/codemap.md` with reality:

- **New** subsystem, module, or route created → add a row.
- **Moved or renamed** paths → fix the entry.
- **Removed** code → delete the entry.
- A responsibility you discovered the map got wrong → correct it.

The map stays fresh precisely because the same flow that *reads* it also *maintains* it —
it's touched on every change, so it can't drift far. Keep entries terse: a path and a
one-line responsibility, not a tutorial. The map is an index of WHERE, not a manual of
HOW (that's what code and ADRs are for).

If the project had no map and this was a Tier 1+ change, offer to seed
`docs/codemap.md` now from what you learned — seeding the subsystems you touched is
enough; it doesn't have to be exhaustive on day one. Don't seed for Tier 0 trivia.

This step is cheap (a few lines) and the payoff compounds: every future request starts
from a better index. Skipping it is borrowing against your future self.

## Step 6 — Emit telemetry (Tier 1+, two-sided)

This is what lets us MEASURE whether spec-flow actually helps (see
`references/measurement-design.md`). It measures **both** failure modes — friction AND
wrong inference — not just one.

**Tier 0 emits nothing.** A trivial typo is too small to carry signal, and forcing an event
would break Tier 0's "no artifacts" promise (its whole point is zero ceremony). Telemetry
runs **from Tier 1 up.** A qualifying run appends a `spec` event to
`<repo-root>/.spec-flow/events.jsonl` when the change closes, and — **only if a review
actually ran** (opt-in since 0.7) — a `review` event when it closes. It's append-only
JSONL — no read-modify-write, no race, **never rewrite a line**; just add one.

The `spec` event is written **after the closing check** (end of Step 4), when `tests` is
known, and **committed with the change** — that's the direct event↔commit link the
metrics tool relies on. When a review was requested, its outcome is known later and lands
in another commit, which is why it is a separate line. The `review` event is
written at the end of Step 4 and committed with the last fix commit (a commit that only
adds `review`/`assumption_reversed` lines is a *follow-up* of the change, and dev-metrics
counts it as neither a spec-flow commit nor a control one); dev-metrics joins the two by
`change`. From 0.7 on, a `spec` event with no `review` event is the normal case — no review was
requested. Never write a `review` event for a review that did not run.

### The spec event (one per run, Tier 1+, after the closing check)

```jsonc
{"event":"spec","ts":"<ISO-8601 with tz>","date":"<YYYY-MM-DD>","change":"<kebab-name>",
 "tier":1,"type":"feat|fix|refactor|perf|docs|test|chore|spike","size":"trivial|small|medium|large",
 "risk":"low|med|high","uncertainty":"known|unknown","files":["path",...],
 "assumptions":2,"questions_asked":0,"brief":"inline|docs/specs/<name>.md","codemap_used":true,
 "premortem":{"na":1}|false|"n/a",
 "spec_review":{"gaps_found":3,"gaps_adopted":2}|"n/a",
 "tests":"verified|added|updated|n/a|deferred",
 "spec_flow_version":"0.7"}
```

`premortem` from Tier 2 up is `{"na": <rows answered n/a, 0–5>}` when the section was
written and `false` when it was skipped; `"n/a"` on Tier 1. **`na` counts only the five
original rows** (Caminos, Fallas, Invariantes, Simetrías, Reutilización) — the four rows
added in 0.7 are not counted, so `na` keeps the meaning dev-metrics' arms are built on. The `na` count is what makes
a pre-mortem filled to comply (`{"na":5}` on a change with several data paths) visible in
the data instead of indistinguishable from a real one. `spec_review` is Step 3.6's result;
`"n/a"` on Tier 1. (Pick one value per field when you write the line — `a|b` is notation
here, not JSON; a line that doesn't parse is silently dropped.)

### The review event (only when a requested review ran)

```jsonc
{"event":"review","ts":"<ISO-8601 with tz>","date":"<YYYY-MM-DD>","change":"<same kebab-name>",
 "level":"medium|high|max|deepcheck","passes":2,
 "findings":10,"findings_capped":true,"found_total":13,
 "induced":0,"resolved":11,"open":2,"redesigned":false,
 "tests":"verified|added|updated|n/a|deferred",
 "spec_flow_version":"0.7"}
```

**`findings` is the first pass only** — the one number comparable across changes;
`findings_capped` says pass 1 hit the reviewer's cap (so `findings` is a floor, not a
count). `found_total` is every finding across all passes; `resolved` those fixed;
**`open` is the debt** — deferred or still unresolved at close, each with its reason in
the ledger. `passes` is how many completed (dead passes don't count); `induced` counts
pass ≥2 findings the earlier fixes caused; `redesigned` says the stop rule fired.
`level:"n/a"` and the bare string `"n/a"` both mean no review applied (Tier 0, or a change
with no executable logic) — write one of them rather than zeros.

Together these answer what ADR-0036 asked and could not yet read: **are the changes
getting cleaner** — first-pass findings of 0.6 changes with a pre-mortem, against the 0.5
baseline (whose `findings` counted all passes and never knew about the cap, so the
comparison is labelled, not silent) — and **is the loop bounded** — median passes ≤ 2.
Capped values are floors and are reported apart, never averaged with exact counts.

`tests` records DoD compliance, not a count. It goes on the `spec` event; a `review`
event repeats it only if the review's fixes changed it. `"verified"` = added/updated *and* watched
fail with the fix reverted — **the only value that means the DoD was met from Tier 2
up**; there, `"added"`/`"updated"` mean tests exist but were never watched to fail. On
Tier 1 `"added"`/`"updated"` are compliant. `"deferred"` means new logic shipped without
a test — an honest counter-weight, meant to be read alongside the other gauges rather
than hidden; `"n/a"` means docs/chore/no executable logic.

Read `questions_asked` and `assumptions` **together** — never `questions_asked` alone.
Zero questions on a change that made ten high-risk assumptions is not a triumph; it's
exposure waiting to be confirmed (or refuted) by the reversal events below. `assumptions`
counts the inferred-and-stated lines in the brief. `codemap_used` records whether Step 0
read an existing map.

### The reversal event (the quality counter-signal)

The friction gauge is one-sided: on its own it rewards not-asking, which would push you to
infer recklessly (classic Goodhart — the metric becomes the target). The reversal event is
the structural counterweight. **When an inferred assumption later turns out wrong** — the
user corrects it, or rework proves it — append a second line tied to the same `change`:

```jsonc
{"event":"assumption_reversed","ts":"<ISO-8601 with tz>","date":"<YYYY-MM-DD>",
 "change":"<same kebab-name as the spec event>","task_id":2,
 "assumption":"<the inferred thing that was wrong>",
 "cost":"trivial|rework|redesign","spec_flow_version":"0.7"}
```

This is what makes "asked 0 questions, built the wrong thing" register as the failure it is,
instead of scoring identical to a clean run. A run is genuinely good only when BOTH gauges
are healthy: low friction AND few/no reversals. Emit the reversal honestly even when it was
your own inference that missed — a counter-metric that only records other people's mistakes
is worthless.

`task_id` is **optional** and only applies when the change went through `model-orchestrator`
(Tier 2-3 with a `tasks.json`). It's the id of the task whose inference was reversed. Set it
so the reversal can be joined to that task's routing decision in the orchestrator's
`decisions.jsonl` (both logs key on `change`; `task_id` pins the exact task). That join is
what lets dev-metrics answer "does downscaling a task to a cheaper model raise its reversal
rate?" — the orchestrator's core risk, otherwise unmeasured. Omit `task_id` when there was
no orchestration or the reversal isn't tied to a single task.

### Backward compatibility & setup

Older events have no `event` field; readers (dev-metrics) treat a missing `event` as
`"spec"`, and 0.5 lines that carried `review` and `tests` inline on the spec event still
parse — they are the baseline the 0.6 numbers are compared against. If `.spec-flow/`
doesn't exist, create it — `events.jsonl` is fine to version
(benign labels: name, tier, paths — NOT transcript content). Do NOT gitignore it; its value
is in being committed with the change.

Don't invent token counts or timings here — those are derived later from git + transcripts
by dev-metrics; these events carry only the *labels* dev-metrics can't otherwise know. Keep
it dead simple: one line per event, then move on.

## Persistence (keep it light)

By default, present the brief **inline** in the conversation. Only write a file when it
earns its keep:

- Tier 0–1: the **brief** stays in the conversation — nothing on disk.
- Tier 2–3: offer to save the brief to `docs/specs/<change-name>.md` (or wherever the
  project keeps specs). Match the project's existing convention if it has one; don't
  invent a parallel structure.

The **code map is the exception** — it is a standing index, not a per-change artifact.
It gets written/updated per Step 5 whenever the change altered the project's structure,
regardless of tier (a Tier 1 feature that adds a new module earns a map row). The brief
is ephemeral; the map is durable. Don't conflate them.

Never create scaffolding the project didn't ask for. A spec that lives only in the chat
is a perfectly good spec for small work.

## Anti-patterns (the things that killed the last tool)

- ❌ Asking the user a question you could answer by reading one file.
- ❌ Drip-feeding questions across multiple turns.
- ❌ The mirror image: inferring confidently past the must-ask bar on a high-risk,
  irreversible unknown — "asked zero questions" is not a win if you built the wrong thing.
  Optimizing `questions_asked` toward 0 at the expense of acertar is Goodhart, not skill.
- ❌ Running Tier 3 ceremony on a Tier 0 typo.
- ❌ A wall of process before any code appears.
- ❌ Treating the 5 axes as one dropdown ("is this a feature OR a refactor?") — they're
  independent; fill them all.
- ❌ Burying a non-dev in jargon, or boring a senior dev with over-explanation. Let the
  brief's structure serve both at once.
- ❌ Declaring done on a Tier 1+ change with new logic and no test — "it compiles and
  runs" is not done.
- ❌ Running `/code-review` or deepcheck on your own as a closing ritual — review is
  opt-in (ADR-0039); the closing check is the gate.
- ❌ Fixing review findings one at a time and re-running the review to "see what's left"
  — the cap hides the rest, and each in-place fix is the next pass's finding.
- ❌ Coding something the brief does not mention without writing it in the brief first.
- ❌ A pre-mortem of mostly `n/a` on a change that touches a data path with more than one
  entry or an external dependency, or a **Consumidores** row written without a grep — that's the section filled to comply, and the design
  gate should catch it.
- ❌ Calling a test "verified" that nobody has watched fail.

## Worked example (internal reference)

See `references/examples.md` for three end-to-end walk-throughs (a typo → Tier 0, a
small feature → Tier 1, a risky migration → Tier 3) showing the classification, the
routing decision, and the brief produced — including how each one avoids asking the
user anything it could infer. `references/premortem-and-review-loop.md` carries the
pre-mortem checklist (each row mapped to the reviewer angle it anticipates), the closing
check, the opt-in review protocol, and real cases where the review found exactly what the
pre-mortem would have listed.
