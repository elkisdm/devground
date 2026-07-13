import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { shouldTypecheck, filterDiagnostics } from './typecheck.mjs';
import { runHook, editPayload } from './run-hook.test-helper.mjs';

let dir;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-tsc-'));
});

describe('shouldTypecheck', () => {
  it.each(['/app/src/a.ts', '/app/src/b.tsx'])('checks %s', (file) => {
    expect(shouldTypecheck(file)).toBe(true);
  });

  it.each(['/app/src/a.d.ts', '/app/src/a.js', '/app/node_modules/x/a.ts'])(
    'skips %s',
    (file) => {
      expect(shouldTypecheck(file)).toBe(false);
    },
  );
});

describe('filterDiagnostics', () => {
  it('keeps real type errors, drops resolution noise', () => {
    const output = [
      "src/a.ts(3,5): error TS2322: Type 'string' is not assignable to type 'number'.",
      "src/a.ts(1,20): error TS2307: Cannot find module '@/lib/utils'.",
      "src/a.ts(2,1): error TS7016: Could not find a declaration file for module 'x'.",
      'not a diagnostic line',
    ].join('\n');

    const kept = filterDiagnostics(output);
    expect(kept).toHaveLength(1);
    expect(kept[0]).toContain('TS2322');
  });
});

// Un tsc falso en node_modules/.bin permite fijar el contrato del proceso
// (entrada → exit code / stderr) sin depender del tsc real ni de su latencia.
function installFakeTsc(root, { exitCode, output }) {
  const bin = path.join(root, 'node_modules', '.bin');
  fs.mkdirSync(bin, { recursive: true });
  const script = path.join(bin, 'tsc');
  fs.writeFileSync(
    script,
    `#!/usr/bin/env node\nprocess.stdout.write(${JSON.stringify(output)});\nprocess.exit(${exitCode});\n`,
  );
  fs.chmodSync(script, 0o755);
}

describe('proceso completo (entrada → exit code / stderr)', () => {
  it('exit 0 cuando el proyecto no tiene TypeScript', async () => {
    const file = path.join(dir, 'a.ts');
    fs.writeFileSync(file, 'export const a: number = 1;\n');
    expect((await runHook('typecheck.mjs', editPayload(file))).code).toBe(0);
  });

  it('exit 2 + diagnóstico real en stderr', async () => {
    const file = path.join(dir, 'a.ts');
    fs.writeFileSync(file, 'export const a: number = "x";\n');
    installFakeTsc(dir, {
      exitCode: 1,
      output: "a.ts(1,14): error TS2322: Type 'string' is not assignable to type 'number'.\n",
    });

    const { code, stderr } = await runHook('typecheck.mjs', editPayload(file));
    expect(code).toBe(2);
    expect(stderr).toContain('TS2322');
  });

  it('exit 0 cuando solo hay ruido de resolución (TS2307)', async () => {
    const file = path.join(dir, 'a.ts');
    fs.writeFileSync(file, "import { x } from '@/lib';\nexport const a = x;\n");
    installFakeTsc(dir, {
      exitCode: 1,
      output: "a.ts(1,19): error TS2307: Cannot find module '@/lib'.\n",
    });

    expect((await runHook('typecheck.mjs', editPayload(file))).code).toBe(0);
  });

  it('exit 0 con el kill switch activo', async () => {
    const file = path.join(dir, 'a.ts');
    fs.writeFileSync(file, 'export const a: number = "x";\n');
    installFakeTsc(dir, { exitCode: 1, output: 'a.ts(1,14): error TS2322: boom.\n' });

    const result = await runHook('typecheck.mjs', editPayload(file), {
      env: { DEVGROUND_HOOKS_DISABLE: 'typecheck' },
    });
    expect(result.code).toBe(0);
  });
});
