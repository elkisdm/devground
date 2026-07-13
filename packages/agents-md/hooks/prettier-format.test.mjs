import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { shouldFormat } from './prettier-format.mjs';
import { runHook, editPayload } from './run-hook.test-helper.mjs';

let dir;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-prettier-'));
});

describe('shouldFormat', () => {
  it.each(['/app/a.ts', '/app/a.md', '/app/a.json', '/app/a.css'])('formats %s', (file) => {
    expect(shouldFormat(file)).toBe(true);
  });

  it.each(['/app/a.png', '/app/node_modules/x/a.ts'])('skips %s', (file) => {
    expect(shouldFormat(file)).toBe(false);
  });
});

// Un prettier falso que registra sus argumentos fija el contrato sin depender
// del binario real.
function installFakePrettier(root) {
  const bin = path.join(root, 'node_modules', '.bin');
  fs.mkdirSync(bin, { recursive: true });
  const argsLog = path.join(root, 'prettier-args.json');
  const script = path.join(bin, 'prettier');
  fs.writeFileSync(
    script,
    `#!/usr/bin/env node\nrequire('node:fs').writeFileSync(${JSON.stringify(argsLog)}, JSON.stringify(process.argv.slice(2)));\n`,
  );
  fs.chmodSync(script, 0o755);
  return argsLog;
}

describe('proceso completo (entrada → exit code)', () => {
  it('invoca prettier --write sobre el archivo editado y sale 0', async () => {
    const argsLog = installFakePrettier(dir);
    const file = path.join(dir, 'a.ts');
    fs.writeFileSync(file, 'export const a=1\n');

    const { code } = await runHook('prettier-format.mjs', editPayload(file));
    expect(code).toBe(0);
    const args = JSON.parse(fs.readFileSync(argsLog, 'utf8'));
    expect(args).toEqual(['--write', '--ignore-unknown', file]);
  });

  it('exit 0 sin prettier en el proyecto (no invoca nada)', async () => {
    const file = path.join(dir, 'a.ts');
    fs.writeFileSync(file, 'export const a = 1;\n');
    expect((await runHook('prettier-format.mjs', editPayload(file))).code).toBe(0);
  });

  it('exit 0 con el kill switch activo (no invoca prettier)', async () => {
    const argsLog = installFakePrettier(dir);
    const file = path.join(dir, 'a.ts');
    fs.writeFileSync(file, 'export const a=1\n');

    const result = await runHook('prettier-format.mjs', editPayload(file), {
      env: { DEVGROUND_HOOKS_DISABLE: 'prettier' },
    });
    expect(result.code).toBe(0);
    expect(fs.existsSync(argsLog)).toBe(false);
  });
});
