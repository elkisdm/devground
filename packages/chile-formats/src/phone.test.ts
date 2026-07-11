import { describe, expect, it } from 'vitest';
import { formatPhone, normalizePhone } from './phone.js';

describe('formatPhone', () => {
  it('formats to "+56 9 XXXX XXXX"', () => {
    expect(formatPhone('912345678')).toBe('+56 9 1234 5678');
    expect(formatPhone('+56912345678')).toBe('+56 9 1234 5678');
    expect(formatPhone('56 9 1234 5678')).toBe('+56 9 1234 5678');
  });

  it('is tolerant of unrecognized input', () => {
    expect(formatPhone('123')).toBe('123');
  });
});

describe('normalizePhone', () => {
  it('normalizes to "+569XXXXXXXX"', () => {
    expect(normalizePhone('+56 9 1234 5678')).toBe('+56912345678');
    expect(normalizePhone('912345678')).toBe('+56912345678');
  });
});
