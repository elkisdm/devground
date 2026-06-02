import { execFileSync } from 'node:child_process';

/**
 * GitHub-account detection via the `gh` CLI. Never throws on a missing tool or
 * an unauthenticated `gh`: it DEGRADES (returns empty + a `warnings[]`) so the
 * package works for someone with no `gh` just as well as for someone with two
 * GitHub accounts. Cardinality is never assumed.
 */

/** One GitHub account discovered from `gh auth status`. */
export interface GithubAccount {
  /** The `login` (username) reported by gh. */
  login: string;
  /** Whether gh marks this as the active account. */
  active: boolean;
}

/**
 * Parses `gh auth status` text into 0..N accounts. Pure given the text, so it
 * is unit-testable without `gh` installed. Tolerates the multi-account block
 * format gh emits:
 *
 *   github.com
 *     ✓ Logged in to github.com account elkisdm (keyring)
 *     - Active account: true
 *     ...
 *     ✓ Logged in to github.com account edaza-create (keyring)
 *     - Active account: false
 */
export function parseGhAuthStatus(text: string): GithubAccount[] {
  const accounts: GithubAccount[] = [];
  const lines = text.split('\n');
  const loginRe = /Logged in to \S+ account (\S+)/;
  for (let i = 0; i < lines.length; i++) {
    const m = loginRe.exec(lines[i] ?? '');
    if (m === null) continue;
    const login = m[1] ?? '';
    if (login === '') continue;
    // Look ahead a few lines for the "Active account:" marker of this block.
    let active = false;
    for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
      const line = lines[j] ?? '';
      if (loginRe.test(line)) break; // next account block started
      const am = /Active account:\s*(true|false)/.exec(line);
      if (am !== null) {
        active = am[1] === 'true';
        break;
      }
    }
    accounts.push({ login, active });
  }
  return accounts;
}

/** Result of auto-detecting GitHub accounts via the `gh` CLI. */
export interface GithubDetection {
  accounts: GithubAccount[];
  warnings: string[];
}

/**
 * Runs `gh auth status` and parses it. Never throws: if `gh` is absent or no
 * one is logged in, returns `accounts: []` plus a clear warning. Injectable
 * `run` for testing.
 */
export function detectGithubAccounts(
  run: (cmd: string, args: readonly string[]) => string = defaultRun,
): GithubDetection {
  const warnings: string[] = [];
  let text: string;
  try {
    // gh writes auth status to stderr in some versions; defaultRun merges it.
    text = run('gh', ['auth', 'status']);
  } catch {
    warnings.push(
      'gh CLI not found or `gh auth status` failed; GitHub accounts not auto-detected. ' +
        'Install gh and run `gh auth login`, or set identities manually in dev-metrics.config.json.',
    );
    return { accounts: [], warnings };
  }
  const accounts = parseGhAuthStatus(text);
  if (accounts.length === 0) {
    warnings.push('No GitHub accounts found in `gh auth status` output.');
  }
  return { accounts, warnings };
}

/** Default command runner: captures stdout+stderr, throws on non-zero exit. */
export function defaultRun(cmd: string, args: readonly string[]): string {
  return execFileSync(cmd, [...args], {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 8 * 1024 * 1024,
  });
}
