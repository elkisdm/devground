import { median } from './stats.js';
import { versionAtLeast } from './spec-flow-events.js';
import type {
  SpecFlowEvent,
  SpecFlowReview,
  ReviewEvent,
  ReversalEvent,
} from './spec-flow-events.js';

/**
 * Review-loop aggregation for spec-flow 0.6 telemetry (ADR-0037). Split out of
 * `spec-flow-events.ts` (the parser) because this module implements the data
 * model in "Design › Lectura de la telemetría" — invariants L-1..L-11 — and
 * each invariant has its own test (`spec-flow-review-loop.test.ts`).
 *
 * Unit = the CHANGE (L-1), never the raw event line: `joinChanges` collapses
 * specs by `change` and attaches the applicable review before any stat is
 * computed, so every metric below counts a change at most once.
 */

// ---------------------------------------------------------------------------
// L-6: one ReviewRecord shape for both a `review` event and a spec's inline
// `review` — same normalizer already produced both; this just unifies the type.
// ---------------------------------------------------------------------------

export interface ReviewRecord {
  ts: string;
  level?: string;
  findings?: number;
  findingsCapped?: boolean;
  foundTotal?: number;
  passes?: number;
  induced?: number;
  resolved?: number;
  open?: number;
  redesigned?: boolean;
  tests?: string;
}

/** L-2/L-6: "no aplicó" = `level` absent or the literal `"n/a"`. */
export function isApplicable(record: ReviewRecord | null): record is ReviewRecord {
  return record !== null && record.level !== undefined && record.level !== 'n/a';
}

function fromReviewEvent(r: ReviewEvent): ReviewRecord {
  return {
    ts: r.ts,
    ...(r.level !== undefined ? { level: r.level } : {}),
    ...(r.findings !== undefined ? { findings: r.findings } : {}),
    ...(r.findingsCapped !== undefined ? { findingsCapped: r.findingsCapped } : {}),
    ...(r.foundTotal !== undefined ? { foundTotal: r.foundTotal } : {}),
    ...(r.passes !== undefined ? { passes: r.passes } : {}),
    ...(r.induced !== undefined ? { induced: r.induced } : {}),
    ...(r.resolved !== undefined ? { resolved: r.resolved } : {}),
    ...(r.open !== undefined ? { open: r.open } : {}),
    ...(r.redesigned !== undefined ? { redesigned: r.redesigned } : {}),
    ...(r.tests !== undefined ? { tests: r.tests } : {}),
  };
}

/**
 * L-6/F6: the 0.6 inline contract on a spec event, read as a `ReviewRecord`
 * with the spec's own `ts` — reads the SAME fields `fromReviewEvent` reads
 * (`foundTotal`, `open`, `tests`), so an inline review is not missing data a
 * separate `review` event would have captured.
 */
function fromInline(ts: string, r: SpecFlowReview): ReviewRecord {
  return {
    ts,
    level: r.level,
    ...(r.findings !== undefined ? { findings: r.findings } : {}),
    ...(r.findingsCapped !== undefined ? { findingsCapped: r.findingsCapped } : {}),
    ...(r.passes !== undefined ? { passes: r.passes } : {}),
    ...(r.induced !== undefined ? { induced: r.induced } : {}),
    ...(r.resolved !== undefined ? { resolved: r.resolved } : {}),
    ...(r.redesigned !== undefined ? { redesigned: r.redesigned } : {}),
    ...(r.foundTotal !== undefined ? { foundTotal: r.foundTotal } : {}),
    ...(r.open !== undefined ? { open: r.open } : {}),
    ...(r.tests !== undefined ? { tests: r.tests } : {}),
  };
}

// ---------------------------------------------------------------------------
// L-1: unit = the change
// ---------------------------------------------------------------------------

