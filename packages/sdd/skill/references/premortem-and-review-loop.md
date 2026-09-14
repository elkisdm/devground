# Pre-mortem and the review loop (spec-flow 0.6, ADR-0037)

Two mechanisms, one purpose: reach in one or two review passes the state that used to
take many. The pre-mortem moves the reviewer's questions to spec time; the loop protocol
turns the review from an open loop into a bounded gate.

## Why this exists (the measurement)

Across 73 sessions that ran `/code-review` (171 invocations):

- 44% re-ran the review two or more times; 15 sessions ran it three or more; the two
  longest ran 18 and 14 passes. 68 of the 73 had gone through spec-flow first.
- In the 18-pass session, 10 of the 16 completed passes reported findings _caused by the
  previous pass's fixes_. One helper introduced in pass 12 — to close a race, with no
  invariant written down — showed up in every one of the next four reviews.
- In the 14-pass session the same bug came back for three to five rounds because each fix
  enumerated instances; what closed it was a **redesign** in round 8 that removed the class.
- Of 66 structured findings, 42 were `correctness`, and almost all fell into five families
  the brief had no section for. Those families are the five rows below.
- The reviewer caps its output (15; 10 via ReportFindings). Telemetry showed a block of
  changes reporting exactly 10: not convergence — censoring. Fix ten, re-run, see the next ten.

## The five rows

Each row is the spec-time form of a question the reviewer will ask the diff later. Answer
it before code exists, when a gap costs one line.

| Row                          | Ask yourself                                                                                                                                                                                                          | Reviewer angle it anticipates                     | Real findings it would have pre-empted                                                                                                                                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Caminos** (paths)          | Through how many entries does this data or behavior flow? Create, re-entry of an existing record, backfill, historical rows, sync to another system, API vs MCP vs UI, undo. For each: covered, or out with a reason. | C cross-file tracer · B removed-behavior          | "re-entry never writes the ad level"; "the 757 historical leads never re-drain to the CRM"; "the status path never got the treatment the budget path got"                                                                |
| **Fallas** (failure modes)   | For each external dependency: down, slow/timeout, malformed answer (a 200 that isn't JSON), partial success, retry semantics. For each operation: does it fail open or fail closed — and is that the right side?      | A line-by-line · D language pitfalls · E wrappers | JWKS endpoint down → cascade of 500s; connection pool exhausted while holding the lock; a Meta 400 on campaign-level fields aborted every non-adset pause                                                                |
| **Invariantes** (invariants) | The 3–5 sentences that must always be true. Each one names the test that breaks when it is violated.                                                                                                                  | B removed-behavior · altitude                     | `previous_state` captured outside the lock → undo re-activates what someone else paused; two clocks compared (app `now()` vs DB `clock_timestamp()`); "one audit row per attempt" broken on one of three rejection paths |
| **Simetrías** (symmetries)   | If the rule applies to read / budget / create, does it apply the same way to write / status / edit / delete? Twin operations drift apart when only one is in the request.                                             | C · gap sweep                                     | reads hardened to fail-closed while writes stayed fail-open (found three separate times)                                                                                                                                 |
| **Reutilización** (reuse)    | Which existing helper already does this? Name it, or say none exists.                                                                                                                                                 | reuse · simplification                            | a hand-rolled JWKS cache re-implementing `PyJWKClient`; an existing backfill script duplicated instead of extended                                                                                                       |

Format in the brief: five bullets, ~15 lines total. `n/a — <reason>` is a valid answer per
row; omitting a row is not. A change that touches a multi-entry data path or an external
service almost never gets five `n/a` honestly — that pattern is what the design gate
(Step 3.6) is there to catch.

## Design gate checklist (Step 3.6)

Run against the brief, before the first Edit. Tier 2: yourself. Tier 3: propose `planner`.

1. Does every path in **Caminos** have either a scenario or an "out: reason"?
2. Does every dependency in **Fallas** have a stated behavior for down / malformed / partial?
   Does every mutating operation say which way it fails?
3. Does every **Invariante** name a test — and would that test actually fail if the
   invariant broke, or would a fake swallow it?
4. For every operation in the request, is its twin (the other side of the **Simetría**)
   either covered or explicitly untouched?
5. Did **Reutilización** actually grep, or did it guess "none exists"?
6. Are any of the brief's assumptions the _nice shape_ of external data (a string that is
   always a string, a page that always fits, an error message that always contains the
   word "timeout")? Those were the most common `assumption_reversed` on record.

