import { existsSync, readFileSync } from 'node:fs';
import type {
  SpecFlowEvent,
  SpecFlowReview,
  ReviewEvent,
  ReversalEvent,
} from './spec-flow-types.js';

export type {
  SpecFlowEvent,
  SpecFlowReview,
  ReviewEvent,
  ReversalEvent,
} from './spec-flow-types.js';

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
 *
 * This module is the PARSER only (spec-flow-v06 ADR-0037, L-1..L-11 rewrite):
 * it normalizes raw JSONL into typed events. All cross-change aggregation
 * (joining specs to reviews, the review-loop stats) lives in
 * `./spec-flow-review-loop.js`.
 */

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
  assumptions?: unknown;
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

/** `passes` (L-2): a valid pass count is ≥ 1 — `0` is not a completed pass, it is unknown. */
function passesCount(v: unknown): number | undefined {
  const c = count(v);
  return c !== undefined && c >= 1 ? c : undefined;
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
 * `findings`/`resolved`/etc. use `count`, not a loose numeric parse: a real
 * event from Capitalacademy carries `"findings":"pending"`, which must read as
 * "unknown", not "zero findings".
 * Never emits a key with an explicit `undefined` value.
 */
function normalizeReview(v: unknown): SpecFlowReview | undefined {
  if (!isPlainObject(v)) return undefined;
  const level = str(v.level);
  if (level === '') return undefined;
  const findings = count(v.findings);
  const resolved = count(v.resolved);
  const passes = passesCount(v.passes);
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
  const assumptions = count(raw.assumptions);
  const review = normalizeReview(raw.review);
  const { premortem, premortemSkipped } = normalizePremortem(raw.premortem);
  const specReview = normalizeSpecReview(raw.spec_review);
  const tier = count(raw.tier);
  return {
    ts: str(raw.ts, date),
    date,
    change: str(raw.change),
    type: str(raw.type, 'other'),
    size: str(raw.size),
    risk: str(raw.risk),
    uncertainty: str(raw.uncertainty),
    files,
    brief: str(raw.brief),
    codemapUsed: raw.codemap_used === true,
    specFlowVersion: str(raw.spec_flow_version),
    ...(tier !== undefined ? { tier } : {}),
    ...(questionsAsked !== undefined ? { questionsAsked } : {}),
    ...(tests !== undefined ? { tests } : {}),
    ...(assumptions !== undefined ? { assumptions } : {}),
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
  const passes = passesCount(raw.passes);
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

/** Mean `questionsAsked` and sample size `n`, per tier — the friction gauge, segmented by ceremony. */
export interface TierFriction {
  mean: number;
  n: number;
}

/**
 * Events without a valid `questionsAsked` are excluded, never treated as 0.
 * Events without a valid `tier` (L-2: unparseable, never 0) are excluded from
 * the whole table — they must never render as a false "T0" row.
 */
export function frictionByTier(events: readonly SpecFlowEvent[]): Record<number, TierFriction> {
  const sum: Record<number, number> = {};
  const n: Record<number, number> = {};
  for (const e of events) {
    if (e.tier === undefined || e.questionsAsked === undefined) continue;
    sum[e.tier] = (sum[e.tier] ?? 0) + e.questionsAsked;
    n[e.tier] = (n[e.tier] ?? 0) + 1;
  }
  const out: Record<number, TierFriction> = {};
  for (const tier of Object.keys(n)) {
    const t = Number(tier);
    out[t] = { mean: sum[t]! / n[t]!, n: n[t]! };
  }
  return out;
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