export interface Change {
  spec: SpecFlowEvent;
  review: ReviewRecord | null;
  /**
   * F4: the max `assumptions` seen across ALL spec lines sharing this
   * `change`, not just the one that won `laterOrLast` — a change's declared
   * assumption count can shrink when the spec is re-emitted, and reversals
   * recorded against the earlier (larger) count must not be divided by the
   * smaller one. `undefined` when no spec line for this change had a valid
   * `assumptions` count.
   */
  maxAssumptions?: number;
}

/** Later `ts` wins; a tie (or an unparseable `ts`) keeps whichever was seen LAST in file order. */
function laterOrLast<T extends { ts: string }>(prev: T, next: T): T {
  const a = Date.parse(prev.ts);
  const b = Date.parse(next.ts);
  const nextWins = Number.isNaN(a) || Number.isNaN(b) ? next.ts >= prev.ts : b >= a;
  return nextWins ? next : prev;
}

/**
 * F8: is `review` eligible to join `spec` (i.e. not clearly BEFORE it)? The
 * parser falls back to `ts = date` (midnight UTC) when a line has no real
 * timestamp — detectable as `ts === date`. Comparing a fallback midnight `ts`
 * against a same-day REAL `ts` (e.g. 09:00) would wrongly read the review as
 * earlier than the spec, orphaning same-day reviews with no `ts`. When either
 * side is a fallback (or either `ts` fails to parse), compare by `date`
 * instead — same-day counts as "applies".
 */
function reviewJoinsSpec(review: ReviewEvent, spec: SpecFlowEvent): boolean {
  const reviewIsFallback = review.ts === review.date;
  const specIsFallback = spec.ts === spec.date;
  const rTime = Date.parse(review.ts);
  const sTime = Date.parse(spec.ts);
  if (!reviewIsFallback && !specIsFallback && !Number.isNaN(rTime) && !Number.isNaN(sTime)) {
    return rTime >= sTime;
  }
  return review.date >= spec.date;
}

/**
 * L-1: collapses specs by `change` (a spec without a non-empty `change` is
 * dropped, never grouped), then attaches each surviving change's review — the
 * latest `review` event with the same `change` and `ts ≥` the spec's `ts`, or
 * the spec's own inline review (L-6), or `null` (the change is open). By
 * construction no count derived from `Change[]` can exceed its length.
 */
export function joinChanges(
  specs: readonly SpecFlowEvent[],
  reviews: readonly ReviewEvent[],
): Change[] {
  const byChange = new Map<string, SpecFlowEvent>();
  const maxAssumptionsByChange = new Map<string, number>();
  for (const s of specs) {
    if (s.change === '') continue;
    const prev = byChange.get(s.change);
    byChange.set(s.change, prev ? laterOrLast(prev, s) : s);
    if (s.assumptions !== undefined) {
      const currentMax = maxAssumptionsByChange.get(s.change);
      if (currentMax === undefined || s.assumptions > currentMax) {
        maxAssumptionsByChange.set(s.change, s.assumptions);
      }
    }
  }

  const reviewsByChange = new Map<string, ReviewEvent[]>();
  for (const r of reviews) {
    const arr = reviewsByChange.get(r.change);
    if (arr) arr.push(r);
    else reviewsByChange.set(r.change, [r]);
  }

  const changes: Change[] = [];
  for (const spec of byChange.values()) {
    const candidates = (reviewsByChange.get(spec.change) ?? []).filter((r) =>
      reviewJoinsSpec(r, spec),
    );
    let review: ReviewRecord | null = null;
    if (candidates.length > 0) {
      review = fromReviewEvent(candidates.reduce((best, r) => laterOrLast(best, r)));
    } else if (spec.review) {
      review = fromInline(spec.ts, spec.review);
    }
    changes.push({ spec, review, maxAssumptions: maxAssumptionsByChange.get(spec.change) });
  }
  return changes;
}

// ---------------------------------------------------------------------------
// shared metric shapes
// ---------------------------------------------------------------------------

