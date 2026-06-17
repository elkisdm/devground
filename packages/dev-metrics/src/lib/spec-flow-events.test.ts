import { describe, it, expect } from 'vitest';
import {
  parseSpecFlowEvents,
  rolloutDate,
  frictionByTier,
} from './spec-flow-events.js';

const LINE = (o: Record<string, unknown>) => JSON.stringify(o);

const ev = (over: Record<string, unknown> = {}) => ({
  ts: '2026-06-09T22:52:52-0400',
  date: '2026-06-09',
  change: 'a-change',
  tier: 2,
  type: 'feat',
  size: 'medium',
  risk: 'high',
  uncertainty: 'known',
  files: ['src/a.ts'],
  questions_asked: 0,
  brief: 'inline',
  codemap_used: true,
  spec_flow_version: '0.2',
  ...over,
});

describe('parseSpecFlowEvents', () => {
  it('parses one object per line and maps snake_case to camelCase', () => {
    const text = [LINE(ev()), LINE(ev({ date: '2026-06-10', codemap_used: false }))].join('\n');
    const events = parseSpecFlowEvents(text);
    expect(events).toHaveLength(2);
    expect(events[0].questionsAsked).toBe(0);
    expect(events[0].codemapUsed).toBe(true);
    expect(events[1].codemapUsed).toBe(false);
  });

  it('skips blank and malformed lines instead of throwing', () => {
    const text = ['', LINE(ev()), '{ not valid json', '   ', LINE(ev({ date: '2026-06-11' }))].join('\n');
    expect(parseSpecFlowEvents(text)).toHaveLength(2);
  });

  it('drops a line with no date (unusable for segmentation)', () => {
    const text = [LINE(ev({ date: undefined })), LINE(ev())].join('\n');
    expect(parseSpecFlowEvents(text)).toHaveLength(1);
  });

  it('defaults missing/typed-wrong fields defensively', () => {
    const text = LINE({ date: '2026-06-09', files: 'not-an-array', questions_asked: 'three' });
    const [e] = parseSpecFlowEvents(text);
    expect(e.files).toEqual([]);
    expect(e.questionsAsked).toBe(0);
    expect(e.type).toBe('other');
  });
});

describe('rolloutDate', () => {
  it('returns the earliest date', () => {
    const events = parseSpecFlowEvents(
      [LINE(ev({ date: '2026-06-09' })), LINE(ev({ date: '2026-06-04' })), LINE(ev({ date: '2026-06-12' }))].join('\n'),
    );
    expect(rolloutDate(events)).toBe('2026-06-04');
  });

  it('returns null for no events', () => {
    expect(rolloutDate([])).toBeNull();
  });
});

describe('frictionByTier', () => {
  it('averages questionsAsked within each tier', () => {
    const events = parseSpecFlowEvents(
      [
        LINE(ev({ tier: 1, questions_asked: 0 })),
        LINE(ev({ tier: 3, questions_asked: 2 })),
        LINE(ev({ tier: 3, questions_asked: 4 })),
      ].join('\n'),
    );
    const f = frictionByTier(events);
    expect(f[1]).toBe(0);
    expect(f[3]).toBe(3);
  });
});
