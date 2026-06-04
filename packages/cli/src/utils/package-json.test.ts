import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readPackageJson, writePackageJson } from './package-json.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'devground-pkgjson-'));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('readPackageJson', () => {
  it('parses a valid package.json', () => {
    const content = { name: 'my-pkg', version: '1.0.0' };
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify(content));

    expect(readPackageJson(tmpDir)).toEqual(content);
  });

  it('preserves nested objects (dependencies, scripts)', () => {
    const content = {
      name: 'app',
      dependencies: { react: '^19.0.0' },
      scripts: { dev: 'next dev' },
    };
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify(content));

    const result = readPackageJson(tmpDir);

    expect(result.dependencies).toEqual({ react: '^19.0.0' });
    expect(result.scripts).toEqual({ dev: 'next dev' });
  });

  it('throws when package.json does not exist', () => {
    expect(() => readPackageJson(tmpDir)).toThrow();
  });

  it('throws when package.json is malformed JSON', () => {
    writeFileSync(join(tmpDir, 'package.json'), '{ not valid json');

    expect(() => readPackageJson(tmpDir)).toThrow();
  });

  it('throws a clear error when the JSON is an array', () => {
    writeFileSync(join(tmpDir, 'package.json'), '[]');

    expect(() => readPackageJson(tmpDir)).toThrow(
      'package.json is not a valid object (got array)',
    );
  });

  it('throws a clear error when the JSON is a scalar', () => {
    writeFileSync(join(tmpDir, 'package.json'), '42');

    expect(() => readPackageJson(tmpDir)).toThrow(
      'package.json is not a valid object (got number)',
    );
  });

  it('throws a clear error when the JSON is a string scalar', () => {
    writeFileSync(join(tmpDir, 'package.json'), '"x"');

    expect(() => readPackageJson(tmpDir)).toThrow(
      'package.json is not a valid object (got string)',
    );
  });

  it('throws a clear error when the JSON is null', () => {
    writeFileSync(join(tmpDir, 'package.json'), 'null');

    expect(() => readPackageJson(tmpDir)).toThrow(
      'package.json is not a valid object (got null)',
    );
  });
});

describe('writePackageJson', () => {
  it('writes a JSON object with 2-space indentation', () => {
    const data = { name: 'pkg', version: '1.0.0' };
    writePackageJson(tmpDir, data);

    const raw = readFileSync(join(tmpDir, 'package.json'), 'utf-8');

    expect(raw).toBe('{\n  "name": "pkg",\n  "version": "1.0.0"\n}\n');
  });

  it('terminates the file with a trailing newline', () => {
    writePackageJson(tmpDir, { name: 'pkg' });

    const raw = readFileSync(join(tmpDir, 'package.json'), 'utf-8');

    expect(raw.endsWith('\n')).toBe(true);
  });

  it('round-trips: write then read returns the same object', () => {
    const data = {
      name: 'app',
      scripts: { build: 'tsc' },
      dependencies: { react: '^19.0.0' },
    };
    writePackageJson(tmpDir, data);

    expect(readPackageJson(tmpDir)).toEqual(data);
  });
});
