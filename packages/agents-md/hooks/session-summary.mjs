#!/usr/bin/env node
// Stop — append a one-line session marker to .claude/devground/sessions.jsonl.
// Token-free by design: it records WHERE the transcript lives, not what it
// says. @devground/dreaming uses these markers to window which sessions to
// consolidate without re-scanning the whole transcript directory.
//
// Always exits 0: a Stop hook that exits 2 would block the session from
// ending, which this hook must never do.

import fs from 'node:fs';
import path from 'node:path';
import { isDisabled, readStdinJson, isMain } from './lib/common.mjs';

export const HOOK_NAME = 'session-summary';
export const LOG_RELATIVE_PATH = path.join('.claude', 'devground', 'sessions.jsonl');

// Keep the log bounded: above MAX_LINES entries, trim to the newest KEEP_LINES.
const MAX_LINES = 1000;
const KEEP_LINES = 500;

export function buildEntry(input, now = new Date()) {
  if (!input?.session_id) return null;
  return {
    sessionId: input.session_id,
    endedAt: now.toISOString(),
    transcriptPath: input.transcript_path ?? null,
  };
}

export function appendEntry(projectDir, entry) {
  const logPath = path.join(projectDir, LOG_RELATIVE_PATH);
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, `${JSON.stringify(entry)}\n`);

  const lines = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
  if (lines.length > MAX_LINES) {
    fs.writeFileSync(logPath, `${lines.slice(-KEEP_LINES).join('\n')}\n`);
  }
  return logPath;
}

export async function main() {
  if (isDisabled(HOOK_NAME)) return 0;
  try {
    const input = await readStdinJson();
    const entry = buildEntry(input);
    if (!entry) return 0;
    appendEntry(input.cwd ?? process.cwd(), entry);
  } catch {
    // Never block a session over bookkeeping.
  }
  return 0;
}

if (isMain(import.meta.url)) {
  main().then((code) => process.exit(code));
}
