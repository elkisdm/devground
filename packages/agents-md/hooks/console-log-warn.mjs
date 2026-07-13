#!/usr/bin/env node
// PostToolUse (Edit|Write|MultiEdit) — warn about console.log/console.debug
// left in the edited file. Makes AGENTS.md rule 5 (Zero Dead Code) executable:
// debug statements are dead code the moment the bug is fixed.
//
// Exit 2 feeds the warning back to the agent so it cleans up in-session.

import fs from 'node:fs';
import path from 'node:path';
import { isDisabled, readStdinJson, editedFilePath, isMain } from './lib/common.mjs';

export const HOOK_NAME = 'console-log';

const CODE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const SKIPPED_SEGMENTS = new Set(['node_modules', 'tests', '__tests__', 'scripts', 'demo', 'dist']);
const DEBUG_CALL = /console\.(log|debug)\s*\(/;

/** Files where console output is legitimate: tests, CLIs (shebang), tooling dirs. */
export function shouldScan(filePath, firstLine = '') {
  if (!CODE_EXTENSIONS.has(path.extname(filePath))) return false;
  const base = path.basename(filePath);
  if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(base)) return false;
  const segments = filePath.split(/[\\/]/);
  if (segments.some((segment) => SKIPPED_SEGMENTS.has(segment))) return false;
  if (firstLine.startsWith('#!')) return false;
  return true;
}

/** Returns [{line, text}] for every console.log/console.debug call. */
export function findDebugCalls(source) {
  const hits = [];
  source.split('\n').forEach((text, index) => {
    if (DEBUG_CALL.test(text)) hits.push({ line: index + 1, text: text.trim() });
  });
  return hits;
}

export async function main() {
  if (isDisabled(HOOK_NAME)) return 0;
  const input = await readStdinJson();
  const filePath = editedFilePath(input);
  if (!filePath || !fs.existsSync(filePath)) return 0;

  let source;
  try {
    source = fs.readFileSync(filePath, 'utf8');
  } catch {
    return 0;
  }
  if (!shouldScan(filePath, source.split('\n', 1)[0])) return 0;

  const hits = findDebugCalls(source);
  if (hits.length === 0) return 0;

  const lines = hits.map((hit) => `  L${hit.line}: ${hit.text}`).join('\n');
  process.stderr.write(
    `[devground] console.log/debug en ${path.basename(filePath)} (regla Zero Dead Code):\n` +
      `${lines}\n` +
      `Elimínalo o usa un logger (@devground/logger). ` +
      `Desactivar: DEVGROUND_HOOKS_DISABLE=${HOOK_NAME}\n`,
  );
  return 2;
}

if (isMain(import.meta.url)) {
  main().then((code) => process.exit(code));
}
