import { existsSync, readFileSync } from 'node:fs';
import { median } from './stats.js';

/**
 * Reader for spec-flow's per-change telemetry (`<repo>/.spec-flow/events.jsonl`).
 *
 * This is a DIFFERENT artifact from dev-metrics' own `EventAnnotation` (a
 * timeline marker of date+label). A spec-flow event is one line per change,
 * appended by the spec-flow skill (Step 6), carrying the labels git cannot know:
 * the tier, the classification axes, and the friction gauge (`questions_asked`).
 * It is append-only JSONL and is committed alongside the change, which is what
 * gives us a direct event<->commit link.
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
  /** Friction gauge — should be ~0 under the Prime Directive. */
  questionsAsked: number;
  /** `"inline"` or a path to the persisted brief. */
  brief: string;
  /** Whether Step 0 found and read a code map. */
  codemapUsed: boolean;
  specFlowVersion: string;
  /** DoD compliance for tests: "added"|"updated"|"n/a"|"deferred". Optional, backward-compatible. */
  tests?: string;
  /**
   * Closing review gate (spec-flow 0.5+, ADR-0036/ADR-0037). `undefined` on older
   * events and on `"n/a"`; otherwise the level that ran plus whichever of the
   * 0.6 fields (`passes`, `findingsCapped`, `induced`, `redesigned`) the event
   * carries.
   *
   * `findings` is the gauge the other two can't give: whether the changes are
   * getting cleaner over time. `findings > resolved` is debt left open.
   * `findings`/`resolved` are optional and `undefined` (never `0`) when missing
   * or malformed — see `optNum`.
   */
  review?: SpecFlowReview;
  /** Whether the spec had a pre-mortem (0.6, Tier 2+). `undefined` for absent/`"n/a"`. */
  premortem?: boolean;
  /** Design-gate outcome (0.6, Tier 2+ Step 3.6). `undefined` for absent/`"n/a"`. */
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

interface RawEvent {
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
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/**
 * Strict numeric parse for fields where `0` is not a safe fallback — a censored
 * or omitted count must not silently read as zero. Returns `undefined` for
 * anything that isn't already a finite `number`, INCLUDING numeric strings like
 * `"10"`: an agent that writes `"10"` instead of `10` is dirty data, not a
 * format to coerce quietly. `num()` above stays in place for fields where `0`
 * really is a reasonable fallback (tier, questions_asked).
 */
function optNum(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function optBool(v: unknown): boolean | undefined {
  return typeof v === 'boolean' ? v : undefined;
}

/**
 * Normalizes the `review` field. Tolerates the three shapes it takes in the wild:
 * absent (events written before spec-flow 0.5), the string `"n/a"`, or the object.
 * Anything else is treated as absent rather than crashing the parse — one malformed
 * line must never take down a whole metrics run.
 *
 * `findings`/`resolved` use `optNum`, not `num`: a real event from Capitalacademy
 * carries `"findings":"pending"`, which used to silently become `0` (ADR-0036's
 * bug) and must instead read as "unknown", not "zero findings".
 */
function normalizeReview(v: unknown): SpecFlowReview | undefined {
  if (v === null || v === undefined || typeof v === 'string') return undefined;
  if (typeof v !== 'object') return undefined;
  const raw = v as {
    level?: unknown;
    findings?: unknown;
    resolved?: unknown;
    passes?: unknown;
    findings_capped?: unknown;
    induced?: unknown;
    redesigned?: unknown;
  };
  const level = str(raw.level);
  if (level === '') return undefined;
  return {
    level,
    findings: optNum(raw.findings),
    resolved: optNum(raw.resolved),
    passes: optNum(raw.passes),
    findingsCapped: optBool(raw.findings_capped),
    induced: optNum(raw.induced),
    redesigned: optBool(raw.redesigned),
  };
}

/** Normalizes `premortem`: only a real boolean counts; `"n/a"`/absent/anything else is `undefined`. */
function normalizePremortem(v: unknown): boolean | undefined {
  return optBool(v);
}

/** Normalizes `spec_review`: absent, `"n/a"`, or non-object all become `undefined`. */
function normalizeSpecReview(v: unknown): { gapsFound?: number; gapsAdopted?: number } | undefined {
  if (v === null || v === undefined || typeof v === 'string') return undefined;
  if (typeof v !== 'object') return undefined;
  const raw = v as { gaps_found?: unknown; gaps_adopted?: unknown };
  return { gapsFound: optNum(raw.gaps_found), gapsAdopted: optNum(raw.gaps_adopted) };
}

/** Normalizes one parsed JSON object into a `SpecFlowEvent`, or null if it has no date. */
function normalize(raw: RawEvent): SpecFlowEvent | null {
  const date = str(raw.date);
  if (date === '') return null; // a line with no date is unusable for segmentation
  const files = Array.isArray(raw.files)
    ? raw.files.filter((f): f is string => typeof f === 'string')
    : [];
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
    questionsAsked: num(raw.questions_asked),
    brief: str(raw.brief),
    codemapUsed: raw.codemap_used === true,
    specFlowVersion: str(raw.spec_flow_version),
    tests: str(raw.tests) || undefined,
    review: normalizeReview(raw.review),
    premortem: normalizePremortem(raw.premortem),
    specReview: normalizeSpecReview(raw.spec_review),
  };
}

/** Parses JSONL text into events, skipping blank and malformed lines. */
export function parseSpecFlowEvents(text: string): SpecFlowEvent[] {
  const events: SpecFlowEvent[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '') continue;
    let raw: RawEvent;
    try {
      raw = JSON.parse(trimmed) as RawEvent;
    } catch {
      continue; // tolerate a half-written or corrupted line
    }
    const event = normalize(raw);
    if (event) events.push(event);
  }
  return events;
}

