import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { EventAnnotation } from '../types.js';

/**
 * Event annotations let us tag the timeline with adoptions of standards or
 * tools (e.g. "adopted @devground/eslint-config on 2026-05-14"). `diff` uses
 * these to separate a transition wave from steady-state regime — see
 * ADR-0006 caveat 4: adopting a standard temporarily inflates rework and
 * tokens/commit, which is transition cost, not degradation.
 */

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Validates an annotation has an ISO date and a non-empty label. */
export function validateEvent(event: EventAnnotation): void {
  if (!ISO_DATE_RE.test(event.date)) {
    throw new Error(`Event date must be YYYY-MM-DD, got "${event.date}"`);
  }
  if (event.label.trim() === '') {
    throw new Error('Event label must not be empty');
  }
}

/** Type guard: a well-formed annotation with an ISO date and non-empty label. */
export function isValidEvent(value: unknown): value is EventAnnotation {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const e = value as Record<string, unknown>;
  if (typeof e.date !== 'string' || !ISO_DATE_RE.test(e.date)) return false;
  if (typeof e.label !== 'string' || e.label.trim() === '') return false;
  return true;
}

/**
 * Reads the events file, returning `[]` when it does not exist. Rows that are
 * not well-formed (missing/invalid date or label — e.g. hand-edited entries)
 * are dropped rather than passed through, so undefined dates/labels never
 * reach the timeline.
 */
export function readEvents(filePath: string): EventAnnotation[] {
  if (!existsSync(filePath)) return [];
  const raw = readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`Events file ${filePath} is not a JSON array`);
  }
  return parsed.filter(isValidEvent);
}

/** Sorts events ascending by date (stable for equal dates). */
export function sortEvents(events: readonly EventAnnotation[]): EventAnnotation[] {
  return [...events].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** Appends an event to the file, creating parent dirs as needed. */
export function addEvent(filePath: string, event: EventAnnotation): EventAnnotation[] {
  validateEvent(event);
  const events = readEvents(filePath);
  events.push(event);
  const sorted = sortEvents(events);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf-8');
  return sorted;
}

/** Returns events whose date falls within [since, until] (inclusive, null = open). */
export function eventsInPeriod(
  events: readonly EventAnnotation[],
  since: string | null,
  until: string | null,
): EventAnnotation[] {
  return events.filter((e) => {
    if (since !== null && e.date < since) return false;
    if (until !== null && e.date > until) return false;
    return true;
  });
}
