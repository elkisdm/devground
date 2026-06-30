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
  version: "0.3"
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

## Step 4 — Implement and verify

Hand the work to the project's normal development flow. Honor whatever standards the
project already has — if there's a TDD / testing convention, an `AGENTS.md`/`CLAUDE.md`,
or coding skills for the stack, follow them. The spec's acceptance criteria become the
tests; Given/When/Then scenarios map directly to test cases. Verify against every
acceptance criterion before calling it done.

For Tier 2–3, if the project records decisions (ADRs, a CHANGELOG, a devlog), offer to
capture the decision once the change lands — don't force it.

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
runs **from Tier 1 up.** Each qualifying run appends ONE line to
`<repo-root>/.spec-flow/events.jsonl`. It's append-only JSONL — no read-modify-write, no
race; just add a line.

Emit it once the classification and the files are settled (after the brief). The line is
**versioned and gets committed alongside the change** — deliberate: it gives the metrics
tool a *direct* event↔commit link (the same commit touches `events.jsonl` and the code),
instead of guessing by timestamp.

### The spec event (one per run, Tier 1+)

```jsonc
{"event":"spec","ts":"<ISO-8601 with tz>","date":"<YYYY-MM-DD>","change":"<kebab-name>",
 "tier":1,"type":"feat|fix|refactor|perf|docs|test|chore|spike","size":"trivial|small|medium|large",
 "risk":"low|med|high","uncertainty":"known|unknown","files":["path",...],
 "assumptions":2,"questions_asked":0,"brief":"inline|docs/specs/<name>.md","codemap_used":true,
 "spec_flow_version":"0.3"}
```

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
 "cost":"trivial|rework|redesign","spec_flow_version":"0.3"}
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
`"spec"`. If `.spec-flow/` doesn't exist, create it — `events.jsonl` is fine to version
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

## Worked example (internal reference)

See `references/examples.md` for three end-to-end walk-throughs (a typo → Tier 0, a
small feature → Tier 1, a risky migration → Tier 3) showing the classification, the
routing decision, and the brief produced — including how each one avoids asking the
user anything it could infer.
