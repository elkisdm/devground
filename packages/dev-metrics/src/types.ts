/**
 * Schema version of the snapshot format. Bump when the shape of `Snapshot`
 * changes in a backward-incompatible way so old snapshots can be detected.
 *
 * v2: per-repo tokens are now REAL measurements (read from each repo's
 * `~/.claude/projects/<DIR>` transcripts) instead of churn-proportional
 * estimates; adds `adoption`, `memory`, and `unattributed` token bucket.
 */
export const SNAPSHOT_SCHEMA_VERSION = 2 as const;

/** Canonical set of conventional-commit types we bucket into. */
export type ConventionalType =
  | 'feat'
  | 'fix'
  | 'refactor'
  | 'chore'
  | 'docs'
  | 'test'
  | 'style'
  | 'perf'
  | 'build'
  | 'ci'
  | 'revert'
  | 'other';

/** Tool categories we track from Claude Code transcripts. */
export type ToolCategory = 'Write' | 'Edit' | 'Read' | 'Bash' | 'Other';

/** A time window the snapshot is scoped to. `null` means "unbounded". */
export interface Period {
  since: string | null;
  until: string | null;
}

/** Git-derived metrics for a single repo or aggregated across repos. */
export interface GitMetrics {
  commits: number;
  /** Commits keyed by the author email that produced them. */
  commitsByAuthor: Record<string, number>;
  churn: {
    added: number;
    deleted: number;
    /** (added - deleted) / (added + deleted). Code "survival" ratio. */
    netGrossRatio: number;
  };
  /** Count of commits per conventional-commit type. */
  commitTypes: Record<ConventionalType, number>;
  /** (fix + refactor) / feat. `null` when there are no feat commits. */
  reworkRatio: number | null;
  files: {
    /** Distinct files touched across the analysed commits. */
    touched: number;
    /** % of touched files modified exactly once. */
    oneShotPct: number;
    /** % of touched files modified 5 or more times. */
    reworkedPct: number;
  };
  /** Commits divided by the number of distinct days with at least one commit. */
  commitsPerActiveDay: number;
}

/** Token usage from transcripts, broken down by kind. */
export interface TokenUsage {
  input: number;
  output: number;
  cacheCreation: number;
  cacheRead: number;
}

/** Transcript-derived metrics. */
export interface TranscriptMetrics {
  /** Distinct assistant messages counted (after uuid dedup). */
  messages: number;
  /** Messages dropped because their uuid was already seen. */
  duplicatesDropped: number;
  tokens: TokenUsage;
  /** Token usage keyed by model id (e.g. "claude-opus-4-7"). */
  tokensByModel: Record<string, TokenUsage>;
  toolUse: Record<ToolCategory, number>;
  /** Edit count / Write count. `null` when there are no Write calls. */
  editWriteRatio: number | null;
  fileIteration: {
    /** Distinct file_paths that received at least one Write/Edit op. */
    files: number;
    /** % of files touched by exactly 1 op. */
    oneShotPct: number;
    /** % of files touched by 4 or more ops. */
    iteratedPct: number;
    /** Average Write+Edit ops per file. */
    opsPerFile: number;
  };
}

/** Metrics that combine git and transcript data. */
export interface DerivedMetrics {
  /** Total tokens (all kinds) divided by total commits. `null` if no commits. */
  tokensPerCommit: number | null;
  /** Total tool calls divided by total commits. `null` if no commits. */
  toolCallsPerCommit: number | null;
  /**
   * Calibration: Pearson R^2 between per-project churn and per-project
   * output tokens. See ADR-0006 caveat 3 — this is moderate (~0.63), so
   * any token estimate derived from churn is order-of-magnitude only.
   */
  churnTokensR2: number | null;
}

/** A single repo's contribution, kept for the churn<->tokens correlation. */
export interface RepoBreakdown {
  path: string;
  commits: number;
  churnGross: number;
  /**
   * REAL output tokens measured from this repo's `~/.claude/projects/<DIR>`
   * transcripts (v2). In v1 this was a churn-proportional estimate — see
   * ADR-0006. `null` when the repo had no transcript dir at all.
   */
  outputTokens: number | null;
  /** Total tokens (all kinds) measured for this repo. */
  totalTokens: number;
  /** Whether a transcript dir was found for this repo (vs. silent zero). */
  transcriptDirFound: boolean;
}

