# Pre-mortem, closing check and opt-in review (spec-flow 0.7, ADR-0037 → ADR-0039)

One purpose: get the change right from the spec, so no review loop is needed to find what
the spec forgot. The pre-mortem moves the reviewer's questions to spec time; the closing
check proves the code against the spec; the review is opt-in and bounded to one pass.

## Why this exists (the measurement)

Across 73 sessions that ran `/code-review` (171 invocations):

- 44% re-ran the review two or more times; 15 sessions ran it three or more; the two
  longest ran 18 and 14 passes. 68 of the 73 had gone through spec-flow first.
- In the 18-pass session, 10 of the 16 completed passes reported findings *caused by the
  previous pass's fixes*. One helper introduced in pass 12 — to close a race, with no
  invariant written down — showed up in every one of the next four reviews.
- In the 14-pass session the same bug came back for three to five rounds because each fix
  enumerated instances; what closed it was a **redesign** in round 8 that removed the class.
- Of 66 structured findings, 42 were `correctness`, and almost all fell into five families
  the brief had no section for. Those families are the five rows below.
- The reviewer caps its output (15; 10 via ReportFindings). Telemetry showed a block of
  changes reporting exactly 10: not convergence — censoring. Fix ten, re-run, see the next ten.

Then 0.6 (pre-mortem + a bounded loop) ran on 88 reviewed changes from 2026-09-15:

- 50 of 88 hit the 3-pass limit; 55 had **induced** findings (caused by the review's own
  fixes); 65 closed with open debt — 293 items in total. Pass 1 still averaged 7.7
  findings, even though the design gate had found 361 gaps at spec time.
- From 2026-09-01, review and verifier subagents were ~43% of all token spend.
- The findings that kept appearing fell into four families the five rows did not ask:
  **who reads what changed** (an email that now renders an "ad" link, a cadence graph
  that does not know a new state, a report that keeps showing a provider no longer
  polled); **the shape real data already has** (`''` vs `null` in production rows);
  **config variants** (two env vars selecting the same path); and **claims** (docs or PR
  text promising more than the code does, contracts left stale). Those are rows 6–9.

So 0.7 stops paying for the loop and puts the effort where the defects are born.

## The nine rows

Each row is the spec-time form of a question the reviewer will ask the diff later. Answer
it before code exists, when a gap costs one line.

