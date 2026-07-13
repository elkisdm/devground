import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { installHooks, HOOK_FILES } = require('../install-hooks.js');

const silent = { logFn: () => {}, warnFn: () => {} };

let dir;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-install-'));
});

describe('installHooks', () => {
  it('copia los scripts a .claude/hooks/devground/ y crea settings.json', () => {
    const { settingsWritten } = installHooks(dir, silent);
    expect(settingsWritten).toBe(true);

    for (const file of HOOK_FILES) {
      expect(fs.existsSync(path.join(dir, '.claude', 'hooks', 'devground', file))).toBe(true);
    }

    const settings = JSON.parse(fs.readFileSync(path.join(dir, '.claude', 'settings.json'), 'utf8'));
    expect(settings.hooks.PostToolUse[0].matcher).toBe('Edit|Write|MultiEdit');
    expect(settings.hooks.Stop).toHaveLength(1);
  });

  it('añade hooks a un settings.json existente sin pisar otras claves', () => {
    fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
    const settingsPath = path.join(dir, '.claude', 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify({ model: 'opus' }));

    const { settingsWritten } = installHooks(dir, silent);
    expect(settingsWritten).toBe(true);

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    expect(settings.model).toBe('opus');
    expect(settings.hooks).toBeDefined();
  });

  it('NO toca un settings.json que ya define hooks', () => {
    fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
    const settingsPath = path.join(dir, '.claude', 'settings.json');
    const original = JSON.stringify({ hooks: { Stop: [] } });
    fs.writeFileSync(settingsPath, original);

    const { settingsWritten } = installHooks(dir, silent);
    expect(settingsWritten).toBe(false);
    expect(fs.readFileSync(settingsPath, 'utf8')).toBe(original);
    // Los scripts sí se copian: el usuario mergea a mano desde hooks.json.
    expect(fs.existsSync(path.join(dir, '.claude', 'hooks', 'devground', 'hooks.json'))).toBe(true);
  });

  it('NO toca un settings.json inválido', () => {
    fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
    const settingsPath = path.join(dir, '.claude', 'settings.json');
    fs.writeFileSync(settingsPath, '{ not json');

    const { settingsWritten } = installHooks(dir, silent);
    expect(settingsWritten).toBe(false);
    expect(fs.readFileSync(settingsPath, 'utf8')).toBe('{ not json');
  });

  it('re-ejecutar actualiza los scripts del namespace propio', () => {
    installHooks(dir, silent);
    const script = path.join(dir, '.claude', 'hooks', 'devground', 'typecheck.mjs');
    fs.writeFileSync(script, '// stale');

    installHooks(dir, silent);
    expect(fs.readFileSync(script, 'utf8')).not.toBe('// stale');
  });
});
