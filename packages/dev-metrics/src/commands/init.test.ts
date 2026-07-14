import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInit } from './init.js';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'devmetrics-init-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('runInit — existing config', () => {
  it('aborts with an actionable, printable reason when the config exists and --force is absent', () => {
    const configPath = join(dir, 'dev-metrics.config.json');
    writeFileSync(configPath, '{}', 'utf-8');
    const result = runInit({ configPath, force: false });
    expect(result.written).toBe(false);
    expect(result.warnings.some((w) => /already exists/.test(w) && /--force/.test(w))).toBe(true);
  });
});
