import { describe, it, expect } from 'vitest';
import { netGrossRatio, pearson, rSquared, pct, safeRatio, round } from './stats.js';

describe('netGrossRatio', () => {
  it('returns 1 when nothing was deleted', () => {
    expect(netGrossRatio(100, 0)).toBe(1);
  });

  it('returns 0 when added equals deleted', () => {
    expect(netGrossRatio(50, 50)).toBe(0);
  });

  it('returns -1 when everything is a deletion', () => {
    expect(netGrossRatio(0, 100)).toBe(-1);
  });

  it('computes the partial ratio', () => {
    // (80 - 20) / (80 + 20) = 0.6
    expect(netGrossRatio(80, 20)).toBeCloseTo(0.6, 10);
  });

  it('returns 0 with no churn (avoids divide-by-zero)', () => {
    expect(netGrossRatio(0, 0)).toBe(0);
  });
});

describe('pearson', () => {
  it('returns 1 for a perfect positive linear relationship', () => {
    const r = pearson([1, 2, 3, 4], [2, 4, 6, 8]);
    expect(r).toBeCloseTo(1, 10);
  });

  it('returns -1 for a perfect negative relationship', () => {
    const r = pearson([1, 2, 3, 4], [8, 6, 4, 2]);
    expect(r).toBeCloseTo(-1, 10);
  });

  it('returns null for mismatched lengths', () => {
    expect(pearson([1, 2], [1])).toBeNull();
  });

  it('returns null with fewer than 2 points', () => {
    expect(pearson([1], [1])).toBeNull();
  });

  it('returns null when a series has zero variance', () => {
    expect(pearson([1, 1, 1], [1, 2, 3])).toBeNull();
  });

  it('matches a known moderate correlation', () => {
    // cov = 10, varX = 10, varY = 10 -> r = 10 / sqrt(100) = 0.8 (r^2 = 0.64)
    const r = pearson([1, 2, 3, 4, 5], [2, 1, 4, 3, 5]);
    expect(r).toBeCloseTo(0.8, 10);
  });
});

describe('rSquared', () => {
  it('is the square of pearson r', () => {
    const xs = [1, 2, 3, 4, 5];
    const ys = [2, 1, 4, 3, 5];
    const r = pearson(xs, ys) as number;
    expect(rSquared(xs, ys)).toBeCloseTo(r * r, 10);
  });

  it('returns 1 for a perfect line', () => {
    expect(rSquared([1, 2, 3], [3, 6, 9])).toBeCloseTo(1, 10);
  });

  it('returns null when correlation is undefined', () => {
    expect(rSquared([1, 1, 1], [1, 2, 3])).toBeNull();
  });
});

describe('pct / safeRatio / round', () => {
  it('pct computes a percentage', () => {
    expect(pct(1, 4)).toBe(25);
  });

  it('pct returns 0 on zero total', () => {
    expect(pct(3, 0)).toBe(0);
  });

  it('safeRatio returns null on zero denominator', () => {
    expect(safeRatio(5, 0)).toBeNull();
  });

  it('round trims to the requested decimals', () => {
    expect(round(0.123456, 2)).toBe(0.12);
    expect(round(0.123456)).toBe(0.1235);
  });
});
