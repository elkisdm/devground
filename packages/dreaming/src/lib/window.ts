import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DreamState } from '../types.js';

/** Loads `<memory>/.dream/state.json`, or {} if absent/unreadable. */
export function loadState(memDir: string): DreamState {
  const p = join(memDir, '.dream', 'state.json');
  if (!existsSync(p)) return {};
  try {
    const parsed = JSON.parse(readFileSync(p, 'utf-8')) as unknown;
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as DreamState;
  } catch {
    return {};
  }
}

export interface WindowOptions {
  days: number;
  since: string; // 'last' | ISO date | ''
  forceDays: boolean;
  now: Date;
}

/**
 * Computes the inclusive lower bound for session selection. Pure (takes `now`).
 *  - forceDays        → now - days
 *  - since = ISO date → that date
 *  - since = 'last'   → last_dream_ts from state, else now - days
 */
export function windowStart(state: DreamState, opts: WindowOptions): Date {
  const { days, since, forceDays, now } = opts;
  const fallback = new Date(now.getTime() - days * 86_400_000);
  if (forceDays) return fallback;
  if (since && since !== 'last') {
    const t = new Date(since);
    if (!Number.isNaN(t.getTime())) return t;
  }
  if (since === 'last' || since === '') {
    const last = state.last_dream_ts;
    if (last) {
      const t = new Date(last);
      if (!Number.isNaN(t.getTime())) return t;
    }
  }
  return fallback;
}

/** Convenience: resolve the window straight from a memory dir. */
export function resolveWindow(memDir: string, opts: WindowOptions): Date {
  return windowStart(loadState(memDir), opts);
}
