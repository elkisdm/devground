import { describe, it, expect } from 'vitest';
import { windowStart } from './window.js';

const NOW = new Date('2026-07-07T00:00:00Z');

describe('windowStart', () => {
  it('forceDays ignores state and uses now - days', () => {
    const d = windowStart(
      { last_dream_ts: '2026-07-06T00:00:00Z' },
      { days: 30, since: 'last', forceDays: true, now: NOW },
    );
    expect(d.toISOString()).toBe('2026-06-07T00:00:00.000Z');
  });

  it('an explicit ISO since wins', () => {
    const d = windowStart({}, { days: 14, since: '2026-06-01', forceDays: false, now: NOW });
    expect(d.toISOString().slice(0, 10)).toBe('2026-06-01');
  });

  it("since 'last' uses last_dream_ts from state", () => {
    const d = windowStart(
      { last_dream_ts: '2026-07-05T12:00:00Z' },
      { days: 14, since: 'last', forceDays: false, now: NOW },
    );
    expect(d.toISOString()).toBe('2026-07-05T12:00:00.000Z');
  });

  it("since 'last' with no state falls back to now - days", () => {
    const d = windowStart({}, { days: 14, since: 'last', forceDays: false, now: NOW });
    expect(d.toISOString()).toBe('2026-06-23T00:00:00.000Z');
  });

  it('an unparseable since falls back to now - days', () => {
    const d = windowStart({}, { days: 7, since: 'garbage', forceDays: false, now: NOW });
    expect(d.toISOString()).toBe('2026-06-30T00:00:00.000Z');
  });
});
