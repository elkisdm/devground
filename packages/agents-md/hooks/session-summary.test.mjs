import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildEntry, appendEntry, LOG_RELATIVE_PATH } from './session-summary.mjs';
import { runHook } from './run-hook.test-helper.mjs';

let dir;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-session-'));
});

describe('buildEntry', () => {
  it('captures session id, timestamp and transcript path', () => {
    const now = new Date('2026-07-13T10:00:00Z');
    const entry = buildEntry(
      { session_id: 's-1', transcript_path: '/t/s-1.jsonl' },
      now,
    );
    expect(entry).toEqual({
      sessionId: 's-1',
      endedAt: '2026-07-13T10:00:00.000Z',
      transcriptPath: '/t/s-1.jsonl',
    });
  });

  it('returns null without a session id', () => {
    expect(buildEntry({})).toBe(null);
    expect(buildEntry(null)).toBe(null);
  });
});

describe('appendEntry', () => {
  it('trims the log to the newest entries past the cap', () => {
    const logPath = path.join(dir, LOG_RELATIVE_PATH);
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    const old = Array.from({ length: 1000 }, (_, i) => JSON.stringify({ sessionId: `s-${i}` }));
    fs.writeFileSync(logPath, `${old.join('\n')}\n`);

    appendEntry(dir, { sessionId: 'newest' });

    const lines = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
    expect(lines).toHaveLength(500);
    expect(JSON.parse(lines.at(-1)).sessionId).toBe('newest');
  });
});

describe('proceso completo (entrada → exit code / archivo)', () => {
  it('exit 0 y registra la sesión en sessions.jsonl', async () => {
    const payload = {
      hook_event_name: 'Stop',
      session_id: 's-42',
      transcript_path: '/transcripts/s-42.jsonl',
      cwd: dir,
    };

    const { code } = await runHook('session-summary.mjs', payload);
    expect(code).toBe(0);

    const lines = fs
      .readFileSync(path.join(dir, LOG_RELATIVE_PATH), 'utf8')
      .split('\n')
      .filter(Boolean);
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]);
    expect(entry.sessionId).toBe('s-42');
    expect(entry.transcriptPath).toBe('/transcripts/s-42.jsonl');
  });

  it('exit 0 con stdin inválido y sin session_id (no escribe nada)', async () => {
    expect((await runHook('session-summary.mjs', 'not-json', { cwd: dir })).code).toBe(0);
    expect((await runHook('session-summary.mjs', { cwd: dir }, { cwd: dir })).code).toBe(0);
    expect(fs.existsSync(path.join(dir, LOG_RELATIVE_PATH))).toBe(false);
  });

  it('exit 0 con el kill switch activo', async () => {
    const payload = { hook_event_name: 'Stop', session_id: 's-1', cwd: dir };
    const result = await runHook('session-summary.mjs', payload, {
      env: { DEVGROUND_HOOKS_DISABLE: 'session-summary' },
    });
    expect(result.code).toBe(0);
    expect(fs.existsSync(path.join(dir, LOG_RELATIVE_PATH))).toBe(false);
  });
});