export interface RateMetric {
  rate: number;
  n: number;
}

/** A ratio of two summed quantities (e.g. reversals ÷ assumptions), with its own n (L-10). */
export interface SumRatioMetric {
  ratio: number;
  n: number;
}

/** L-3: censura tripartita — every arm reports all three buckets, never just the mean. */
export interface FirstPassArm {
  /** Mean of the EXACT (non-censored) bucket only. `null` when that bucket is empty. */
  meanExact: number | null;
  /** Total changes in the arm (exact + censored + unknown-cap). */
  nTotal: number;
  nExact: number;
  nCensored: number;
  nUnknownCap: number;
  /** `nCensored / (nExact + nCensored)`, `null` when that denominator is 0. */
  cappedShare: number | null;
}

function mean(xs: readonly number[]): number | null {
  return xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length;
}

function rateMetric(items: readonly boolean[]): RateMetric | null {
  return items.length > 0
    ? { rate: items.filter(Boolean).length / items.length, n: items.length }
    : null;
}

function sumRatio(pairs: readonly (readonly [number, number])[]): SumRatioMetric | null {
  if (pairs.length === 0) return null;
  const denominator = pairs.reduce((a, [, d]) => a + d, 0);
  if (denominator === 0) return null;
  const numerator = pairs.reduce((a, [n]) => a + n, 0);
  return { ratio: numerator / denominator, n: pairs.length };
}

/**
 * L-3/F11: builds one arm from its applicable review records. A `record` with
 * `findingsCapped === false` AND a valid `findings` number is exact;
 * `findingsCapped === true` is censored; anything else — including
 * `findingsCapped === false` with no numeric `findings` (e.g. `"pending"`) —
 * is unknown-cap: "not capped" is not the same claim as "we know the exact
 * count". `nTotal > 0` never returns `null`, even when `meanExact` is.
 */
function buildArm(records: readonly ReviewRecord[]): FirstPassArm | null {
  if (records.length === 0) return null;
  const exactValues: number[] = [];
  let nExact = 0;
  let nCensored = 0;
  let nUnknownCap = 0;
  for (const r of records) {
    if (r.findingsCapped === false && r.findings !== undefined) {
      nExact++;
      exactValues.push(r.findings);
    } else if (r.findingsCapped === true) {
      nCensored++;
    } else {
      nUnknownCap++;
    }
  }
  const denom = nExact + nCensored;
  return {
    meanExact: mean(exactValues),
    nTotal: records.length,
    nExact,
    nCensored,
    nUnknownCap,
    cappedShare: denom > 0 ? nCensored / denom : null,
  };
}

/** The reviews backing a set of changes, applicable ones only. */
function applicableReviews(changes: readonly Change[]): ReviewRecord[] {
  return changes.map((c) => c.review).filter(isApplicable);
}

// ---------------------------------------------------------------------------
// L-5: exhaustive, excluding arms over 0.6 Tier ≥ 2 changes with an applicable review
// ---------------------------------------------------------------------------

type Arm = 'premortem' | 'compliance' | 'undeclared';

/** L-5: `na ≤ 3` → premortem; `na ≥ 4` or `premortem:false` → compliance; anything else → undeclared. */
function armOf(spec: SpecFlowEvent): Arm {
  if (spec.premortemSkipped === true) return 'compliance';
  if (spec.premortem !== undefined && spec.premortem.na !== undefined) {
    return spec.premortem.na <= 3 ? 'premortem' : 'compliance';
  }
  return 'undeclared'; // absent, "n/a", legacy `true` → `{}` with no `na`, or dirty data
}

function is06Tier2WithApplicableReview(c: Change): boolean {
  return (
    versionAtLeast(c.spec.specFlowVersion, '0.6') &&
    c.spec.tier !== undefined &&
    c.spec.tier >= 2 &&
    isApplicable(c.review)
  );
}