Every gap adopted becomes a Given/When/Then scenario or an invariant with its test.
Record `spec_review: {gaps_found, gaps_adopted}`; a gap seen and not adopted carries its
one-line reason in the brief.

## The review loop protocol (Step 4)

```
tests green
  → pass 1 (tier level, full diff)
  → read the WHOLE list · group by root cause · fix by class
  → close all: fixed (test verified both ways) | deferred: reason | refuted: reason
  → write the ledger in ### Review · state it in the conversation · commit fixes separately
  → pass 2 (T2: fix diff + callers · T3: full branch), ledger in context
      → no induced findings → close the rest → done (passes: 2)
      → induced findings   → back to the brief: write the missing invariant,
                              redesign that piece → pass 3, the last → done (redesigned: true)
```

**Induced** = a pass-2 finding whose `file:line` falls inside the pass-1 fix diff. It means
the fix was made without the invariant it needed; another in-place fix is the next pass's
finding. The 18-pass session put it in one sentence: _"none of the last five passes found a
problem in the original design — every one found something I introduced fixing the
previous one."_

**Why the ledger works without a file**: `/code-review` runs as a fork that inherits the
conversation. Stating the ledger — what was deferred and why, what was refuted and why,
which commit holds the fixes — before launching pass 2 is enough for the reviewer to see
it. Tell it explicitly not to re-flag those items unless a recorded reason is wrong.

**Why the cap matters**: when pass 1 returns 10 or 15 findings, treat the list as a sample
of a larger population. Grouping by root cause is how you fix the population, not the
sample. Mark `findings_capped: true`.

**Dead passes don't count**: a reviewer killed by a watchdog or a rate limit produced no
verdict. Re-run it; do not log it as a pass or as "zero findings".

## Tests verified both ways

A test protecting an invariant or a guard is _verified_ only after you have seen it fail
with the fix reverted (or the guard deleted) and pass with it restored. It is one-step
manual mutation and it costs a minute. On record: a suite of 800+ tests stayed green for
five rounds of the same bug because the query-builder fake implemented `eq()` ignoring its
arguments — deleting the security filter changed nothing. The same rule caught, in another
session, that a "fix" had never applied because the replace did not match.

Fakes carry a contract: if the real dependency selects, filters or rejects, the fake must
do the same for the inputs the test cares about.

## Worked case: ad-level attribution for GHL leads (atlas, 2026-09)

Request: _store the Meta ad level (campaign / adset / ad) of leads arriving through GHL so
each lead can be attributed to its ad._ Classified Tier 2 · feat · medium · risk med.

The brief covered the happy path: parse `utm_*` from the webhook, persist new columns,
expose them. The review then returned ten findings — three times, identically, because the
list was capped. Every one of them is a row above:

| Finding                                                      | Row it belongs to                  |
| ------------------------------------------------------------ | ---------------------------------- |
| Re-entry of an existing lead never writes the ad level       | Caminos — re-entry                 |
| The 757 historical leads never re-drain to the CRM           | Caminos — historical / sync        |
| Backfill SQL diverges from `_first_attribution`              | Invariantes — parity test          |
| Column-wise coalesce can merge two different attributions    | Invariantes                        |
| `utmContent` non-string crashes the lead as `no_contact`     | Fallas — malformed input           |
| `utm_content` `''` reaches the CRM mixed with `null`         | Fallas — shape at the boundary     |
| Email template links Ad Library for GHL leads without a gate | Caminos — templates                |
| Contract Atlas→CRM does not document the six new keys        | Caminos — sync contract            |
| `--apply` scans `lead_raw_events` twice without an index     | (efficiency)                       |
| `backfill_ghl_attribution.py` left without the new fields    | Reutilización — extend, don't fork |

A pre-mortem written before the first Edit would have listed create / re-entry / backfill /
historical / CRM sync / templates under Caminos, the two malformed shapes under Fallas, and
"first attribution is never overwritten → re-entry test" and "backfill == `_first_attribution`
→ parity test" under Invariantes. Ten findings become ten scenarios, at the cost of fifteen
lines — and one review pass instead of three.
