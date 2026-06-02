import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type {
  RepoBreakdown,
  RepoAdoption,
  EventAnnotation,
  MemoryMetrics,
  GitMetrics,
  TranscriptMetrics,
} from '../types.js';
import { collectGitRepo, mergeGitMetrics, isGitRepo, type GitRepoResult } from '../lib/git.js';
import type { AttributionResult } from '../lib/repo-attribution.js';
import {
  collectTranscripts,
  defaultTranscriptRoots,
} from '../lib/transcript-collect.js';
import { attributeTokensByRepo } from '../lib/repo-attribution.js';
import { detectAdoptionMarkers, classifyCohort } from '../lib/adoption.js';
import {
  listMemoryNotes,
  aggregateMemory,
  computeMemorySignals,
  defaultMemoryRoot,
} from '../lib/memory.js';
import { findTranscripts } from '../lib/transcript-collect.js';
import { totalTokens } from '../lib/transcript.js';
import { buildSnapshot } from '../lib/snapshot.js';
import { readEvents, eventsInPeriod, addEvent } from '../lib/events.js';
import { info, success, warn, error } from '@devground/logger';

export interface CollectArgs {
  repos: string[];
  emails: string[];
  since: string | null;
  until: string | null;
  label: string | null;
  outDir: string;
  eventsFile: string;
  transcriptRoots?: string[];
  /** When true (default), auto-seed events.json with detected markers. */
  seedEvents?: boolean;
  /** Pre-seeded events from dev-metrics.config.json to merge in. */
  configEvents?: EventAnnotation[];
  /**
   * OPTIONAL backend-agnostic memory-backend migration date (YYYY-MM-DD). When
   * set, enables the before/after note split, the mtime caveat, and auto-seeds
   * a generic `memory backend migration` event. Unset = none of that.
   */
  memoryBackendMigrationDate?: string;
  /** OPTIONAL backup dir (with a `projects/` subdir) of frozen transcripts. */
  transcriptBackupDir?: string;
}

/**
 * Auto-seeds events.json with markers worth aligning diffs against: each repo's
 * key adoption markers, plus — only when a memory-backend migration date is
 * configured — a generic memory-backend migration event. Idempotent by
 * (date,label): readEvents/addEvent re-sort and we skip already-present.
 */
function seedEvents(
  eventsFile: string,
  adoption: readonly RepoAdoption[],
  configEvents: readonly EventAnnotation[] = [],
  memoryBackendMigrationDate?: string,
): void {
  const existing = readEvents(eventsFile);
  const seen = new Set(existing.map((e) => `${e.date} ${e.label}`));
  const toAdd: EventAnnotation[] = [];

  const push = (date: string | null, label: string, description?: string): void => {
    if (date === null) return;
    const key = `${date} ${label}`;
    if (seen.has(key)) return;
    seen.add(key);
    toAdd.push(description === undefined ? { date, label } : { date, label, description });
  };

  // Config-provided events first (user-curated, highest intent).
  for (const e of configEvents) push(e.date, e.label, e.description);

  // Memory backend migration: ONLY when a date is configured. Backend-agnostic;
  // no memory tool is assumed and nothing is seeded by default.
  if (memoryBackendMigrationDate !== undefined) {
    push(
      memoryBackendMigrationDate,
      'memory backend migration',
      'Migrated the memory backend (may have reset mtimes; affects pre-migration note volume)',
    );
  }

  // MEJORA 2: per-repo key markers (only the standards-defining ones).
  for (const a of adoption) {
    const name = a.path.split('/').pop() ?? a.path;
    push(a.markers.tsconfig, `${name}: tsconfig`, 'First tsconfig.json added');
    push(a.markers.eslintFlatConfig, `${name}: eslint flat config`, 'First eslint.config.* added');
    push(a.markers.firstTest, `${name}: first test`, 'First test file added');
    push(a.markers.huskyPreCommit, `${name}: husky pre-commit`, 'First .husky/pre-commit added');
  }

  for (const ev of toAdd) addEvent(eventsFile, ev);
}