/** L-5: the 0.5 baseline — pre-0.6 changes with an APPLICABLE INLINE review. `cappedShare` is always `null`: the cap flag did not exist yet. */
function baseline05Arm(changes: readonly Change[]): FirstPassArm | null {
  const records = changes
    .filter((c) => !versionAtLeast(c.spec.specFlowVersion, '0.6') && c.spec.review !== undefined)
    .map((c) => fromInline(c.spec.ts, c.spec.review!))
    .filter(isApplicable);
  if (records.length === 0) return null;
  const values = records.filter((r) => r.findings !== undefined).map((r) => r.findings as number);
  return {
    meanExact: values.length > 0 ? mean(values) : null,
    nTotal: records.length,
    nExact: values.length,
    nCensored: 0,
    nUnknownCap: records.length - values.length,
    cappedShare: null,
  };
}

// ---------------------------------------------------------------------------
// L-4: unclosed
// ---------------------------------------------------------------------------

export interface UnclosedStats {
  count: number;
  n: number;
}

/**
 * L-4: universe = changes with spec Tier ≥ 1 that are 0.6 OR carry an inline
 * review, EXCLUDING changes whose review is "no aplicó" (L-2). Unclosed =
 * review `null`, or review with `findings` non-numeric (`"pending"`).
 */
function unclosedStats(changes: readonly Change[]): UnclosedStats | null {
  const universe = changes.filter((c) => {
    if (c.spec.tier === undefined || c.spec.tier < 1) return false;
    const eligible = versionAtLeast(c.spec.specFlowVersion, '0.6') || c.spec.review !== undefined;
    if (!eligible) return false;
    if (c.review !== null && !isApplicable(c.review)) return false;
    return true;
  });
  if (universe.length === 0) return null;
  const count = universe.filter((c) => c.review === null || c.review.findings === undefined).length;
  return { count, n: universe.length };
}

// ---------------------------------------------------------------------------
// L-10: assumptions/gate/tests/resolved consumers
// ---------------------------------------------------------------------------

function testsValueOf(c: Change): string | undefined {
  return c.review?.tests ?? c.spec.tests;
}

/**
 * `reversals ÷ Σassumptions`; n = changes with `assumptions` defined. F4:
 * divides by `maxAssumptions` (the max declared across every spec line for
 * that change), not the collapsed spec's own value — a shrinking re-emission
 * must not inflate the ratio.
 */
function reversalRate(
  changes: readonly Change[],
  reversals: readonly ReversalEvent[],
): SumRatioMetric | null {
  const reversalsByChange = new Map<string, number>();
  for (const r of reversals)
    reversalsByChange.set(r.change, (reversalsByChange.get(r.change) ?? 0) + 1);
  const pairs: [number, number][] = changes
    .filter((c) => c.maxAssumptions !== undefined)
    .map((c) => [reversalsByChange.get(c.spec.change) ?? 0, c.maxAssumptions as number]);
  return sumRatio(pairs);
}

/** `Σgaps_adopted ÷ Σgaps_found`; n = changes with `spec_review`. */
function gateAdoption(changes: readonly Change[]): SumRatioMetric | null {
  const pairs: [number, number][] = changes
    .filter(
      (c) =>
        c.spec.specReview?.gapsFound !== undefined && c.spec.specReview.gapsAdopted !== undefined,
    )
    .map((c) => [c.spec.specReview!.gapsAdopted as number, c.spec.specReview!.gapsFound as number]);
  return sumRatio(pairs);
}

/**
 * F2: share of 0.6, T2+ changes with an applicable review whose `tests`
 * is a real declared value (`"verified"` or otherwise), never `"n/a"` and
 * never a pre-0.6 change (where `"added"` already satisfied the old,
 * unrestricted universe). n = those declaring a real `tests` value.
 */