/** Tokens that could not be mapped to any requested repo (v2). */
export interface UnattributedTokens {
  tokens: TokenUsage;
  /** How many project dirs (subagents, ~ sessions, etc.) landed here. */
  dirs: number;
}

/** Standards-adoption markers + cohort for a single repo (v2 / MEJORA 2). */
export interface RepoAdoption {
  path: string;
  markers: {
    born: string | null;
    tsconfig: string | null;
    tsconfigStrict: boolean;
    huskyPreCommit: string | null;
    eslintFlatConfig: string | null;
    firstTest: string | null;
    firstConventionalCommit: string | null;
  };
  cohort: 'born-standardized' | 'retrofitted' | 'partial';
  retrofitLagDays: number | null;
  missingKeyMarkers: string[];
}

/** Memory-corpus + context-cost metrics (v2 / MEJORA 3). */
export interface MemoryMetrics {
  /** `.md` notes (excluding MEMORY.md) under ~/.claude/projects/ * /memory/. */
  totalNotes: number;
  notesByProject: Record<string, number>;
  /** New notes per ISO week (by mtime — see caveat 5). */
  notesByWeek: Record<string, number>;
  notesAfterAdoption: number;
  notesBeforeAdoption: number;
  totalBytes: number;
  /** Context-cost PROXY: output tokens in the first N msgs of each session. */
  contextCost: {
    sessions: number;
    earlyOutputTokens: number;
    meanEarlyOutputPerSession: number | null;
    firstN: number;
  };
  /** Reuse signal: sessions that Read a /memory/ path. */
  reuse: {
    sessionsReadingMemory: number;
    memoryReadOps: number;
  };
}

/** An annotated event (e.g. "adopted standard X on day Y"). */
export interface EventAnnotation {
  date: string;
  label: string;
  description?: string;
}

/**
 * Versionable `dev-metrics.config.json`. Makes the package reusable: it does
 * NOT assume a fixed number of accounts or repos. Someone with 1 repo + 1
 * identity and someone with 19 repos + 2 identities both describe their setup
 * here (or let `init` auto-detect it). All fields are optional on disk; the
 * loader fills sane defaults. See ADR-0006 (v3) and the precedence rule:
 * flags CLI > config file > auto-detection.
 */
export interface DevMetricsConfig {
  /** Absolute repo paths to analyse. 1..N — never a fixed count. */
  repos: string[];
  /** Author identities (emails) to filter git by. 1..N. */
  identities: string[];
  /** Base dir scanned by `init` to auto-discover repos (e.g. ~/Documents). */
  baseDir?: string;
  /** Glob/substring fragments of paths to exclude from discovery. */
  excludes?: string[];
  /** Optional pre-seeded event annotations to merge into events.json. */
  events?: EventAnnotation[];
}

/** A full, self-describing, comparable snapshot. */
export interface Snapshot {
  schemaVersion: typeof SNAPSHOT_SCHEMA_VERSION;
  /** ISO timestamp the snapshot was produced. */
  generatedAt: string;
  /** Free-text label for this snapshot (e.g. "2026-Q2 baseline"). */
  label: string | null;
  period: Period;
  /** Author emails used to filter git commits. */
  authorEmails: string[];
  git: GitMetrics;
  transcript: TranscriptMetrics;
  derived: DerivedMetrics;
  repoBreakdown: RepoBreakdown[];
  /** Tokens not attributable to any requested repo (v2). */
  unattributed: UnattributedTokens;
  /** Per-repo standards-adoption markers and cohort (v2). */
  adoption: RepoAdoption[];
  /** Memory-corpus and context-cost metrics (v2). */
  memory: MemoryMetrics;
  /** Event annotations relevant to (or recorded with) this snapshot. */
  events: EventAnnotation[];
}
