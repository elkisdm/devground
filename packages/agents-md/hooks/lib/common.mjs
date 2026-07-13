// Shared helpers for devground Claude Code hooks.
//
// Every hook script is dependency-free (Node >= 20) and reads the Claude Code
// hook payload as JSON on stdin. Exit code contract (Claude Code convention):
//   0 = ok / nothing to say · 2 = stderr is fed back to the agent as feedback.
// A hook must NEVER crash the session: on any unexpected state, exit 0.

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Kill switch (documented in the package README):
 *   DEVGROUND_HOOKS_DISABLE=1|true|all      → disable every devground hook
 *   DEVGROUND_HOOKS_DISABLE=typecheck,console-log → disable only those names
 */
export const KILL_SWITCH = 'DEVGROUND_HOOKS_DISABLE';

export function isDisabled(hookName, env = process.env) {
  const raw = env[KILL_SWITCH];
  if (!raw) return false;
  const value = raw.trim().toLowerCase();
  if (value === '1' || value === 'true' || value === 'all') return true;
  return value
    .split(',')
    .map((name) => name.trim())
    .includes(hookName);
}

/** Read the whole stdin and parse it as JSON. Returns null on invalid input. */
export async function readStdinJson(stream = process.stdin) {
  let data = '';
  for await (const chunk of stream) data += chunk;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/** file_path of the edited file for Edit/Write/MultiEdit payloads, or null. */
export function editedFilePath(input) {
  const filePath = input?.tool_input?.file_path;
  return typeof filePath === 'string' && filePath.length > 0 ? filePath : null;
}

/** Walk up from `dir` until `node_modules/.bin/<binName>` is found, or null. */
export function findProjectBin(binName, dir) {
  let current = path.resolve(dir);
  for (;;) {
    const candidate = path.join(current, 'node_modules', '.bin', binName);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

/** True when the module at `metaUrl` is the entrypoint (node script.mjs). */
export function isMain(metaUrl, argv = process.argv) {
  if (!argv[1]) return false;
  try {
    return fileURLToPath(metaUrl) === path.resolve(argv[1]);
  } catch {
    return false;
  }
}
