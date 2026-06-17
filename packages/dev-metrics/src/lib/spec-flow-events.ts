import { existsSync, readFileSync } from 'node:fs';

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
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/** Normalizes one parsed JSON object into a `SpecFlowEvent`, or null if it has no date. */
function normalize(raw: RawEvent): SpecFlowEvent | null {
  const date = str(raw.date);
  if (date === '') return null; // a line with no date is unusable for segmentation
  const files = Array.isArray(raw.files) ? raw.files.filter((f): f is string => typeof f === 'string') : [];
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
