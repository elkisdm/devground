#!/usr/bin/env node
// PostToolUse (Edit|Write|MultiEdit) — format the edited file with the
// project's own Prettier. Removes pure-formatting diffs from lint-staged and
// keeps every edit consistent without the agent thinking about style.
//
// Always exits 0: formatting is a convenience, never feedback. Prettier's own
// .prettierignore is respected (v3 does so by default for file targets).

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

export const HOOK_NAME = 'prettier';
const TIMEOUT_MS = 5_000;

const FORMATTABLE = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.css',
  '.scss',
  '.yml',
  '.yaml',
  '.html',
]);

export function shouldFormat(filePath) {
  if (!FORMATTABLE.has(path.extname(filePath))) return false;
  return !filePath.split(/[\\/]/).includes('node_modules');
}

export async function main() {
  if (isDisabled(HOOK_NAME)) return 0;
  const input = await readStdinJson();
  const filePath = editedFilePath(input);
  if (!filePath || !shouldFormat(filePath) || !fs.existsSync(filePath)) return 0;

  const prettier = findProjectBin('prettier', path.dirname(filePath));
  if (!prettier) return 0; // project without Prettier — nothing to do

  try {
    execFileSync(prettier, ['--write', '--ignore-unknown', filePath], {
      timeout: TIMEOUT_MS,
      stdio: 'ignore',
    });
  } catch {
    // Parse errors or timeouts: stay silent — typecheck/CI will surface them.
  }
  return 0;
}

if (isMain(import.meta.url)) {
  main().then((code) => process.exit(code));
}
