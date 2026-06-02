import { execFileSync } from 'node:child_process';
import { parseCommitType } from './conventional.js';

/**
 * Per-repo standards-adoption markers. Each value is the YYYY-MM-DD date the
 * marker FIRST appeared in git history (filtered to the relevant pathspec),
 * or `null` if it never appeared. `tsconfigStrict` is a present-state boolean
 * (does the current tsconfig enable `"strict": true`), independent of when the
 * file was added.
 */
export interface AdoptionMarkers {
  /** First commit date of the repo (birth). */
  born: string | null;
  /** First time a `tsconfig.json` was added. */
  tsconfig: string | null;
  /** Whether the tsconfig currently has `"strict": true`. */
  tsconfigStrict: boolean;
  /** First time a `.husky/pre-commit` hook was added. */
  huskyPreCommit: string | null;
  /** First time an `eslint.config.{js,mjs,cjs}` was added. */
  eslintFlatConfig: string | null;
  /** First time a test file (`*.test.ts(x)` / `*.spec.ts`) was added. */
  firstTest: string | null;
  /** First commit whose subject parses as a known conventional type. */
  firstConventionalCommit: string | null;
}

/** Cohort classification of a repo by HOW it adopted standards. */
export type Cohort = 'born-standardized' | 'retrofitted' | 'partial';

export interface CohortClassification {
  cohort: Cohort;
  /** Days between birth and the latest KEY marker (null if not retrofitted). */
  retrofitLagDays: number | null;
  /** Key markers that never appeared (drives the `partial` cohort). */
  missingKeyMarkers: string[];
}

/**
 * The KEY markers that define "standardized". A repo missing any of these is
 * `partial`; otherwise it is `born-standardized` if they all land within
 * `bornWindowDays` of birth, else `retrofitted`.
 */
const KEY_MARKERS: readonly (keyof AdoptionMarkers)[] = [
  'tsconfig',
  'eslintFlatConfig',
  'firstTest',
];

/** Days between two YYYY-MM-DD dates (b - a). Negative if b precedes a. */
export function daysBetween(a: string, b: string): number {
  const da = Date.parse(`${a}T00:00:00Z`);
  const db = Date.parse(`${b}T00:00:00Z`);
  return Math.round((db - da) / 86_400_000);
}

/**
 * Classifies a repo into a cohort from its markers. Pure.
 *
 * - `partial`: at least one KEY marker is missing.
 * - `born-standardized`: every KEY marker appeared within `bornWindowDays`
 *   of the repo's birth (the repo started life with standards in place).
 * - `retrofitted`: all KEY markers exist but at least one landed later than
 *   the window (standards bolted on after the fact).
 */
export function classifyCohort(
  markers: AdoptionMarkers,
  bornWindowDays = 7,
): CohortClassification {
  const missingKeyMarkers = KEY_MARKERS.filter((k) => markers[k] === null).map(String);
  if (missingKeyMarkers.length > 0) {
    return { cohort: 'partial', retrofitLagDays: null, missingKeyMarkers };
  }

  const born = markers.born;
  if (born === null) {
    // No birth date but all markers present: cannot place on the timeline.
    return { cohort: 'partial', retrofitLagDays: null, missingKeyMarkers: ['born'] };
  }

  let maxLag = 0;
  for (const key of KEY_MARKERS) {
    const date = markers[key] as string; // not null (checked above)
    const lag = daysBetween(born, date);
    if (lag > maxLag) maxLag = lag;
  }

  if (maxLag <= bornWindowDays) {
    return { cohort: 'born-standardized', retrofitLagDays: maxLag, missingKeyMarkers: [] };
  }
  return { cohort: 'retrofitted', retrofitLagDays: maxLag, missingKeyMarkers: [] };
}

// ---- git-backed detection (impure; thin wrappers over `git log`) ----