| Row | Ask yourself | Reviewer angle it anticipates | Real findings it would have pre-empted |
| --- | --- | --- | --- |
| **Caminos** (paths) | Through how many entries does this data or behavior flow? Create, re-entry of an existing record, backfill, historical rows, sync to another system, API vs MCP vs UI, undo. For each: covered, or out with a reason. | C cross-file tracer · B removed-behavior | "re-entry never writes the ad level"; "the 757 historical leads never re-drain to the CRM"; "the status path never got the treatment the budget path got" |
| **Fallas** (failure modes) | For each external dependency: down, slow/timeout, malformed answer (a 200 that isn't JSON), partial success, retry semantics. For each operation: does it fail open or fail closed — and is that the right side? | A line-by-line · D language pitfalls · E wrappers | JWKS endpoint down → cascade of 500s; connection pool exhausted while holding the lock; a Meta 400 on campaign-level fields aborted every non-adset pause |
| **Invariantes** (invariants) | The 3–5 sentences that must always be true. Each one names the test that breaks when it is violated. | B removed-behavior · altitude | `previous_state` captured outside the lock → undo re-activates what someone else paused; two clocks compared (app `now()` vs DB `clock_timestamp()`); "one audit row per attempt" broken on one of three rejection paths |
| **Simetrías** (symmetries) | If the rule applies to read / budget / create, does it apply the same way to write / status / edit / delete? Twin operations drift apart when only one is in the request. | C · gap sweep | reads hardened to fail-closed while writes stayed fail-open (found three separate times) |
| **Reutilización** (reuse) | Which existing helper already does this? Name it, or say none exists. | reuse · simplification | a hand-rolled JWKS cache re-implementing `PyJWKClient`; an existing backfill script duplicated instead of extended |
| **Consumidores** (consumers) | For every field, state, enum value or flag you add or change: grep its readers. For each `file:line`, does its behavior change? Unchanged, or a scenario. | C cross-file tracer · B removed-behavior | populating `ad_id` made the assignment email render an Ad Library link for GHL leads; a new `buzon` outcome silently broke a cadence graph matched on exact conditions; `saldos()` kept showing the last balance of a provider no longer polled |
| **Datos reales** (real data) | What shape does the data **already** have where it lives — empty strings vs `null`, non-strings, historical rows, rows another writer produced? Sample it read-only when you can; otherwise write the assumption as a risk. | D language pitfalls · gap sweep | production GHL leads carrying `utm_content: ''` reached the CRM mixed with `null`; a non-string UTM raised a `ValidationError` swallowed as `no_contact` |
| **Variantes** (variants) | Which env vars, flags, providers or modes select this same path? Each one covered or out. | C · gap sweep | a gate keyed on `TELEFONIA_PROVEEDOR` while the own-telephony bridge reached Telnyx through a separate `TELEFONIA=telnyx` |
| **Afirmaciones** (claims) | Which docs, contracts, README, UI copy or PR text describe this behavior? Update them, and claim no more than the code does. | conventions · altitude | "the CRM receives them on every delivery" + "757 back-filled" when the drain sends each lead once; the Atlas→CRM contract still listing two keys after six were added |

Format in the brief: one bullet per row, ~20 lines total. **Tier 1** answers only
Consumidores and Fallas (3–4 lines, with a real grep); Tier 2+ answers all nine.
`n/a — <reason>` is a valid answer per row; omitting a row is not. Telemetry's
`premortem.na` counts only the first five rows, so it stays comparable with 0.6. A change that touches a multi-entry data path or an external
service almost never gets five `n/a` honestly — that pattern is what the design gate
(Step 3.6) is there to catch.

## Design gate checklist (Step 3.6)

Run against the brief, before the first Edit. Tier 2: yourself. Tier 3: propose
`planner-deep`, asking it to open its plan with a "Gaps in the spec" section (one line per
item below the brief does not answer) — that section is the deliverable you count.

1. Does every path in **Caminos** have either a scenario or an "out: reason"?
2. Does every dependency in **Fallas** have a stated behavior for down / slow-timeout /
   malformed / partial, and a retry rule? Does every mutating operation say which way it
   fails?
3. Does every **Invariante** name a test — and would that test actually fail if the
   invariant broke, or would a fake swallow it?
4. For every operation in the request, is its twin (the other side of the **Simetría**)
   either covered or explicitly untouched?
5. Did **Reutilización** actually grep, or did it guess "none exists"?
6. Are any of the brief's assumptions the *nice shape* of external data (a string that is
   always a string, a page that always fits, an error message that always contains the
   word "timeout")? Those were the most common `assumption_reversed` on record.
7. Was **Consumidores** produced by a grep for every changed field/state/flag — and does
   each reader whose behavior changes have a scenario?
8. Does **Datos reales** describe the data as it is today (sampled, or stated as a risk),
   not as the new code will write it?
9. Is every **Variante** that reaches this path listed?
10. Is every **Afirmación** — doc, contract, copy — on the files-to-touch list?

Every gap adopted becomes a Given/When/Then scenario or an invariant with its test.
Record `spec_review: {gaps_found, gaps_adopted}`; a gap seen and not adopted carries its
one-line reason in the brief.

## Closing check (Step 4, Tier 1+)

Runs in the main loop, no subagents, after the tests are green. It is the gate that
replaced the default review.

```
tests green
  → each acceptance criterion / scenario      → the test that proves it
  → each pre-mortem row that is not n/a       → file:line that handles it + its test
  → Consumidores grep re-run on the final diff → new readers: unchanged or scenario
  → full suite + typecheck + lint green; Tier 2+ invariant tests verified both ways
  → anything missing: one line in the brief first, then the code
```