function verifiedShare(changes: readonly Change[]): RateMetric | null {
  const declaring = changes
    .filter(
      (c) =>
        versionAtLeast(c.spec.specFlowVersion, '0.6') &&
        c.spec.tier !== undefined &&
        c.spec.tier >= 2 &&
        isApplicable(c.review),
    )
    .map(testsValueOf)
    .filter((t): t is string => t !== undefined && t !== 'n/a');
  return rateMetric(declaring.map((t) => t === 'verified'));
}

/**
 * `Σresolved ÷ Σfound_total`; n = changes with both. F3: caller passes only
 * `applicableChanges` — a `level:"n/a"` review must not enter this ratio even
 * when it happens to carry `resolved`/`found_total`.
 */
function resolvedShare(changes: readonly Change[]): SumRatioMetric | null {
  const pairs: [number, number][] = changes
    .filter((c) => c.review?.resolved !== undefined && c.review.foundTotal !== undefined)
    .map((c) => [c.review!.resolved as number, c.review!.foundTotal as number]);
  return sumRatio(pairs);
}

// ---------------------------------------------------------------------------
// the full per-repo aggregate
// ---------------------------------------------------------------------------

export interface ReviewLoopStats {
  passes: { median: number; sharePassesAtMost2: number; n: number } | null;
  capped: RateMetric | null;
  induced: RateMetric | null;
  redesigned: RateMetric | null;
  unclosed: UnclosedStats | null;
  open: { sum: number; median: number; n: number } | null;
  firstPassFindings: {
    premortem: FirstPassArm | null;
    compliance: FirstPassArm | null;
    undeclared: FirstPassArm | null;
    baseline05: FirstPassArm | null;
  };
  reversalRate: SumRatioMetric | null;
  gateAdoption: SumRatioMetric | null;
  verifiedShare: RateMetric | null;
  resolvedShare: SumRatioMetric | null;
}

/**
 * Aggregates the spec-flow 0.6 review-loop signals (ADR-0037) per the L-1..L-11
 * data model. `specs`/`reviews` are joined into `Change[]` first (L-1); every
 * metric below is computed over that unit, with its OWN denominator.
 */
export function reviewLoopStats(
  specs: readonly SpecFlowEvent[],
  reviews: readonly ReviewEvent[],
  reversals: readonly ReversalEvent[] = [],
): ReviewLoopStats {
  const changes = joinChanges(specs, reviews);
  const applicableChanges = changes.filter((c) => isApplicable(c.review));

  const passesArr = applicableChanges
    .map((c) => c.review!.passes)
    .filter((p): p is number => p !== undefined);
  const passes =
    passesArr.length > 0
      ? {
          median: median(passesArr) as number,
          sharePassesAtMost2: passesArr.filter((p) => p <= 2).length / passesArr.length,
          n: passesArr.length,
        }
      : null;

  const capped = rateMetric(
    applicableChanges
      .filter((c) => c.review!.findingsCapped !== undefined)
      .map((c) => c.review!.findingsCapped === true),
  );
  const induced = rateMetric(
    applicableChanges
      .filter((c) => c.review!.induced !== undefined)
      .map((c) => (c.review!.induced as number) > 0),
  );
  const redesigned = rateMetric(
    applicableChanges
      .filter((c) => c.review!.redesigned !== undefined)
      .map((c) => c.review!.redesigned === true),
  );

  const openValues = applicableChanges
    .map((c) => c.review!.open)
    .filter((o): o is number => o !== undefined);
  const open =
    openValues.length > 0
      ? {
          sum: openValues.reduce((a, b) => a + b, 0),
          median: median(openValues) as number,
          n: openValues.length,
        }
      : null;

  const eligible06T2 = changes.filter(is06Tier2WithApplicableReview);
  const premortemChanges = eligible06T2.filter((c) => armOf(c.spec) === 'premortem');
  const complianceChanges = eligible06T2.filter((c) => armOf(c.spec) === 'compliance');
  const undeclaredChanges = eligible06T2.filter((c) => armOf(c.spec) === 'undeclared');

  return {
    passes,
    capped,
    induced,
    redesigned,
    unclosed: unclosedStats(changes),
    open,
    firstPassFindings: {
      premortem: buildArm(applicableReviews(premortemChanges)),
      compliance: buildArm(applicableReviews(complianceChanges)),
      undeclared: buildArm(applicableReviews(undeclaredChanges)),
      baseline05: baseline05Arm(changes),
    },
    reversalRate: reversalRate(changes, reversals),
    gateAdoption: gateAdoption(changes),
    verifiedShare: verifiedShare(changes),
    resolvedShare: resolvedShare(applicableChanges),
  };
}

