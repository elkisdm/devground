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
 * GitHub noreply emails have the canonical shape `<id>+<username>@users.noreply.github.com`
 * (or, for older accounts, the bare `<username>@users.noreply.github.com`). The
 * `<username>` is the GitHub login — the CANONICAL identifier of the account, NOT
 * a bot marker. This parser extracts that login (lowercased). Returns `null` when
 * the email is not a GitHub noreply address. Pure.
 *
 *   140560932+elkisdm@users.noreply.github.com   -> 'elkisdm'
 *   elkisdm@users.noreply.github.com             -> 'elkisdm'
 *   real@example.com                             -> null
 */
export function parseNoreplyUsername(email: string): string | null {
  const lower = email.toLowerCase().trim();
  const m = /^(?:\d+\+)?([a-z0-9][a-z0-9-]*)@users\.noreply\.github\.com$/.exec(lower);
  if (m === null) return null;
  return m[1] ?? null;
}

/**
 * True when the local-part of `email` ties it to one of the detected gh logins.
 * We normalise both sides to `[a-z0-9]` (dropping dots, dashes, plus tags) and
 * accept an equality or prefix relation in EITHER direction, so:
 *   edaza@capitalinteligente.cl   ↔ gh `edaza-create`  -> true  (edaza ⊂ edazacreate)
 *   elkisdm@gmail.com             ↔ gh `elkisdm`        -> true  (equal)
 *   vpedrerop@capitalinteligente.cl ↔ {elkisdm,edaza-create} -> false
 * Requires the shorter side to be at least 4 chars to avoid spurious matches.
 */
export function localPartMatchesAccount(
  email: string,
  ownUsernames: ReadonlySet<string>,
): boolean {
  const at = email.toLowerCase().indexOf('@');
  if (at <= 0) return false;
  const local = email.slice(0, at).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (local.length < 4) return false;
  for (const login of ownUsernames) {
    const norm = login.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (norm.length < 4) continue;
    const [short, long] = local.length <= norm.length ? [local, norm] : [norm, local];
    if (long.startsWith(short)) return true;
  }
  return false;
}

/** The two confidence buckets produced by {@link inferIdentities}. */
export interface InferredIdentities {
  /**
   * HIGH confidence: emails that map to one of the user's detected `gh`
   * accounts (via the noreply username) PLUS personal emails that co-occur with
   * those in the SAME repos (same person, different email).
   */
  identities: string[];
  /**
   * AMBIGUOUS: non-bot emails that do not map to any detected account and do
   * not co-occur with a confirmed identity. These are likely co-contributors
   * (colleagues) or automation that slipped the bot filter. The user reviews
   * them and promotes the real ones into `identities` by hand.
   */
  candidateIdentities: string[];
}

/**
 * Aggregates inferred identities across many repos and splits them into
 * confirmed vs. candidate buckets. Bots/agents are dropped entirely.
 *
 * Confirmation logic (the fix for the over-eager inference bug):
 *  1. A GitHub noreply email whose `<username>` matches one of `ownUsernames`
 *     (the logins detected by `gh auth status`) is CONFIRMED — these are the
 *     canonical identifiers of the user's own accounts, so they are INCLUDED
 *     (the old code filtered them out, which was exactly backwards).
 *  2. A non-bot, non-noreply email is CONFIRMED as the same person ONLY when
 *     the evidence is strong:
 *       (a) its local-part maps to a detected gh login (equal, or one is a
 *           prefix of the other once non-alphanumerics are stripped — e.g.
 *           `edaza@…` ↔ gh login `edaza-create`), OR
 *       (b) it co-occurs with a confirmed identity in 2+ DISTINCT repos
 *           (a colleague typically shows up alongside the user in just one
 *           shared repo, not consistently across many).
 *  3. Everything else non-bot becomes a CANDIDATE: the user reviews it and
 *     promotes it manually if it is theirs. Co-contributors (colleagues, e.g.
 *     an email that shares a single repo with the user) and unrecognised
 *     automation land here — never auto-confirmed.
 *
 * `ownUsernames` should be lowercased gh logins. With an empty set we cannot
 * anchor anything, so nothing is confirmed and every non-bot email is a
 * candidate (safe: the user reviews them). Never throws.
 */
export function inferIdentities(
  repoPaths: readonly string[],
  ownUsernames: ReadonlySet<string> = new Set(),
  run: (cmd: string, args: readonly string[]) => string = defaultRun,
): InferredIdentities {
  // Per-email: total rank-weighted score and the set of repos it appeared in.
  const totals = new Map<string, number>();
  const reposByEmail = new Map<string, Set<string>>();
  for (const repo of repoPaths) {
    const emails = inferIdentitiesFromRepo(repo, run);
    emails.forEach((email, idx) => {
      if (isBotEmail(email)) return;
      // weight by rank position so the top committer of each repo dominates
      totals.set(email, (totals.get(email) ?? 0) + (emails.length - idx));
      let set = reposByEmail.get(email);
      if (set === undefined) {
        set = new Set();
        reposByEmail.set(email, set);
      }
      set.add(repo);
    });
  }

  // 1. Confirm noreply emails that map to a detected gh account.
  const confirmed = new Set<string>();
  const confirmedRepos = new Set<string>();
  for (const email of totals.keys()) {
    const username = parseNoreplyUsername(email);
    if (username !== null && ownUsernames.has(username)) {
      confirmed.add(email);
      for (const r of reposByEmail.get(email) ?? []) confirmedRepos.add(r);
    }
  }

  // 2. Confirm non-noreply emails with STRONG evidence of being the same person:
  //    (a) local-part maps to a detected gh login, OR
  //    (b) co-occurrence with a confirmed identity in 2+ distinct repos.
  for (const [email, repos] of reposByEmail) {
    if (confirmed.has(email)) continue;
    if (parseNoreplyUsername(email) !== null) continue; // foreign noreply -> candidate
    if (localPartMatchesAccount(email, ownUsernames)) {
      confirmed.add(email);
      continue;
    }
    if (confirmedRepos.size > 0) {
      let sharedRepos = 0;
      for (const r of repos) if (confirmedRepos.has(r)) sharedRepos++;
      if (sharedRepos >= 2) confirmed.add(email);
    }
  }

  const byScore = (a: string, b: string): number => (totals.get(b) ?? 0) - (totals.get(a) ?? 0);
  const identities = [...confirmed].sort(byScore);
  const candidateIdentities = [...totals.keys()].filter((e) => !confirmed.has(e)).sort(byScore);
  return { identities, candidateIdentities };
}

/**
 * Substrings/suffixes that mark a commit email as a non-human agent (AI tools,
 * CI bots, automation). These are NOT the user's identity, so they are dropped
 * from inferred identities entirely. Extend as new agents appear.
 *
 * NOTE: GitHub `*.noreply.github.com` addresses are deliberately NOT here — they
 * are the canonical identifier of a real account and are resolved against the
 * detected `gh` logins by {@link parseNoreplyUsername}. Only the dedicated bot
 * noreply `[bot]@users.noreply.github.com` matches (via the `[bot]` marker).
 */
const BOT_EMAIL_MARKERS: readonly string[] = [
  '[bot]',
  'noreply@anthropic.com',
  '@local',
  'codex',
  'cursoragent',
  '@cursor.com',
  'github-actions',
  'devnull@',
  'action@github.com',
];

/** Drops obvious non-human addresses (AI agents, CI bots, automation, etc.). */
export function isBotEmail(email: string): boolean {
  const lower = email.toLowerCase().trim();
  if (lower === '') return true;
  return BOT_EMAIL_MARKERS.some((m) => lower.includes(m));
}