The rule underneath: **the spec moves first.** Anything the implementation discovers that
the brief did not say — a path, a reader, a malformed answer — is written into the brief
before it is coded. Induced findings were code that grew without its invariant; writing
the line first is what keeps the invariant.

## Opt-in review (ADR-0039)

No review runs by default. It runs when the user asks, or when the change is Tier 3 with
high risk (auth/security, money, irreversible migration, external contract) and the user
accepts a one-line proposal made after the closing check.

When it runs:

1. **One pass**, on the diff, at the level the user picks (default `medium`). Give the
   reviewer the brief — `/code-review` is a fork that inherits the conversation, so it
   already has it; deepcheck or a fresh session gets it pasted into its prompt — and ask
   it to review against the spec.
2. Read the whole list and **group by root cause**. A list that hits the cap (15, or 10
   via ReportFindings) is a sample: mark `findings_capped`.
3. Triage every item, one reason each: **fixed** (real defect or spec violation, with its
   test verified both ways), **deferred**, or **refuted**.
4. A finding that shows the spec had a gap goes **back to the brief first** — the row and
   the scenario — then the fix. Never fix it in place without the line.
5. **No automatic second pass.** If the user wants another, it reviews only the fix diff
   plus its callers, with the ledger of deferred/refuted items handed over so they are not
   re-flagged.
6. Record `### Review` in the brief and emit the `review` event. A pass killed by a
   watchdog or rate limit produced no verdict: it is not a pass.

**Induced** (for the `induced` field): a finding in a later pass for a defect that did
not exist before the earlier fixes — decided by reading the pre-fix lines (`git show
<pre-fix-commit>:<file>`), not by whether the line sits inside a fix hunk.

## Tests verified both ways

A test protecting an invariant or a guard is *verified* only after you have seen it fail
with the fix reverted (or the guard deleted) and pass with it restored. It is one-step
manual mutation and it costs a minute. On record: a suite of 800+ tests stayed green for
five rounds of the same bug because the query-builder fake implemented `eq()` ignoring its
arguments — deleting the security filter changed nothing. The same rule caught, in another
session, that a "fix" had never applied because the replace did not match.

Fakes carry a contract: if the real dependency selects, filters or rejects, the fake must
do the same for the inputs the test cares about.

## Worked case: ad-level attribution for GHL leads (atlas, 2026-09)

Request: *store the Meta ad level (campaign / adset / ad) of leads arriving through GHL so
each lead can be attributed to its ad.* Classified Tier 2 · feat · medium · risk med.

The brief covered the happy path: parse `utm_*` from the webhook, persist new columns,
expose them. The review then returned ten findings — three times, identically, because the
list was capped. Every one of them is a row above:

| Finding | Row it belongs to |
| --- | --- |
| Re-entry of an existing lead never writes the ad level | Caminos — re-entry |
| The 757 historical leads never re-drain to the CRM | Caminos — historical / sync |
| Backfill SQL diverges from `_first_attribution` | Invariantes — parity test |
| Column-wise coalesce can merge two different attributions | Invariantes |
| `utmContent` non-string crashes the lead as `no_contact` | Fallas — malformed input |
| `utm_content` `''` reaches the CRM mixed with `null` | Fallas — shape at the boundary |
| Email template links Ad Library for GHL leads without a gate | Caminos — templates |
| Contract Atlas→CRM does not document the six new keys | Caminos — sync contract |
| `--apply` scans `lead_raw_events` twice without an index | (efficiency) |
| `backfill_ghl_attribution.py` left without the new fields | Reutilización — extend, don't fork |

A pre-mortem written before the first Edit would have listed create / re-entry / backfill /
historical / CRM sync / templates under Caminos, the two malformed shapes under Fallas, and
"first attribution is never overwritten → re-entry test" and "backfill == `_first_attribution`
→ parity test" under Invariantes. Ten findings become ten scenarios, at the cost of fifteen
lines — and one review pass instead of three.
