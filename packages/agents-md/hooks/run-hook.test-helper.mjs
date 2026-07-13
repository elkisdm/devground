// Test helper: run a hook script as Claude Code would — a child process with
// the JSON payload on stdin — and capture { code, stderr }.
import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hooksDir = path.dirname(fileURLToPath(import.meta.url));

export function runHook(script, payload, { env = {}, cwd } = {}) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      process.execPath,
      [path.join(hooksDir, script)],
      { cwd, env: { ...process.env, DEVGROUND_HOOKS_DISABLE: '', ...env } },
      (error, stdout, stderr) => {
        if (error && error.code === undefined) return reject(error);
        resolve({ code: error?.code ?? 0, stdout, stderr });
      },
    );
    child.stdin.end(typeof payload === 'string' ? payload : JSON.stringify(payload));
  });
}

export function editPayload(filePath, extra = {}) {
  return { hook_event_name: 'PostToolUse', tool_name: 'Edit', tool_input: { file_path: filePath }, ...extra };
}
