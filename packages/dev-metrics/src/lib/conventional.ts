import type { ConventionalType } from '../types.js';

const KNOWN_TYPES: ReadonlySet<string> = new Set([
  'feat',
  'fix',
  'refactor',
  'chore',
  'docs',
  'test',
  'style',
  'perf',
  'build',
  'ci',
  'revert',
]);

/**
 * Matches the conventional-commit prefix: `type(scope)!: subject`.
 * Captures the type and the optional scope; the breaking `!` is allowed.
 */
const HEADER_RE = /^([a-z]+)(?:\(([^)]*)\))?(!)?:\s/i;

export interface ParsedCommitType {
  type: ConventionalType;
  /** Whether the type matched the known conventional set. */
  known: boolean;
  /** The scope inside parentheses, if any. */
  scope: string | null;
  /** Whether the commit was flagged breaking (trailing `!`). */
  breaking: boolean;
}

/**
 * Parses the conventional-commit type out of a commit subject line.
 * Unknown or non-conventional subjects collapse to `other`.
 */
export function parseCommitType(subject: string): ParsedCommitType {
  const match = HEADER_RE.exec(subject.trim());

  if (!match) {
    return { type: 'other', known: false, scope: null, breaking: false };
  }

  const rawType = (match[1] ?? '').toLowerCase();
  const scope = match[2] ?? null;
  const breaking = match[3] === '!';

  if (KNOWN_TYPES.has(rawType)) {
    return { type: rawType as ConventionalType, known: true, scope, breaking };
  }

  return { type: 'other', known: false, scope, breaking };
}

/** Returns a zeroed counter for every conventional type. */
export function emptyTypeCounts(): Record<ConventionalType, number> {
  return {
    feat: 0,
    fix: 0,
    refactor: 0,
    chore: 0,
    docs: 0,
    test: 0,
    style: 0,
    perf: 0,
    build: 0,
    ci: 0,
    revert: 0,
    other: 0,
  };
}

/**
 * Rework ratio = (fix + refactor) / feat.
 * Returns `null` when there are no feat commits (ratio undefined).
 */
export function reworkRatio(counts: Record<ConventionalType, number>): number | null {
  if (counts.feat === 0) return null;
  return (counts.fix + counts.refactor) / counts.feat;
}
