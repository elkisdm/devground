import { describe, expect, it } from 'vitest';
import { cleanRut, computeDv, formatRut, isValidRut } from './rut.js';

describe('isValidRut', () => {
  it('accepts valid RUTs', () => {
    expect(isValidRut('11.111.111-1')).toBe(true);
    expect(isValidRut('12.345.678-5')).toBe(true);
    expect(isValidRut('1.000.005-K')).toBe(true);
    expect(isValidRut('1.000.005-k')).toBe(true);
  });

  it('rejects invalid RUTs', () => {
    expect(isValidRut('12.345.678-9')).toBe(false);
    expect(isValidRut('')).toBe(false);
    expect(isValidRut('1')).toBe(false);
  });
});

describe('cleanRut', () => {
  it('strips dots, dash and spaces, uppercases dv', () => {
    expect(cleanRut('12.345.678-5')).toBe('123456785');
    expect(cleanRut(' 12345678-k ')).toBe('12345678K');
  });
});

describe('computeDv', () => {
  it('computes the module-11 check digit', () => {
    expect(computeDv('12345678')).toBe('5');
    expect(computeDv('11111111')).toBe('1');
    expect(computeDv('1000005')).toBe('K');
  });
});

describe('formatRut', () => {
  it('formats with dots and dash', () => {
    expect(formatRut('123456785')).toBe('12.345.678-5');
    expect(formatRut('1000005K')).toBe('1.000.005-K');
  });
});
