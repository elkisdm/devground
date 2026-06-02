import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveCollectInputs } from './resolve.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'devmetrics-resolve-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function writeConfig(obj: unknown): string {
  const path = join(dir, 'dev-metrics.config.json');
  writeFileSync(path, JSON.stringify(obj), 'utf-8');
  return path;
}

describe('resolveCollectInputs', () => {
  it('flags win over config and auto-detection', () => {
    const configPath = writeConfig({ repos: ['/c'], identities: ['c@x.com'] });
    const r = resolveCollectInputs({
      flags: { repos: ['/flag'], emails: ['flag@x.com'] },
      configPath,
      discover: () => ['/auto'],
      infer: () => ['auto@x.com'],
    });
    expect(r.repos).toEqual(['/flag']);
    expect(r.identities).toEqual(['flag@x.com']);
    expect(r.reposSource).toBe('flag');
    expect(r.identitiesSource).toBe('flag');
  });

  it('config fills fields the flags omit', () => {
    const configPath = writeConfig({ repos: ['/c'], identities: ['c@x.com'] });
    const r = resolveCollectInputs({
      flags: { repos: ['/flag'] }, // emails omitted
      configPath,
      discover: () => ['/auto'],
      infer: () => ['auto@x.com'],
    });
    expect(r.repos).toEqual(['/flag']);
    expect(r.reposSource).toBe('flag');
    expect(r.identities).toEqual(['c@x.com']);
    expect(r.identitiesSource).toBe('config');
  });

  it('auto-detects when neither flag nor config provides a field', () => {
    const r = resolveCollectInputs({
      flags: {},
      configPath: join(dir, 'missing.json'), // no config file
      discover: () => ['/auto-repo'],
      infer: (repos) => (repos.length > 0 ? ['auto@x.com'] : []),
    });
    expect(r.repos).toEqual(['/auto-repo']);
    expect(r.reposSource).toBe('auto');
    expect(r.identities).toEqual(['auto@x.com']);
    expect(r.identitiesSource).toBe('auto');
  });

  it('warns when nothing resolves', () => {
    const r = resolveCollectInputs({
      flags: {},
      configPath: join(dir, 'missing.json'),
      discover: () => [],
      infer: () => [],
    });
    expect(r.repos).toEqual([]);
    expect(r.identities).toEqual([]);
    expect(r.warnings.length).toBeGreaterThanOrEqual(2);
  });
});
