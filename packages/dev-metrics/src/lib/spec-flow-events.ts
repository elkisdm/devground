import { existsSync, readFileSync } from 'node:fs';
import { median } from './stats.js';

/**
 * Reader for spec-flow's per-change telemetry (`<repo>/.spec-flow/events.jsonl`).
 *
 * This is a DIFFERENT artifact from dev-metrics' own `EventAnnotation` (a
 * timeline marker of date+label). spec-flow 0.6 (ADR-0037) writes THREE kinds
 * of lines to the same append-only file, discriminated by `event`:
 *  - `"spec"` (or the field absent, for pre-0.6 events) — one per change, after
 *    the design gate.
 *  - `"review"` — one per change, when the review loop closes. Split from the
 *    spec event because the two are known at different moments and land in
 *    different commits (see SKILL.md Step 6).
 *  - `"assumption_reversed"` — zero or more per change, the quality counter-signal.
 *
 * The file is written by an agent, so we parse defensively: blank and malformed
 * lines are skipped, not fatal.
 */

export interface SpecFlowEvent {
  /** ISO-8601 timestamp with timezone. */
  ts: string;
  /** YYYY-MM-DD of the change. */
  date: string;
  /** kebab-case change name. */
  change: string;
  /** 0..3 ceremony tier. */
  tier: number;
  /** Conventional-commit type. */
  type: string;
  size: string;
  risk: string;
  uncertainty: string;
  /** Paths the change declared touching. */
  files: string[];
  /** Friction gauge — should be ~0 under the Prime Directive. `undefined` when absent/malformed (never `0` by default). */
  questionsAsked?: number;
  /** `"inline"` or a path to the persisted brief. */
  brief: string;
  /** Whether Step 0 found and read a code map. */
  codemapUsed: boolean;
  specFlowVersion: string;
  /** DoD compliance for tests: "verified"|"added"|"updated"|"n/a"|"deferred". Optional, backward-compatible. */
  tests?: string;
  /**
   * Inline review carried by the spec event itself — the spec-flow 0.5 shape,
   * kept as the baseline the 0.6 numbers are compared against. 0.6 events
   * write the closing review as a SEPARATE `"review"` event (see `ReviewEvent`)
   * instead.
   */
  review?: SpecFlowReview;
  /**
   * Pre-mortem outcome (0.6, Tier 2+ Step 3). `{}` means the section was
   * written but no usable `na` count came with it (or `premortem:true`,
   * the legacy shape). `{na}` is the count of rows answered `n/a` (0-5).
   * `undefined` for absent/`"n/a"` (Tier 0-1, or an older event).
   */
  premortem?: { na?: number };
  /** `true` when the spec event explicitly recorded `premortem:false` — the section was skipped. */
  premortemSkipped?: boolean;
  /** Design-gate outcome (0.6, Tier 2+ Step 3.6). `undefined` for absent/`"n/a"`/no readable counts. */
  specReview?: { gapsFound?: number; gapsAdopted?: number };
}

export interface SpecFlowReview {
  level: string;
  /** Findings from review pass 1 (comparable across changes). `undefined` when missing/malformed. */
  findings?: number;
  /** Total findings closed across all passes. `undefined` when missing/malformed. */
  resolved?: number;
  /** How many review passes ran before the change closed. */
  passes?: number;
  /** True when pass 1 hit the reviewer's finding cap — `findings` is "at least", not exact. */
  findingsCapped?: boolean;
  /** Findings in a later pass whose `file:line` falls inside an earlier pass's fix diff. */
  induced?: number;
  /** Whether an induced finding sent the change back to the spec for a redesign. */
  redesigned?: boolean;
}

/**
 * The closing review event (spec-flow 0.6, ADR-0037). Written when the review
 * loop closes, committed with the last fix commit, and joined to its `spec`
 * event by `change`. `level` is `undefined` both when the field is absent and
 * when it is the literal `"n/a"` — either way, no review applied, and this
 * event must NOT count as "reviewed" in any aggregate.
 */