/** Runs git in a repo, returning trimmed stdout (empty string on failure). */
function git(repoPath: string, args: readonly string[]): string {
  try {
    return execFileSync('git', ['-C', repoPath, ...args], {
      encoding: 'utf-8',
      maxBuffer: 64 * 1024 * 1024,
      // Swallow stderr: `git show HEAD:tsconfig.json` legitimately fails when
      // the file is absent; we treat that as "not strict", not an error.
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

/** First date (YYYY-MM-DD) a path matching `pathspec` was Added, or null. */
function firstAdded(repoPath: string, pathspec: readonly string[]): string | null {
  const out = git(repoPath, [
    'log',
    '--diff-filter=A',
    '--reverse',
    '--format=%ad',
    '--date=short',
    '--',
    ...pathspec,
  ]);
  const first = out.split('\n').find((l) => l.trim() !== '');
  return first ? first.trim() : null;
}

/** Date of the repo's very first commit (birth), or null. */
function birthDate(repoPath: string): string | null {
  const out = git(repoPath, ['log', '--reverse', '--format=%ad', '--date=short']);
  const first = out.split('\n').find((l) => l.trim() !== '');
  return first ? first.trim() : null;
}

/** Date of the first commit whose subject parses as a known conventional type. */
function firstConventional(repoPath: string): string | null {
  const SEP = '\x1f';
  const out = git(repoPath, [
    'log',
    '--reverse',
    `--format=%ad${SEP}%s`,
    '--date=short',
  ]);
  for (const line of out.split('\n')) {
    if (line.trim() === '') continue;
    const [date, ...rest] = line.split(SEP);
    const subject = rest.join(SEP);
    if (parseCommitType(subject).known) return (date ?? '').trim() || null;
  }
  return null;
}

/** Strips `//` and block comments + trailing commas, then parses JSON. */
function parseJsonc(content: string): Record<string, unknown> | null {
  const noComments = content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  const noTrailingCommas = noComments.replace(/,(\s*[}\]])/g, '$1');
  try {
    const parsed = JSON.parse(noTrailingCommas) as unknown;
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

/** Resolves an `extends` reference to a path relative to the extending file. */
function resolveExtendsPath(fromGitPath: string, ref: string): string | null {
  // Only resolve relative refs from inside the repo. Package refs
  // (e.g. "@tsconfig/strictest") cannot be read from git history reliably.
  if (!ref.startsWith('.')) return null;
  const baseDir = posixDirname(fromGitPath);
  let resolved = posixNormalize(posixJoin(baseDir, ref));
  if (!resolved.endsWith('.json')) resolved += '.json';
  return resolved;
}

function posixDirname(p: string): string {
  const i = p.lastIndexOf('/');
  return i < 0 ? '' : p.slice(0, i);
}
function posixJoin(a: string, b: string): string {
  if (a === '') return b;
  return `${a}/${b}`;
}
function posixNormalize(p: string): string {
  const parts: string[] = [];
  for (const seg of p.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return parts.join('/');
}

/**
 * Resolves whether `"strict": true` is in effect, FOLLOWING the `extends`
 * chain (MEJORA E / ADR-0006 caveat 4). Pure: `read(gitPath)` returns the
 * file content (or '' when absent), so this is fully unit-testable without git.
 *
 * Rules (mirroring TS): the closest config that sets `strict` wins; an explicit
 * `strict: false` overrides; a relative `extends` is followed; a package
 * `extends` (e.g. `@tsconfig/strictest`) cannot be read from git history and
 * stops the chain (residual limitation).
 */
export function isStrictFromConfigs(
  read: (gitPath: string) => string,
  entry = 'tsconfig.json',
): boolean {
  const seen = new Set<string>();
  let current: string | null = entry;
  let depth = 0;
  while (current !== null && depth < 10) {
    if (seen.has(current)) break;
    seen.add(current);
    depth++;
    const content = read(current);
    if (content === '') return false;
    const parsed = parseJsonc(content);
    if (parsed === null) {
      // Fall back to the original tolerant regex for unparseable JSONC.
      return /"strict"\s*:\s*true/.test(content);
    }
    const co = parsed.compilerOptions;
    if (typeof co === 'object' && co !== null) {
      const strict = (co as Record<string, unknown>).strict;
      if (strict === true) return true;
      if (strict === false) return false; // explicit override wins
    }
    const ext = parsed.extends;
    if (typeof ext !== 'string') return false;
    current = resolveExtendsPath(current, ext);
  }
  return false;
}

/** Git-backed wrapper: reads each tsconfig from HEAD and resolves `extends`. */
function tsconfigIsStrict(repoPath: string): boolean {
  return isStrictFromConfigs((gitPath) => git(repoPath, ['show', `HEAD:${gitPath}`]));
}

/** Reads all adoption markers for a repo from its git history. */
export function detectAdoptionMarkers(repoPath: string): AdoptionMarkers {
  return {
    born: birthDate(repoPath),
    tsconfig: firstAdded(repoPath, ['tsconfig.json', '*/tsconfig.json']),
    tsconfigStrict: tsconfigIsStrict(repoPath),
    huskyPreCommit: firstAdded(repoPath, ['.husky/pre-commit']),
    eslintFlatConfig: firstAdded(repoPath, [
      'eslint.config.js',
      'eslint.config.mjs',
      'eslint.config.cjs',
      '*/eslint.config.js',
      '*/eslint.config.mjs',
      '*/eslint.config.cjs',
    ]),
    firstTest: firstAdded(repoPath, ['*.test.ts', '*.test.tsx', '*.spec.ts']),
    firstConventionalCommit: firstConventional(repoPath),
  };
}
