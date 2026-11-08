import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const setup = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'setup.js');
const run = (cwd) =>
  execFileSync(process.execPath, [setup], { cwd, encoding: 'utf8' }).replace(/\x1b\[[0-9;]*m/g, '');

describe('setup.js — reinstalación', () => {
  it('avisa cómo actualizar si la skill instalada es de otra versión, sin tocarla', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rueditas-setup-'));
    run(dir);
    const skill = path.join(dir, '.claude/skills/rueditas/SKILL.md');
    fs.writeFileSync(skill, 'version anterior');

    const out = run(dir);

    expect(out).toMatch(/no coincide con esta versión \(1 archivo\(s\) distintos: rueditas\/SKILL\.md\)/);
    expect(out).toContain('borra .claude/skills/rueditas/ y corre npx @devground/rueditas');
    expect(out).not.toContain('Already up to date');
    expect(fs.readFileSync(skill, 'utf8')).toBe('version anterior');
  });

  it('dice que está al día si nada cambió', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rueditas-setup-'));
    run(dir);

    const out = run(dir);

    expect(out).toContain('Already up to date');
    expect(out).not.toMatch(/no coincide/);
  });
});
