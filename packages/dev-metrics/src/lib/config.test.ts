import { describe, it, expect } from 'vitest';
import { normalizeConfig, resolveList } from './config.js';

describe('normalizeConfig', () => {
  it('fills empty arrays for a bare object', () => {
    const c = normalizeConfig({});
    expect(c).toEqual({ repos: [], identities: [] });
  });

  it('keeps repos, identities, baseDir, excludes and events', () => {
    const c = normalizeConfig({
      repos: ['/a', '/b'],
      identities: ['me@x.com'],
      baseDir: '/home/me/Documents',
      excludes: ['vendor'],
      events: [{ date: '2026-05-01', label: 'x' }],
    });
    expect(c.repos).toEqual(['/a', '/b']);
    expect(c.identities).toEqual(['me@x.com']);
    expect(c.baseDir).toBe('/home/me/Documents');
    expect(c.excludes).toEqual(['vendor']);
    expect(c.events).toEqual([{ date: '2026-05-01', label: 'x' }]);
  });

  it('drops non-string entries and malformed events', () => {
    const c = normalizeConfig({
      repos: ['/a', 42, '', '  '],
      events: [{ date: '2026-05-01' }, { label: 'no-date' }, { date: '2026-05-02', label: 'ok' }],
    });
    expect(c.repos).toEqual(['/a']);
    expect(c.events).toEqual([{ date: '2026-05-02', label: 'ok' }]);
  });
});

describe('resolveList (precedence flags > config > auto)', () => {
  it('uses the flag when present', () => {
    const r = resolveList(['/flag'], ['/config'], () => ['/auto']);
    expect(r).toEqual({ value: ['/flag'], source: 'flag' });
  });

  it('falls back to config when no flag', () => {
    const r = resolveList(undefined, ['/config'], () => ['/auto']);
    expect(r).toEqual({ value: ['/config'], source: 'config' });
  });

  it('falls back to auto when neither flag nor config', () => {
    const r = resolveList(undefined, undefined, () => ['/auto']);
    expect(r).toEqual({ value: ['/auto'], source: 'auto' });
  });

  it('treats an empty flag/config as not-provided', () => {
    const r = resolveList([], [], () => ['/auto']);
    expect(r.source).toBe('auto');
  });

  it('does not invoke auto when an earlier source wins', () => {
    let called = false;
    resolveList(['/flag'], undefined, () => {
      called = true;
      return [];
    });
    expect(called).toBe(false);
  });
});
