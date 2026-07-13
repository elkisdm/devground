import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { shouldScan, findDebugCalls } from './console-log-warn.mjs';
import { runHook, editPayload } from './run-hook.test-helper.mjs';

let dir;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-console-'));
});

describe('shouldScan', () => {
  it('scans product source files', () => {
    expect(shouldScan('/app/src/service.ts')).toBe(true);
  });

  it.each([
    ['/app/src/service.test.ts', ''],
    ['/app/tests/setup.js', ''],
    ['/app/scripts/build.mjs', ''],
    ['/app/cli.js', '#!/usr/bin/env node'],
    ['/app/README.md', ''],
  ])('skips %s', (file, firstLine) => {
    expect(shouldScan(file, firstLine)).toBe(false);
  });
});

describe('findDebugCalls', () => {
  it('reports line numbers of console.log and console.debug', () => {
    const hits = findDebugCalls('const a = 1;\nconsole.log(a);\nconsole.error(a);\nconsole.debug(a);');
    expect(hits.map((hit) => hit.line)).toEqual([2, 4]);
  });
});

describe('proceso completo (entrada → exit code / stderr)', () => {
  it('exit 2 + stderr con la línea cuando hay console.log', async () => {
    const file = path.join(dir, 'service.ts');
    fs.writeFileSync(file, 'export function f() {\n  console.log("debug");\n}\n');

    const { code, stderr } = await runHook('console-log-warn.mjs', editPayload(file));
    expect(code).toBe(2);
    expect(stderr).toContain('L2');
    expect(stderr).toContain('Zero Dead Code');
  });

  it('exit 0 en archivo limpio', async () => {
    const file = path.join(dir, 'clean.ts');
    fs.writeFileSync(file, 'export const a = 1;\n');
    expect((await runHook('console-log-warn.mjs', editPayload(file))).code).toBe(0);
  });

  it('exit 0 con el kill switch activo', async () => {
    const file = path.join(dir, 'service.ts');
    fs.writeFileSync(file, 'console.log(1);\n');
    const result = await runHook('console-log-warn.mjs', editPayload(file), {
      env: { DEVGROUND_HOOKS_DISABLE: 'console-log' },
    });
    expect(result.code).toBe(0);
  });

  it('exit 0 con stdin inválido', async () => {
    expect((await runHook('console-log-warn.mjs', 'not-json')).code).toBe(0);
  });
});