/** Per-repo git collection: filters to git working trees and merges metrics. */
function collectGitPhase(args: CollectArgs): {
  git: GitMetrics;
  repoResults: GitRepoResult[];
  repoPaths: string[];
} {
  const repoResults: GitRepoResult[] = [];
  const repoPaths: string[] = [];

  for (const repo of args.repos) {
    const repoPath = resolve(repo);
    if (!isGitRepo(repoPath)) {
      warn(`Skipping ${repoPath}: not a git repository.`);
      continue;
    }
    info(`Collecting git metrics: ${repoPath}`);
    const result = collectGitRepo({
      repoPath,
      authorEmails: args.emails,
      since: args.since,
      until: args.until,
    });
    repoResults.push(result);
    repoPaths.push(repoPath);
  }

  return { git: mergeGitMetrics(repoResults), repoResults, repoPaths };
}

/**
 * Transcript collection + REAL per-repo token attribution (MEJORA 1). Each
 * repo's tokens are MEASURED from its `~/.claude/projects/<DIR>` transcripts
 * (live + backup), deduped by uuid and period-filtered. The only thing still
 * inattributable is the ACCOUNT (personal vs work) that paid — NOT the
 * project. See ADR-0006. Returns the data later phases also need (roots).
 */
function collectTranscriptPhase(
  args: CollectArgs,
  repoResults: readonly GitRepoResult[],
  repoPaths: readonly string[],
): {
  transcript: TranscriptMetrics;
  breakdown: RepoBreakdown[];
  attribution: AttributionResult;
  roots: string[];
} {
  info('Collecting Claude Code transcript metrics...');
  const roots = args.transcriptRoots ?? defaultTranscriptRoots(args.transcriptBackupDir);
  if (roots.length === 0) {
    warn('No transcript roots found (~/.claude/projects missing). Transcript metrics will be zero.');
  }
  const transcript = collectTranscripts({ roots, since: args.since, until: args.until });

  info('Attributing tokens to repos by project directory...');
  const attribution = attributeTokensByRepo({
    repoPaths: [...repoPaths],
    roots,
    since: args.since,
    until: args.until,
  });

  const breakdown: RepoBreakdown[] = repoResults.map((r) => {
    const totals = attribution.byRepo.find((b) => b.path === r.path);
    const measured = totals ?? null;
    const total = measured ? totalTokens(measured.tokens) : 0;
    return {
      path: r.path,
      commits: r.metrics.commits,
      churnGross: r.churnGross,
      outputTokens: measured && measured.found ? measured.tokens.output : null,
      totalTokens: total,
      transcriptDirFound: measured?.found ?? false,
    };
  });

  if (attribution.unattributedDirs > 0) {
    info(
      `Unattributed: ${attribution.unattributedDirs} project dir(s) not mapped to a requested repo ` +
        `(${totalTokens(attribution.unattributed).toLocaleString('en-US')} tokens kept in a separate bucket).`,
    );
  }

  return { transcript, breakdown, attribution, roots };
}

/** Per-repo standards adoption + cohort classification (MEJORA 2). */
function collectAdoptionPhase(repoPaths: readonly string[]): RepoAdoption[] {
  info('Detecting standards-adoption markers per repo...');
  return repoPaths.map((path) => {
    const markers = detectAdoptionMarkers(path);
    const cls = classifyCohort(markers);
    return {
      path,
      markers,
      cohort: cls.cohort,
      retrofitLagDays: cls.retrofitLagDays,
      missingKeyMarkers: cls.missingKeyMarkers,
    };
  });
}

