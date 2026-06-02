import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

/**
 * Auto-detection helpers for `init`. None of these throw on a missing tool or
 * an unauthenticated `gh`: they DEGRADE (return empty + a `warnings[]`) so the
 * package works for someone with 1 repo and no `gh` just as well as for someone
 * with 19 repos and 2 GitHub accounts. Cardinality is never assumed.
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
function defaultRun(cmd: string, args: readonly string[]): string {
  return execFileSync(cmd, [...args], {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 8 * 1024 * 1024,
  });
}

/** Options for repo discovery. */
export interface DiscoverReposOptions {
  /** Directory to scan (default: ~/Documents). */
  baseDir?: string;
  /** Max directory depth below baseDir to descend (default 2). */
  maxDepth?: number;
  /** Path fragments to skip (substring match against the absolute path). */
  excludes?: readonly string[];
}

/** Default directories never worth scanning for repos. */
const ALWAYS_SKIP = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.cache',
  'Library',
  '.Trash',
]);

/**
 * Walks `baseDir` (bounded depth) collecting absolute paths of git working
 * trees (dirs containing a `.git`). Does not recurse into a repo once found
 * (sub-repos/submodules are skipped to keep the list flat). Pure w.r.t. the
 * filesystem state at call time; no network.
 */
export function discoverRepos(opts: DiscoverReposOptions = {}): string[] {
  const baseDir = opts.baseDir ?? defaultBaseDir();
  const maxDepth = opts.maxDepth ?? 2;
  const excludes = opts.excludes ?? [];
  const found: string[] = [];
  if (!existsSync(baseDir)) return found;

  const walk = (dir: string, depth: number): void => {
    if (excludes.some((frag) => dir.includes(frag))) return;
    if (isGitRepo(dir)) {
      found.push(dir);
      return; // do not descend into a repo
    }
    if (depth >= maxDepth) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (ALWAYS_SKIP.has(entry)) continue;
      if (entry.startsWith('.')) continue;
      const full = join(dir, entry);
      let isDir = false;
      try {
        isDir = statSync(full).isDirectory();
      } catch {
        isDir = false;
      }
      if (isDir) walk(full, depth + 1);
    }
  };

  walk(baseDir, 0);
  return found.sort();
}

/** Default discovery base dir: `~/Documents`. */
export function defaultBaseDir(home = homedir()): string {
  return join(home, 'Documents');
}

/** True when `dir` looks like a git working tree. */
export function isGitRepo(dir: string): boolean {
  return existsSync(join(dir, '.git'));
}

/**
 * Heuristic: is this repo a fork of someone else's project? We compare the
 * owner segment of the `origin` remote URL against the set of usernames the
 * user is known by (their gh logins). If the origin owner is none of those,
 * the repo is treated as a third-party fork and excluded by default. When we
 * cannot read a remote we err on the side of KEEPING the repo (return false).
 */
export function isLikelyThirdPartyFork(
  repoPath: string,
  ownUsernames: ReadonlySet<string>,
  run: (cmd: string, args: readonly string[]) => string = defaultRun,
): boolean {
  if (ownUsernames.size === 0) return false; // cannot judge -> keep
  let url: string;
  try {
    url = run('git', ['-C', repoPath, 'remote', 'get-url', 'origin']).trim();
  } catch {
    return false; // no origin -> local-only repo, keep it
  }
  const owner = parseRemoteOwner(url);
  if (owner === null) return false; // unparseable -> keep
  return !ownUsernames.has(owner.toLowerCase());
}

/**
 * Extracts the owner segment from a git remote URL (https or ssh). Returns
 * null when the shape is unrecognised. Pure.
 *   git@github.com:owner/repo.git        -> owner
 *   https://github.com/owner/repo.git    -> owner
 *   https://gitlab.com/group/sub/repo    -> group
 */
export function parseRemoteOwner(url: string): string | null {
  // ssh: git@host:owner/repo(.git)
  const ssh = /^[^@]+@[^:]+:([^/]+)\//.exec(url);
  if (ssh !== null) return ssh[1] ?? null;
  // https/http: scheme://host/owner/repo(.git)
  const https = /^https?:\/\/[^/]+\/([^/]+)\//.exec(url);
  if (https !== null) return https[1] ?? null;
  return null;
}

/**
 * Infers real author identities (emails) from a repo's git history, restricted
 * to the most frequent committers so we do not pick up one-off contributors.
 * Returns emails ordered by descending commit count. Never throws.
 */
export function inferIdentitiesFromRepo(
  repoPath: string,
  run: (cmd: string, args: readonly string[]) => string = defaultRun,
): string[] {
  let out: string;
  try {
    out = run('git', ['-C', repoPath, 'log', '--format=%ae']);
  } catch {
    return [];
  }
  const counts = new Map<string, number>();
  for (const line of out.split('\n')) {
    const email = line.trim();
    if (email === '') continue;
    counts.set(email, (counts.get(email) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([email]) => email);
}

/**
 * Aggregates inferred identities across many repos. Bot/noreply addresses are
 * dropped (they are not the user). Returns a de-duplicated list ordered by
 * total commit frequency across repos.
 */
export function inferIdentities(
  repoPaths: readonly string[],
  run: (cmd: string, args: readonly string[]) => string = defaultRun,
): string[] {
  const totals = new Map<string, number>();
  for (const repo of repoPaths) {
    const emails = inferIdentitiesFromRepo(repo, run);
    // weight by rank position so the top committer of each repo dominates
    emails.forEach((email, idx) => {
      if (isBotEmail(email)) return;
      totals.set(email, (totals.get(email) ?? 0) + (emails.length - idx));
    });
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([email]) => email);
}

/**
 * Substrings/suffixes that mark a commit email as a non-human agent (AI tools,
 * CI bots, generic noreply). These are NOT the user's identity, so they are
 * dropped from inferred identities. Extend as new agents appear.
 */
const BOT_EMAIL_MARKERS: readonly string[] = [
  'users.noreply.github.com',
  'noreply@github.com',
  '[bot]',
  'noreply@anthropic.com',
  '@cursor.com',
  'devnull@',
  'action@github.com',
  '@users.noreply.',
];

/** Drops obvious non-human addresses (AI agents, CI bots, noreply, etc.). */
export function isBotEmail(email: string): boolean {
  const lower = email.toLowerCase().trim();
  if (lower === '') return true;
  return BOT_EMAIL_MARKERS.some((m) => lower.includes(m));
}