export interface ReviewEvent {
  ts: string;
  date: string;
  change: string;
  level?: string;
  /** Pass-1 findings — the number comparable across changes. `undefined` when missing/malformed. */
  findings?: number;
  /** True when pass 1 hit the reviewer's cap — `findings` is a floor, not exact. */
  findingsCapped?: boolean;
  /** Findings across ALL passes. */
  foundTotal?: number;
  /** How many passes completed (a dead pass does not count). */
  passes?: number;
  /** Pass ≥2 findings whose defect did not exist before the earlier fixes. */
  induced?: number;
  /** Findings fixed. */
  resolved?: number;
  /** Debt: deferred or still unresolved at close. */
  open?: number;
  /** Whether an induced finding triggered the stop rule's redesign. */
  redesigned?: boolean;
  /** DoD compliance for tests. */
  tests?: string;
  specFlowVersion: string;
}

/** The quality counter-signal: an inferred assumption that turned out wrong. */
export interface ReversalEvent {
  ts: string;
  date: string;
  /** Same `change` as the spec event it corrects. */
  change: string;
  assumption?: string;
  cost?: string;
  /** Optional: the model-orchestrator task id whose inference was reversed. */
  taskId?: number;
}

interface RawEvent {
  event?: unknown;
  ts?: unknown;
  date?: unknown;
  change?: unknown;
  tier?: unknown;
  type?: unknown;
  size?: unknown;
  risk?: unknown;
  uncertainty?: unknown;
  files?: unknown;
  questions_asked?: unknown;
  brief?: unknown;
  codemap_used?: unknown;
  spec_flow_version?: unknown;
  tests?: unknown;
  review?: unknown;
  premortem?: unknown;
  spec_review?: unknown;
  // review event (0.6) top-level fields
  level?: unknown;
  passes?: unknown;
  findings?: unknown;
  findings_capped?: unknown;
  found_total?: unknown;
  induced?: unknown;
  resolved?: unknown;
  open?: unknown;
  redesigned?: unknown;
  // assumption_reversed event fields
  assumption?: unknown;
  cost?: unknown;
  task_id?: unknown;
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/**
 * Strict count parse for fields where `0` is not a safe fallback — a censored
 * or omitted count must not silently read as zero, and dirty data (a negative,
 * a fraction, a numeric string, an unsafe-integer float) must not be coerced
 * quietly. Only a real, non-negative, safe integer counts. Everything else
 * (including `-1`, `1.5`, `"10"`, `1e308`) becomes `undefined`.
 */
function count(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : undefined;
}

function optBool(v: unknown): boolean | undefined {
  return typeof v === 'boolean' ? v : undefined;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Normalizes the `review` field carried INLINE on a spec event — the
 * spec-flow 0.5 shape, kept as the baseline 0.6 is compared against. Tolerates
 * the three shapes it takes in the wild: absent, the string `"n/a"`, or the
 * object. Anything else is treated as absent rather than crashing the parse —
 * one malformed line must never take down a whole metrics run.
 *
 * `findings`/`resolved`/etc. use `count`, not `num`: a real event from
 * Capitalacademy carries `"findings":"pending"`, which used to silently become
 * `0` (ADR-0036's bug) and must instead read as "unknown", not "zero findings".
 * Never emits a key with an explicit `undefined` value.
 */
function normalizeReview(v: unknown): SpecFlowReview | undefined {
  if (!isPlainObject(v)) return undefined;
  const level = str(v.level);
  if (level === '') return undefined;
  const findings = count(v.findings);
  const resolved = count(v.resolved);
  const passes = count(v.passes);
  const findingsCapped = optBool(v.findings_capped);
  const induced = count(v.induced);
  const redesigned = optBool(v.redesigned);
  return {
    level,
    ...(findings !== undefined ? { findings } : {}),
    ...(resolved !== undefined ? { resolved } : {}),
    ...(passes !== undefined ? { passes } : {}),
    ...(findingsCapped !== undefined ? { findingsCapped } : {}),
    ...(induced !== undefined ? { induced } : {}),
    ...(redesigned !== undefined ? { redesigned } : {}),
  };
}

/**
 * Normalizes `premortem`: `{"na": n}` → `{na}` (n dropped if malformed);
 * `false` → `premortemSkipped: true` (the section was explicitly skipped);
 * legacy `true` (or an object with no readable `na`) → `{}` (a pre-mortem was
 * written, but no `na` count is known); `"n/a"`/absent/anything else → both
 * fields absent.
 */
function normalizePremortem(v: unknown): { premortem?: { na?: number }; premortemSkipped?: true } {
  if (v === false) return { premortemSkipped: true };
  if (v === true) return { premortem: {} };
  if (isPlainObject(v)) {
    const na = count(v.na);
    return { premortem: na === undefined ? {} : { na } };
  }
  return {};
}

/**
 * Normalizes `spec_review`: an object with at least one readable count →
 * `{gapsFound?, gapsAdopted?}`; `{}`, arrays, `"n/a"`, absent, or anything else
 * → `undefined` — an object with no readable data is treated as absent, same
 * rule as `review`.
 */
function normalizeSpecReview(v: unknown): { gapsFound?: number; gapsAdopted?: number } | undefined {
  if (!isPlainObject(v)) return undefined;
  const gapsFound = count(v.gaps_found);
  const gapsAdopted = count(v.gaps_adopted);
  if (gapsFound === undefined && gapsAdopted === undefined) return undefined;
  return {
    ...(gapsFound !== undefined ? { gapsFound } : {}),
    ...(gapsAdopted !== undefined ? { gapsAdopted } : {}),
  };
}

/** Normalizes one parsed JSON object into a `SpecFlowEvent`, or null if it has no date. */
function normalizeSpec(raw: RawEvent): SpecFlowEvent | null {
  const date = str(raw.date);
  if (date === '') return null; // a line with no date is unusable for segmentation
  const files = Array.isArray(raw.files)
    ? raw.files.filter((f): f is string => typeof f === 'string')
    : [];
  const questionsAsked = count(raw.questions_asked);
  const tests = str(raw.tests) || undefined;
  const review = normalizeReview(raw.review);
  const { premortem, premortemSkipped } = normalizePremortem(raw.premortem);
  const specReview = normalizeSpecReview(raw.spec_review);
  return {
    ts: str(raw.ts, date),
    date,
    change: str(raw.change),
    tier: num(raw.tier),
    type: str(raw.type, 'other'),
    size: str(raw.size),
    risk: str(raw.risk),
    uncertainty: str(raw.uncertainty),
    files,
    brief: str(raw.brief),
    codemapUsed: raw.codemap_used === true,
    specFlowVersion: str(raw.spec_flow_version),
    ...(questionsAsked !== undefined ? { questionsAsked } : {}),
    ...(tests !== undefined ? { tests } : {}),
    ...(review !== undefined ? { review } : {}),
    ...(premortem !== undefined ? { premortem } : {}),
    ...(premortemSkipped !== undefined ? { premortemSkipped } : {}),
    ...(specReview !== undefined ? { specReview } : {}),
  };
}

/**
 * Normalizes one parsed JSON object into a `ReviewEvent`, or null if it has no
 * date. `level` is `undefined` for both the absent field and the literal
 * `"n/a"` — both mean "no review applied", never a value to aggregate over.
 */
function normalizeReviewEvent(raw: RawEvent): ReviewEvent | null {
  const date = str(raw.date);
  if (date === '') return null;
  const rawLevel = str(raw.level);
  const level = rawLevel === '' || rawLevel === 'n/a' ? undefined : rawLevel;
  const passes = count(raw.passes);
  const findings = count(raw.findings);
  const findingsCapped = optBool(raw.findings_capped);
  const foundTotal = count(raw.found_total);
  const induced = count(raw.induced);
  const resolved = count(raw.resolved);
  const open = count(raw.open);
  const redesigned = optBool(raw.redesigned);
  const tests = str(raw.tests) || undefined;
  return {
    ts: str(raw.ts, date),
    date,
    change: str(raw.change),
    specFlowVersion: str(raw.spec_flow_version),
    ...(level !== undefined ? { level } : {}),
    ...(passes !== undefined ? { passes } : {}),
    ...(findings !== undefined ? { findings } : {}),
    ...(findingsCapped !== undefined ? { findingsCapped } : {}),
    ...(foundTotal !== undefined ? { foundTotal } : {}),
    ...(induced !== undefined ? { induced } : {}),
    ...(resolved !== undefined ? { resolved } : {}),
    ...(open !== undefined ? { open } : {}),
    ...(redesigned !== undefined ? { redesigned } : {}),
    ...(tests !== undefined ? { tests } : {}),
  };
}

/** Normalizes one parsed JSON object into a `ReversalEvent`, or null if it has no date. */
function normalizeReversal(raw: RawEvent): ReversalEvent | null {
  const date = str(raw.date);
  if (date === '') return null;
  const assumption = str(raw.assumption) || undefined;
  const cost = str(raw.cost) || undefined;
  const taskId = count(raw.task_id);
  return {
    ts: str(raw.ts, date),
    date,
    change: str(raw.change),
    ...(assumption !== undefined ? { assumption } : {}),
    ...(cost !== undefined ? { cost } : {}),
    ...(taskId !== undefined ? { taskId } : {}),
  };
}

type EventKind = 'spec' | 'review' | 'assumption_reversed' | 'other';

/** A missing `event` field means `"spec"` (pre-0.6 events never had the discriminator). */
function eventKind(raw: RawEvent): EventKind {
  if (raw.event === undefined) return 'spec';
  if (raw.event === 'spec' || raw.event === 'review' || raw.event === 'assumption_reversed') {
    return raw.event;
  }
  return 'other';
}

export interface SpecFlowLog {
  specs: SpecFlowEvent[];
  reviews: ReviewEvent[];
  reversals: ReversalEvent[];
}

/**
 * Parses JSONL text into the three event kinds, skipping blank, malformed, and
 * unrecognized-`event` lines. This is the ONLY place that reads `event` to
 * route a line — a `review` line must never be miscounted as a `spec` (the
 * bug that made 247 real `assumption_reversed` lines count as Tier-0 specs).
 */
export function parseSpecFlowLog(text: string): SpecFlowLog {
  const specs: SpecFlowEvent[] = [];
  const reviews: ReviewEvent[] = [];
  const reversals: ReversalEvent[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '') continue;
    let raw: RawEvent;
    try {
      raw = JSON.parse(trimmed) as RawEvent;
    } catch {
      continue; // tolerate a half-written or corrupted line
    }
    switch (eventKind(raw)) {
      case 'spec': {
        const event = normalizeSpec(raw);
        if (event) specs.push(event);
        break;
      }
      case 'review': {
        const event = normalizeReviewEvent(raw);
        if (event) reviews.push(event);
        break;
      }
      case 'assumption_reversed': {
        const event = normalizeReversal(raw);
        if (event) reversals.push(event);
        break;
      }
      default:
        break; // unrecognized `event` value: skip, don't guess
    }
  }
  return { specs, reviews, reversals };
}

/** Reads `<repo>/.spec-flow/events.jsonl`, returning empty arrays when absent. */
export function readSpecFlowLog(filePath: string): SpecFlowLog {
  if (!existsSync(filePath)) return { specs: [], reviews: [], reversals: [] };
  return parseSpecFlowLog(readFileSync(filePath, 'utf-8'));
}

/** Parses JSONL text into `spec` events only. Back-compat convenience over `parseSpecFlowLog`. */
export function parseSpecFlowEvents(text: string): SpecFlowEvent[] {
  return parseSpecFlowLog(text).specs;
}

/** Reads `<repo>/.spec-flow/events.jsonl`, returning `[]` when absent. */
export function readSpecFlowEvents(filePath: string): SpecFlowEvent[] {
  return readSpecFlowLog(filePath).specs;
}

/** Earliest event date (the repo's spec-flow rollout), or null when there are none. */
export function rolloutDate(events: readonly SpecFlowEvent[]): string | null {
  let min: string | null = null;
  for (const e of events) {
    if (min === null || e.date < min) min = e.date;
  }
  return min;
}

/** Mean `questionsAsked` per tier — the friction gauge, segmented by ceremony. Events without a valid count are excluded, never treated as 0. */
export function frictionByTier(events: readonly SpecFlowEvent[]): Record<number, number> {
  const sum: Record<number, number> = {};
  const n: Record<number, number> = {};
  for (const e of events) {
    if (e.questionsAsked === undefined) continue;
    sum[e.tier] = (sum[e.tier] ?? 0) + e.questionsAsked;
    n[e.tier] = (n[e.tier] ?? 0) + 1;
  }
  const out: Record<number, number> = {};
  for (const tier of Object.keys(n)) {
    const t = Number(tier);
    out[t] = sum[t] / n[t];
  }
  return out;
}

/** Mean of a numeric series, or `null` when empty. */
function mean(xs: readonly number[]): number | null {
  return xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length;
}

/**
 * Compares two spec-flow version strings ("0.2".."0.6", dotted numeric parts).
 * An absent/empty version is treated as older than anything (spec-flow 0.6 is
 * the first version to carry the field consistently).
 */
export function versionAtLeast(v: string | undefined, min: string): boolean {
  if (v === undefined || v === '') return false;
  const parts = (s: string) => s.split('.').map((p) => Number.parseInt(p, 10) || 0);
  const vp = parts(v);
  const mp = parts(min);
  const len = Math.max(vp.length, mp.length);
  for (let i = 0; i < len; i++) {
    const a = vp[i] ?? 0;
    const b = mp[i] ?? 0;
    if (a !== b) return a > b;
  }
  return true; // equal
}

/** Picks, per `change`, the review event with the latest `ts` (ties keep the later one seen). */
function latestReviewByChange(reviews: readonly ReviewEvent[]): Map<string, ReviewEvent> {
  const map = new Map<string, ReviewEvent>();
  for (const r of reviews) {
    const prev = map.get(r.change);
    if (!prev) {
      map.set(r.change, r);
      continue;
    }
    const prevTime = Date.parse(prev.ts);
    const curTime = Date.parse(r.ts);
    const preferCurrent =
      Number.isNaN(prevTime) || Number.isNaN(curTime) ? r.ts >= prev.ts : curTime >= prevTime;
    if (preferCurrent) map.set(r.change, r);
  }
  return map;
}

export interface RateMetric {
  rate: number;
  n: number;
}

export interface FirstPassArm {
  /** Mean of NON-censored pass-1 findings only. */
  mean: number;
  /** Total samples in the arm (censored + non-censored). */
  n: number;
  /** Share of the arm's samples that were censored (capped). `null` when the cap status is unknown (the 0.5 baseline). */
  cappedShare: number | null;
}

export interface ReviewLoopStats {
  /** Review passes to close, and the share closing at ≤2 (the cap ADR-0037 sets). */
  passes: { median: number; sharePassesAtMost2: number; n: number } | null;
  /** Share of reviews whose pass 1 hit the reviewer's finding cap. */
  capped: RateMetric | null;
  /** Share of reviews reporting `induced > 0`. */
  induced: RateMetric | null;
  /** Share of reviews reporting `redesigned: true`. */
  redesigned: RateMetric | null;
  /** Reviews that never closed: `n` = eligible 0.6 specs (Tier ≥ 1); `count` = those without a joined review, plus reviews missing `findings`. */
  unclosed: { count: number; n: number } | null;
  /** Debt left open at close. */
  open: { sum: number; median: number; n: number } | null;
  /** Pass-1 findings, in three arms with their own n and censoring share. */
  firstPassFindings: {
    premortem: FirstPassArm | null;
    compliance: FirstPassArm | null;
    baseline05: FirstPassArm | null;
  };
}

function rateMetric(items: readonly boolean[]): RateMetric | null {
  return items.length > 0
    ? { rate: items.filter(Boolean).length / items.length, n: items.length }
    : null;
}

/** Joins `specsInArm` to their latest review by `change` and computes the arm's stats. */
function firstPassArm(
  specsInArm: readonly SpecFlowEvent[],
  byChange: ReadonlyMap<string, ReviewEvent>,
): FirstPassArm | null {
  const samples: { findings: number; capped: boolean }[] = [];
  for (const s of specsInArm) {
    const r = byChange.get(s.change);
    if (!r || r.findings === undefined) continue;
    samples.push({ findings: r.findings, capped: r.findingsCapped === true });
  }
  if (samples.length === 0) return null;
  const nonCensored = samples.filter((s) => !s.capped).map((s) => s.findings);
  if (nonCensored.length === 0) return null; // nothing usable for a mean
  const cappedCount = samples.length - nonCensored.length;
  return {
    mean: mean(nonCensored) as number,
    n: samples.length,
    cappedShare: cappedCount / samples.length,
  };
}

/** The 0.5 baseline arm: inline `review.findings` on the spec event — the tope was unknown, so `cappedShare` stays `null`. */
function baseline05Arm(specs: readonly SpecFlowEvent[]): FirstPassArm | null {
  const values = specs
    .filter((s) => !versionAtLeast(s.specFlowVersion, '0.6') && s.review?.findings !== undefined)
    .map((s) => s.review!.findings as number);
  if (values.length === 0) return null;
  return { mean: mean(values) as number, n: values.length, cappedShare: null };
}

/**
 * Aggregates the spec-flow 0.6 review-loop signals (ADR-0037): whether the
 * cap on passes is holding, how often the reviewer's cap censors pass-1
 * findings, how often a closing pass induces new findings, and whether a
 * pre-mortem lowers pass-1 findings vs. the 0.5 baseline.
 *
 * Unit = the change. Specs and reviews are joined by `change` (the latest
 * review by `ts` when several exist). EVERY metric below has its OWN
 * denominator — only the events that report the relevant field — never a
 * shared `withReview` count. An event without the field contributes to
 * NEITHER the numerator NOR the denominator of that metric.
 */
export function reviewLoopStats(
  specs: readonly SpecFlowEvent[],
  reviews: readonly ReviewEvent[],
): ReviewLoopStats {
  const byChange = latestReviewByChange(reviews);

  const passReviews = reviews.filter((r) => r.passes !== undefined && r.level !== undefined);
  const passesArr = passReviews.map((r) => r.passes as number);
  const passes =
    passesArr.length > 0
      ? {
          median: median(passesArr) as number,
          sharePassesAtMost2: passesArr.filter((p) => p <= 2).length / passesArr.length,
          n: passesArr.length,
        }
      : null;

  const capped = rateMetric(
    reviews.filter((r) => r.findingsCapped !== undefined).map((r) => r.findingsCapped === true),
  );
  const induced = rateMetric(
    reviews.filter((r) => r.induced !== undefined).map((r) => (r.induced as number) > 0),
  );
  const redesigned = rateMetric(
    reviews.filter((r) => r.redesigned !== undefined).map((r) => r.redesigned === true),
  );

  const specs06 = specs.filter((s) => versionAtLeast(s.specFlowVersion, '0.6') && s.tier >= 1);
  const unclosedSpecsWithoutReview = specs06.filter((s) => !byChange.has(s.change)).length;
  const reviewsMissingFindings = reviews.filter((r) => r.findings === undefined).length;
  const unclosed =
    specs06.length > 0
      ? { count: unclosedSpecsWithoutReview + reviewsMissingFindings, n: specs06.length }
      : null;

  const openValues = reviews.filter((r) => r.open !== undefined).map((r) => r.open as number);
  const open =
    openValues.length > 0
      ? {
          sum: openValues.reduce((a, b) => a + b, 0),
          median: median(openValues) as number,
          n: openValues.length,
        }
      : null;

  const premortemSpecs = specs06.filter(
    (s) => s.premortem !== undefined && (s.premortem.na === undefined || s.premortem.na <= 3),
  );
  const complianceSpecs = specs06.filter(
    (s) =>
      (s.premortem !== undefined && s.premortem.na !== undefined && s.premortem.na >= 4) ||
      s.premortemSkipped === true,
  );

  return {
    passes,
    capped,
    induced,
    redesigned,
    unclosed,
    open,
    firstPassFindings: {
      premortem: firstPassArm(premortemSpecs, byChange),
      compliance: firstPassArm(complianceSpecs, byChange),
      baseline05: baseline05Arm(specs),
    },
  };
}
