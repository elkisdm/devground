import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { TokenUsage } from '../types.js';
import {
  parseTranscriptLine,
  dedupByUuid,
  emptyTokenUsage,
  addUsage,
  totalTokens,
  type TranscriptRecord,
} from './transcript.js';

/**
 * Derives the Claude Code project directory name from an absolute repo path.
 *
 * Claude Code organizes transcripts under `~/.claude/projects/<DIR>/` where
 * `<DIR>` is the repo's absolute path with every non-alphanumeric character
 * replaced by a single dash. Example:
 *   /Users/macbookpro/Documents/encuentrosmart
 *     -> -Users-macbookpro-Documents-encuentrosmart
 *
 * Pure: same input always yields the same output. This is the linchpin of
 * REAL per-repo token attribution (ADR-0006 decision: tokens ARE attributable
 * by project folder; only the *account* that paid is not).
 */
export function repoPathToProjectDir(repoPath: string): string {
  return repoPath.replace(/[^A-Za-z0-9]/g, '-');
}

/** Per-repo token measurement: real usage read from that repo's project dir. */
export interface RepoTokenTotals {
  /** The absolute repo path this maps to. */
  path: string;
  /** The derived `<DIR>` name searched under each transcript root. */
  projectDir: string;
  /** All token kinds summed across the repo's transcripts (deduped). */
  tokens: TokenUsage;
  /** Whether at least one transcript dir existed for this repo. */
  found: boolean;
}

/** Result of attributing tokens to a known set of repos. */
export interface AttributionResult {
  byRepo: RepoTokenTotals[];
  /**
   * Tokens from project dirs that map to NO repo in the requested list
   * (e.g. `subagents`, sessions started from `~`, other repos). NOT
   * redistributed — reported as an explicit bucket.
   */
  unattributed: TokenUsage;
  /** Number of project dirs that fell into the unattributed bucket. */
  unattributedDirs: number;
}

/**
 * Lists the transcript "root/projectDir" base directories to scan. For each
 * transcript root (live + backup), returns the path to its `<DIR>` subfolder,
 * whether or not it exists (caller filters).
 */
function projectDirCandidates(roots: readonly string[], projectDir: string): string[] {
  return roots.map((root) => join(root, projectDir));
}

/** Recursively collects `*.jsonl` files under a directory (empty if missing). */
function jsonlUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (entry.endsWith('.jsonl')) out.push(full);
    }
  };
  walk(dir);
  return out;
}

/** A record's day (YYYY-MM-DD) is within [since, until]? Missing ts is kept. */
function inPeriod(ts: string | undefined, since: string | null, until: string | null): boolean {
  if (!ts) return true;
  const day = ts.slice(0, 10);
  if (since !== null && day < since) return false;
  if (until !== null && day > until) return false;
  return true;
}

/** Reads + parses every record from a list of jsonl files. */
function readRecords(files: readonly string[]): TranscriptRecord[] {
  const records: TranscriptRecord[] = [];
  for (const file of files) {
    const raw = readFileSync(file, 'utf-8');
    for (const line of raw.split('\n')) {
      const record = parseTranscriptLine(line);
      if (record !== null) records.push(record);
    }
  }
  return records;
}

/** Sums usage of period-filtered, deduped assistant records. */
function sumUsage(
  records: readonly TranscriptRecord[],
  since: string | null,
  until: string | null,
): TokenUsage {
  const { kept } = dedupByUuid(records);
  const tokens = emptyTokenUsage();
  for (const record of kept) {
    if (!inPeriod(record.timestamp, since, until)) continue;
    addUsage(tokens, record);
  }
  return tokens;
}

export interface AttributeTokensOptions {
  /** Absolute repo paths to attribute tokens to. */
  repoPaths: readonly string[];
  /** Transcript roots (live + backups), each containing `<DIR>` subfolders. */
  roots: readonly string[];
  since: string | null;
  until: string | null;
}

/**
 * REAL per-repo token attribution (replaces the v1 churn-proportional
 * ESTIMATE). For each repo we derive its `<DIR>`, read every transcript under
 * `<root>/<DIR>` across all roots, dedup by uuid (live+backup overlap), filter
 * by period, and sum `message.usage`. Token totals in project dirs that do not
 * map to any requested repo land in `unattributed` (never redistributed).
 */
export function attributeTokensByRepo(opts: AttributeTokensOptions): AttributionResult {
  // Map each known repo to its derived project dir.
  const dirToPath = new Map<string, string>();
  for (const path of opts.repoPaths) {
    dirToPath.set(repoPathToProjectDir(path), path);
  }

  const byRepo: RepoTokenTotals[] = [];
  for (const path of opts.repoPaths) {
    const projectDir = repoPathToProjectDir(path);
    const dirs = projectDirCandidates(opts.roots, projectDir);
    const files = dirs.flatMap(jsonlUnder);
    const found = dirs.some((d) => existsSync(d));
    const tokens = sumUsage(readRecords(files), opts.since, opts.until);
    byRepo.push({ path, projectDir, tokens, found });
  }

  // Everything else under the roots that does NOT match a known repo dir.
  const unattributed = emptyTokenUsage();
  let unattributedDirs = 0;
  const unattributedFiles: string[] = [];
  for (const root of opts.roots) {
    if (!existsSync(root)) continue;
    for (const entry of readdirSync(root)) {
      const full = join(root, entry);
      let isDir = false;
      try {
        isDir = statSync(full).isDirectory();
      } catch {
        isDir = false;
      }
      if (!isDir) continue;
      if (dirToPath.has(entry)) continue; // belongs to a known repo
      unattributedDirs++;
      unattributedFiles.push(...jsonlUnder(full));
    }
  }
  const unattributedTokens = sumUsage(readRecords(unattributedFiles), opts.since, opts.until);
  unattributed.input += unattributedTokens.input;
  unattributed.output += unattributedTokens.output;
  unattributed.cacheCreation += unattributedTokens.cacheCreation;
  unattributed.cacheRead += unattributedTokens.cacheRead;

  return { byRepo, unattributed, unattributedDirs };
}

/** Convenience: total tokens (all kinds) for a repo total. */
export function repoTokenTotal(totals: RepoTokenTotals): number {
  return totalTokens(totals.tokens);
}