/** Memory corpus aggregation + context-cost proxy (MEJORA 3). */
function collectMemoryPhase(args: CollectArgs, roots: readonly string[]): MemoryMetrics {
  info('Measuring memory corpus and context-cost proxy...');
  const memoryRoot = defaultMemoryRoot();
  const notes = listMemoryNotes(memoryRoot);
  const corpus = aggregateMemory(notes, args.memoryBackendMigrationDate);
  const allFiles = findTranscripts([...roots]);
  const signals = computeMemorySignals({
    files: allFiles,
    since: args.since,
    until: args.until,
  });

  const memory: MemoryMetrics = {
    totalNotes: corpus.totalNotes,
    notesByProject: corpus.notesByProject,
    notesByWeek: corpus.notesByWeek,
    totalBytes: corpus.totalBytes,
    contextCost: signals.contextCost,
    reuse: signals.reuse,
  };
  // Only carry the before/after split when a migration date was configured.
  if (corpus.notesAfterMigration !== undefined) {
    memory.notesAfterMigration = corpus.notesAfterMigration;
  }
  if (corpus.notesBeforeMigration !== undefined) {
    memory.notesBeforeMigration = corpus.notesBeforeMigration;
  }

  // Warn about mtime-derived dates only when a migration date is configured
  // (otherwise the mtime fallback is just a normal best-effort, not unreliable).
  if (args.memoryBackendMigrationDate !== undefined && corpus.notesFromMtime > 0) {
    warn(
      `${corpus.notesFromMtime}/${corpus.totalNotes} memory note(s) have no \`created:\` frontmatter; ` +
        `their date falls back to mtime (UNRELIABLE before the ${args.memoryBackendMigrationDate} memory backend migration).`,
    );
  }

  return memory;
}

/** Reads the configured events file and returns events within the window. */
function collectEventsPhase(args: CollectArgs, adoption: readonly RepoAdoption[]): EventAnnotation[] {
  // MEJORA B: N-identity. With a single identity the per-account attribution
  // dimension is meaningless and is simply omitted downstream (report); with
  // 2+ it is enabled. Token attribution by ACCOUNT remains impossible either
  // way (transcripts do not store it) — orthogonal to identity count.
  if (args.emails.length === 0) {
    warn('No author identities resolved: git is filtered to ALL authors in the listed repos.');
  } else if (args.emails.length === 1) {
    info('Single identity: per-account attribution dimension omitted (not applicable).');
  } else {
    info(`${args.emails.length} identities: per-identity commit breakdown enabled.`);
  }

  // Auto-seed events (config + markers + optional memory migration) BEFORE
  // reading the window.
  if (args.seedEvents !== false) {
    seedEvents(args.eventsFile, adoption, args.configEvents, args.memoryBackendMigrationDate);
  }

  const allEvents = readEvents(args.eventsFile);
  return eventsInPeriod(allEvents, args.since, args.until);
}

/** Runs the collect command: produces a snapshot JSON file and returns its path. */
export function runCollect(args: CollectArgs): string {
  const { git, repoResults, repoPaths } = collectGitPhase(args);
  const { transcript, breakdown, attribution, roots } = collectTranscriptPhase(
    args,
    repoResults,
    repoPaths,
  );
  const adoption = collectAdoptionPhase(repoPaths);
  const memory = collectMemoryPhase(args, roots);
  const events = collectEventsPhase(args, adoption);

  const snapshot = buildSnapshot({
    label: args.label,
    since: args.since,
    until: args.until,
    authorEmails: args.emails,
    git,
    transcript,
    repoBreakdown: breakdown,
    unattributed: { tokens: attribution.unattributed, dirs: attribution.unattributedDirs },
    adoption,
    memory,
    events,
  });

  mkdirSync(args.outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${stamp}.json`;
  const outPath = join(args.outDir, fileName);
  writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + '\n', 'utf-8');

  success(`Snapshot written: ${outPath}`);
  if (snapshot.git.commits === 0 && transcript.messages === 0) {
    error('Both git and transcript metrics are empty. Check --repos and --emails.');
  }
  return outPath;
}