// ---------------------------------------------------------------------------
// L-11: cross-repo aggregation — median of per-repo values, n is a real sum,
// `repos` counts only repos that actually contributed data.
// ---------------------------------------------------------------------------

export interface AggregatedRate extends RateMetric {
  repos: number;
}

export interface AggregatedSumRatio extends SumRatioMetric {
  repos: number;
}

export interface AggregatedFirstPassArm extends FirstPassArm {
  repos: number;
}

export interface AggregatedReviewLoop {
  /** Repos with at least one non-null review-loop metric. */
  repos: number;
  passes: { median: number; sharePassesAtMost2: number; n: number; repos: number } | null;
  capped: AggregatedRate | null;
  induced: AggregatedRate | null;
  redesigned: AggregatedRate | null;
  unclosed: { rate: number; count: number; n: number; repos: number } | null;
  open: { sum: number; median: number; n: number; repos: number } | null;
  firstPassFindings: {
    premortem: AggregatedFirstPassArm | null;
    compliance: AggregatedFirstPassArm | null;
    undeclared: AggregatedFirstPassArm | null;
    baseline05: AggregatedFirstPassArm | null;
  };
  reversalRate: AggregatedSumRatio | null;
  gateAdoption: AggregatedSumRatio | null;
  verifiedShare: AggregatedRate | null;
  resolvedShare: AggregatedSumRatio | null;
}

function aggregateRate(items: readonly (RateMetric | null)[]): AggregatedRate | null {
  const withData = items.filter((i): i is RateMetric => i !== null);
  if (withData.length === 0) return null;
  return {
    rate: median(withData.map((i) => i.rate)) as number,
    n: withData.reduce((a, i) => a + i.n, 0),
    repos: withData.length,
  };
}

function aggregateSumRatio(items: readonly (SumRatioMetric | null)[]): AggregatedSumRatio | null {
  const withData = items.filter((i): i is SumRatioMetric => i !== null);
  if (withData.length === 0) return null;
  return {
    ratio: median(withData.map((i) => i.ratio)) as number,
    n: withData.reduce((a, i) => a + i.n, 0),
    repos: withData.length,
  };
}

function aggregateArm(items: readonly (FirstPassArm | null)[]): AggregatedFirstPassArm | null {
  const withData = items.filter((i): i is FirstPassArm => i !== null);
  if (withData.length === 0) return null;
  const exactMeans = withData.map((i) => i.meanExact).filter((m): m is number => m !== null);
  const cappedShares = withData.map((i) => i.cappedShare).filter((c): c is number => c !== null);
  return {
    meanExact: exactMeans.length > 0 ? (median(exactMeans) as number) : null,
    nTotal: withData.reduce((a, i) => a + i.nTotal, 0),
    nExact: withData.reduce((a, i) => a + i.nExact, 0),
    nCensored: withData.reduce((a, i) => a + i.nCensored, 0),
    nUnknownCap: withData.reduce((a, i) => a + i.nUnknownCap, 0),
    cappedShare: cappedShares.length > 0 ? (median(cappedShares) as number) : null,
    repos: withData.length,
  };
}