/** Reads `<repo>/.spec-flow/events.jsonl`, returning `[]` when absent. */
export function readSpecFlowEvents(filePath: string): SpecFlowEvent[] {
  if (!existsSync(filePath)) return [];
  return parseSpecFlowEvents(readFileSync(filePath, 'utf-8'));
}

/** Earliest event date (the repo's spec-flow rollout), or null when there are none. */
export function rolloutDate(events: readonly SpecFlowEvent[]): string | null {
  let min: string | null = null;
  for (const e of events) {
    if (min === null || e.date < min) min = e.date;
  }
  return min;
}

/** Mean `questionsAsked` per tier — the friction gauge, segmented by ceremony. */
export function frictionByTier(events: readonly SpecFlowEvent[]): Record<number, number> {
  const sum: Record<number, number> = {};
  const count: Record<number, number> = {};
  for (const e of events) {
    sum[e.tier] = (sum[e.tier] ?? 0) + e.questionsAsked;
    count[e.tier] = (count[e.tier] ?? 0) + 1;
  }
  const out: Record<number, number> = {};
  for (const tier of Object.keys(count)) {
    const t = Number(tier);
    out[t] = sum[t] / count[t];
  }
  return out;
}

/** Mean of a numeric series, or `null` when empty. */
function mean(xs: readonly number[]): number | null {
  return xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length;
}

export interface ReviewLoopStats {
  /** Events carrying a `review` object — the denominator for everything below. */
  withReview: number;
  /** Median `review.passes` across events that report it, or `null` with no sample. */
  medianPasses: number | null;
  /** Share of those events with `passes <= 2` — did the loop close at the cap? */
  sharePassesAtMost2: number | null;
  /** Share of reviewed events where pass 1 hit the reviewer's finding cap. */
  cappedRate: number | null;
  /** Among events reporting `induced`, share with `induced > 0`. */
  inducedRate: number | null;
  /** Mean pass-1 `findings`, segmented by whether the spec had a pre-mortem. */
  firstPassFindings: { withPremortem: number | null; withoutPremortem: number | null };
}

/**
 * Aggregates the spec-flow 0.6 review-loop signals (ADR-0037): whether the
 * 2-pass cap is holding, how often the reviewer's cap censors pass-1 findings,
 * how often a closing pass induces new findings, and whether a pre-mortem
 * lowers pass-1 findings — the question that says if v0.6 worked.
 *
 * Each sub-metric has its own denominator, and an event without `review`
 * contributes to none of them:
 *  - `cappedRate` and `firstPassFindings` are shares/means OVER ALL reviewed
 *    events (`withReview`) — a field the event doesn't carry counts as "not
 *    capped" / "no sample", same as `cappedRate`'s own definition.
 *  - `medianPasses`/`sharePassesAtMost2` and `inducedRate` use only the events
 *    that report `passes`/`induced` respectively, since those fields are newer
 *    and not every 0.6 event will carry them yet.
 */
export function reviewLoopStats(events: readonly SpecFlowEvent[]): ReviewLoopStats {
  const reviewed = events.filter(
    (e): e is SpecFlowEvent & { review: SpecFlowReview } => e.review !== undefined,
  );
  const withReview = reviewed.length;

  const passes = reviewed.map((e) => e.review.passes).filter((p): p is number => p !== undefined);
  const medianPasses = median(passes);
  const sharePassesAtMost2 =
    passes.length > 0 ? passes.filter((p) => p <= 2).length / passes.length : null;

  const cappedRate =
    withReview > 0
      ? reviewed.filter((e) => e.review.findingsCapped === true).length / withReview
      : null;

  const withInduced = reviewed.filter((e) => e.review.induced !== undefined);
  const inducedRate =
    withInduced.length > 0
      ? withInduced.filter((e) => (e.review.induced as number) > 0).length / withInduced.length
      : null;

  const findingsWithPremortem = reviewed
    .filter((e) => e.premortem === true && e.review.findings !== undefined)
    .map((e) => e.review.findings as number);
  const findingsWithoutPremortem = reviewed
    .filter((e) => e.premortem === false && e.review.findings !== undefined)
    .map((e) => e.review.findings as number);

  return {
    withReview,
    medianPasses,
    sharePassesAtMost2,
    cappedRate,
    inducedRate,
    firstPassFindings: {
      withPremortem: mean(findingsWithPremortem),
      withoutPremortem: mean(findingsWithoutPremortem),
    },
  };
}
