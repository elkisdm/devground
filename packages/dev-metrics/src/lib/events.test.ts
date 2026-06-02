import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  validateEvent,
  readEvents,
  addEvent,
  sortEvents,
  eventsInPeriod,
} from './events.js';

let tmpDir: string;
let eventsFile: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'devmetrics-events-'));
  eventsFile = join(tmpDir, 'nested', 'events.json');
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('validateEvent', () => {
  it('accepts an ISO date and non-empty label', () => {
    expect(() => validateEvent({ date: '2026-05-14', label: 'adopted eslint' })).not.toThrow();
  });

  it('rejects a non-ISO date', () => {
    expect(() => validateEvent({ date: '14/05/2026', label: 'x' })).toThrow(/YYYY-MM-DD/);
  });

  it('rejects an empty label', () => {
    expect(() => validateEvent({ date: '2026-05-14', label: '  ' })).toThrow(/label/);
  });
});

describe('readEvents / addEvent', () => {
  it('returns [] when the file does not exist', () => {
    expect(readEvents(eventsFile)).toEqual([]);
  });

  it('creates parent dirs and persists events sorted by date', () => {
    addEvent(eventsFile, { date: '2026-05-20', label: 'b' });
    addEvent(eventsFile, { date: '2026-05-10', label: 'a' });
    const events = readEvents(eventsFile);
    expect(events.map((e) => e.label)).toEqual(['a', 'b']);
  });
});

describe('sortEvents', () => {
  it('orders ascending by date', () => {
    const sorted = sortEvents([
      { date: '2026-03-01', label: 'c' },
      { date: '2026-01-01', label: 'a' },
      { date: '2026-02-01', label: 'b' },
    ]);
    expect(sorted.map((e) => e.label)).toEqual(['a', 'b', 'c']);
  });
});

describe('eventsInPeriod', () => {
  const events = [
    { date: '2026-01-01', label: 'a' },
    { date: '2026-03-15', label: 'b' },
    { date: '2026-06-01', label: 'c' },
  ];

  it('filters inclusive of both bounds', () => {
    expect(eventsInPeriod(events, '2026-03-15', '2026-06-01').map((e) => e.label)).toEqual(['b', 'c']);
  });

  it('treats null bounds as open', () => {
    expect(eventsInPeriod(events, null, null)).toHaveLength(3);
    expect(eventsInPeriod(events, null, '2026-01-01').map((e) => e.label)).toEqual(['a']);
  });
});
