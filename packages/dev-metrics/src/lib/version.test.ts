import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { readVersion } from './version.js';

describe('readVersion', () => {
  it('returns the version declared in package.json (single source of truth)', () => {
    const pkgRoot = process.cwd();
    const declared = (
      JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf-8')) as { version: string }
    ).version;
    expect(readVersion(pkgRoot)).toBe(declared);
    expect(readVersion(pkgRoot)).not.toBe('0.1.0');
  });
});
