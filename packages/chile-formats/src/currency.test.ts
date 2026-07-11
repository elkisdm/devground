import { describe, expect, it } from 'vitest';
import { formatCLP, formatNumber, formatUF } from './currency.js';

describe('formatCLP', () => {
  it('formats CLP with thousands separator and no decimals', () => {
    expect(formatCLP(1234567)).toBe('$1.234.567');
    expect(formatCLP(1000)).toBe('$1.000');
    expect(formatCLP(0)).toBe('$0');
  });

  it('handles negative values without asserting sign placement (ICU-dependent)', () => {
    expect(formatCLP(-5000)).toContain('5.000');
    expect(formatCLP(-5000)).toContain('-');
  });
});

describe('formatNumber', () => {
  it('formats numbers in es-CL locale', () => {
    expect(formatNumber(1234567)).toBe('1.234.567');
    expect(formatNumber(1234567.89)).toBe('1.234.567,89');
  });
});

describe('formatUF', () => {
  it('formats UF with 2 decimals', () => {
    expect(formatUF(39876.54)).toBe('UF 39.876,54');
  });
});
