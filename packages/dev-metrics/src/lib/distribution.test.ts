import { describe, it, expect } from 'vitest';
import { touchDistribution, bump } from './distribution.js';

describe('touchDistribution', () => {
  it('computes one-shot vs heavy distribution', () => {
    const counts = new Map<string, number>([
      ['a', 1],
      ['b', 1],
      ['c', 5],
      ['d', 6],
    ]);
    const d = touchDistribution(counts, 5);
    expect(d.files).toBe(4);
    expect(d.oneShot).toBe(2);
    expect(d.heavy).toBe(2);
    expect(d.oneShotPct).toBe(50);
    expect(d.heavyPct).toBe(50);
    expect(d.opsPerFile).toBeCloseTo((1 + 1 + 5 + 6) / 4, 10);
  });

  it('uses a configurable heavy threshold', () => {
    const counts = new Map<string, number>([['a', 4]]);
    expect(touchDistribution(counts, 4).heavy).toBe(1);
    expect(touchDistribution(counts, 5).heavy).toBe(0);
  });

  it('handles an empty map without dividing by zero', () => {
    const d = touchDistribution(new Map(), 4);
    expect(d.files).toBe(0);
    expect(d.oneShotPct).toBe(0);
    expect(d.opsPerFile).toBe(0);
  });
});

describe('bump', () => {
  it('initializes and increments', () => {
    const m = new Map<string, number>();
    bump(m, 'x');
    bump(m, 'x');
    bump(m, 'y', 3);
    expect(m.get('x')).toBe(2);
    expect(m.get('y')).toBe(3);
  });
});
