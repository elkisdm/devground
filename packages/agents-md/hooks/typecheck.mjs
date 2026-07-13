#!/usr/bin/env node
// PostToolUse (Edit|Write|MultiEdit) — typecheck the edited .ts/.tsx file.
// Shortens the feedback loop from "commit time" (lint-staged) to "edit time".
//
// Single-file check on purpose: full-project `tsc --noEmit` costs seconds per
// edit in real repos. The trade-off is that module resolution is incomplete
// (path aliases, project references), so resolution-only diagnostics
// (TS2307/TS2792) are filtered out — the pre-commit pipeline still catches
// them. Everything else (real type errors in the file) is fed back via exit 2.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  isDisabled,
  readStdinJson,
  editedFilePath,
  findProjectBin,
  isMain,
} from './lib/common.mjs';

export const HOOK_NAME = 'typecheck';
const TIMEOUT_MS = 10_000;

// Diagnostics that are artifacts of checking one file outside its project
// context, not real errors: unresolved modules / type packages.
const RESOLUTION_CODES = /error TS(2307|2792|2688|7016):/;

export function shouldTypecheck(filePath) {
  if (!/\.tsx?$/.test(filePath) || filePath.endsWith('.d.ts')) return false;
  return !filePath.split(/[\\/]/).includes('node_modules');
}

// Permissive flags: the goal is "catch real errors with zero noise", not
// "enforce the project's strictness" — that stays in CI and pre-commit.
export const TSC_FLAGS = [
  '--noEmit',
  '--skipLibCheck',
  '--pretty',
  'false',
  '--target',
  'es2022',
  '--module',
  'esnext',
  '--moduleResolution',
  'bundler',
  '--jsx',
  'react-jsx',
  '--esModuleInterop',
  '--resolveJsonModule',
  '--allowImportingTsExtensions',
];

/** Keep only diagnostics that are trustworthy in a single-file check. */
export function filterDiagnostics(output) {
  return output
    .split('\n')
    .filter((line) => /error TS\d+:/.test(line) && !RESOLUTION_CODES.test(line));
}

export async function main() {
  if (isDisabled(HOOK_NAME)) return 0;
  const input = await readStdinJson();
  const filePath = editedFilePath(input);
  if (!filePath || !shouldTypecheck(filePath) || !fs.existsSync(filePath)) return 0;

  const tsc = findProjectBin('tsc', path.dirname(filePath));
  if (!tsc) return 0; // project without TypeScript — nothing to check

  let output = '';
  try {
    execFileSync(tsc, [...TSC_FLAGS, filePath], {
      encoding: 'utf8',
      timeout: TIMEOUT_MS,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return 0;
  } catch (error) {
    if (error.killed) return 0; // timeout — never punish the session for a slow tsc
    output = `${error.stdout ?? ''}\n${error.stderr ?? ''}`;
  }

  const diagnostics = filterDiagnostics(output);
  if (diagnostics.length === 0) return 0;

  process.stderr.write(
    `[devground] tsc en ${path.basename(filePath)}:\n${diagnostics.join('\n')}\n` +
      `Desactivar: DEVGROUND_HOOKS_DISABLE=${HOOK_NAME}\n`,
  );
  return 2;
}

if (isMain(import.meta.url)) {
  main().then((code) => process.exit(code));
}
