import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type {
  RepoBreakdown,
  RepoAdoption,
  EventAnnotation,
} from '../types.js';
import { collectGitRepo, mergeGitMetrics, isGitRepo, type GitRepoResult } from '../lib/git.js';
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
  OBSIDIAN_ADOPTION_DATE,
} from '../lib/memory.js';
import { findTranscripts } from '../lib/transcript-collect.js';
import { totalTokens } from '../lib/transcript.js';
import { buildSnapshot } from '../lib/snapshot.js';
import { readEvents, eventsInPeriod, addEvent } from '../lib/events.js';
import { info, success, warn, error } from '../lib/logger.js';

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
}

/**
 * Auto-seeds events.json with markers worth aligning diffs against: the
 * Obsidian memory adoption, plus each repo's key adoption markers. Idempotent
 * by (date,label): readEvents/addEvent re-sort and we skip already-present.
 */
function seedEvents(
  eventsFile: string,
  adoption: readonly RepoAdoption[],
  configEvents: readonly EventAnnotation[] = [],
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

  // MEJORA 3: the Obsidian memory adoption.
  push(OBSIDIAN_ADOPTION_DATE, 'Obsidian memory', 'Adopted persistent memory vault (continuity, not churn)');

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

/** Runs the collect command: produces a snapshot JSON file and returns its path. */
export function runCollect(args: CollectArgs): string {
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

  const git = mergeGitMetrics(repoResults);

  info('Collecting Claude Code transcript metrics...');
  const roots = args.transcriptRoots ?? defaultTranscriptRoots();
  if (roots.length === 0) {
    warn('No transcript roots found (~/.claude/projects missing). Transcript metrics will be zero.');
  }
  const transcript = collectTranscripts({ roots, since: args.since, until: args.until });

  // MEJORA 1: REAL per-repo token attribution. Each repo's tokens are MEASURED
  // from its `~/.claude/projects/<DIR>` transcripts (live + backup), deduped by
  // uuid and period-filtered. The only thing still inattributable is the
  // ACCOUNT (personal vs work) that paid — NOT the project. See ADR-0006.
  info('Attributing tokens to repos by project directory...');
  const attribution = attributeTokensByRepo({
    repoPaths,
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

  // MEJORA 2: per-repo standards adoption + cohort.
  info('Detecting standards-adoption markers per repo...');
  const adoption: RepoAdoption[] = repoPaths.map((path) => {
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

  // MEJORA 3: memory corpus + context-cost proxy.
  info('Measuring memory corpus and context-cost proxy...');
  const memoryRoot = defaultMemoryRoot();
  const notes = listMemoryNotes(memoryRoot);
  const corpus = aggregateMemory(notes);
  const allFiles = findTranscripts(roots);
  const signals = computeMemorySignals({
    files: allFiles,
    since: args.since,
    until: args.until,
  });

  const memory = {
    totalNotes: corpus.totalNotes,
    notesByProject: corpus.notesByProject,
    notesByWeek: corpus.notesByWeek,
    notesAfterAdoption: corpus.notesAfterAdoption,
    notesBeforeAdoption: corpus.notesBeforeAdoption,
    totalBytes: corpus.totalBytes,
    contextCost: signals.contextCost,
    reuse: signals.reuse,
  };

  // MEJORA D: warn if any memory note fell back to mtime (no `created:`).
  if (corpus.notesFromMtime > 0) {
    warn(
      `${corpus.notesFromMtime}/${corpus.totalNotes} memory note(s) have no \`created:\` frontmatter; ` +
        `their date falls back to mtime (UNRELIABLE before the 2026-05-16 migration).`,
    );
  }

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

  // Auto-seed events (config + markers + Obsidian) BEFORE reading the window.
  if (args.seedEvents !== false) {
    seedEvents(args.eventsFile, adoption, args.configEvents);
  }

  const allEvents = readEvents(args.eventsFile);
  const events = eventsInPeriod(allEvents, args.since, args.until);

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