function hasAnyData(r: ReviewLoopStats): boolean {
  return (
    r.passes !== null ||
    r.capped !== null ||
    r.induced !== null ||
    r.redesigned !== null ||
    r.unclosed !== null ||
    r.open !== null ||
    r.firstPassFindings.premortem !== null ||
    r.firstPassFindings.compliance !== null ||
    r.firstPassFindings.undeclared !== null ||
    r.firstPassFindings.baseline05 !== null ||
    r.reversalRate !== null ||
    r.gateAdoption !== null ||
    r.verifiedShare !== null ||
    r.resolvedShare !== null
  );
}

/**
 * L-11: combines per-repo `ReviewLoopStats` the BASELINE-RELATIVE way, same
 * rule as `aggregateImpact` — the cross-repo value is the MEDIAN of per-repo
 * values, never a pooled count. Each metric's `n` IS a sum across repos (a
 * sample-size count, not a rate to median); `repos` on `AggregatedReviewLoop`
 * counts only repos that reported ANY review-loop data at all.
 */
export function aggregateReviewLoop(perRepo: readonly ReviewLoopStats[]): AggregatedReviewLoop {
  const passesData = perRepo
    .map((r) => r.passes)
    .filter((p): p is NonNullable<ReviewLoopStats['passes']> => p !== null);
  const passes =
    passesData.length > 0
      ? {
          median: median(passesData.map((p) => p.median)) as number,
          sharePassesAtMost2: median(passesData.map((p) => p.sharePassesAtMost2)) as number,
          n: passesData.reduce((a, p) => a + p.n, 0),
          repos: passesData.length,
        }
      : null;

  // F7: `rate` is the median across repos of each repo's OWN count/n share —
  // never a pooled count/pooled-n, which lets a large repo's denominator
  // swamp a small repo's signal. `count`/`n` are still summed, but labeled
  // as totals, never rendered as if they were the rate.
  const unclosedData = perRepo.map((r) => r.unclosed).filter((u): u is UnclosedStats => u !== null);
  const unclosed =
    unclosedData.length > 0
      ? {
          rate: median(unclosedData.map((u) => u.count / u.n)) as number,
          count: unclosedData.reduce((a, u) => a + u.count, 0),
          n: unclosedData.reduce((a, u) => a + u.n, 0),
          repos: unclosedData.length,
        }
      : null;

  const openData = perRepo
    .map((r) => r.open)
    .filter((o): o is NonNullable<ReviewLoopStats['open']> => o !== null);
  const open =
    openData.length > 0
      ? {
          sum: openData.reduce((a, o) => a + o.sum, 0),
          median: median(openData.map((o) => o.median)) as number,
          n: openData.reduce((a, o) => a + o.n, 0),
          repos: openData.length,
        }
      : null;

  return {
    repos: perRepo.filter(hasAnyData).length,
    passes,
    capped: aggregateRate(perRepo.map((r) => r.capped)),
    induced: aggregateRate(perRepo.map((r) => r.induced)),
    redesigned: aggregateRate(perRepo.map((r) => r.redesigned)),
    unclosed,
    open,
    firstPassFindings: {
      premortem: aggregateArm(perRepo.map((r) => r.firstPassFindings.premortem)),
      compliance: aggregateArm(perRepo.map((r) => r.firstPassFindings.compliance)),
      undeclared: aggregateArm(perRepo.map((r) => r.firstPassFindings.undeclared)),
      baseline05: aggregateArm(perRepo.map((r) => r.firstPassFindings.baseline05)),
    },
    reversalRate: aggregateSumRatio(perRepo.map((r) => r.reversalRate)),
    gateAdoption: aggregateSumRatio(perRepo.map((r) => r.gateAdoption)),
    verifiedShare: aggregateRate(perRepo.map((r) => r.verifiedShare)),
    resolvedShare: aggregateSumRatio(perRepo.map((r) => r.resolvedShare)),
  };
}
