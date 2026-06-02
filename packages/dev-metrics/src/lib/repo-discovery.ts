import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { defaultRun } from './gh-accounts.js';

/**
 * Filesystem repo discovery and the fork-detection heuristic. None of these
 * throw on a missing directory or an unreadable remote: they DEGRADE so the
 * package works whether the user has 1 repo or 19. No network is used.
 */

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
