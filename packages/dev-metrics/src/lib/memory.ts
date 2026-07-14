import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { homedir } from 'node:os';
import type { TokenUsage } from '../types.js';
import {
  parseTranscriptLine,
  dedupByUuid,
  emptyTokenUsage,
  addUsage,
  extractToolUses,
  type TranscriptRecord,
} from './transcript.js';

/** One memory note's metadata. */
export interface MemoryNote {
  project: string;
  file: string;
  /**
   * Content date (YYYY-MM-DD). Taken from the `created:` frontmatter field,
   * which is mtime-reset proof and is the robust default. Falls back to the
   * file mtime ONLY when `created` is missing/unparseable. That mtime fallback
   * can be unreliable if a memory-backend migration reset mtimes — see
   * `DevMetricsConfig.memoryBackendMigrationDate`. `dateSource` records which
   * one was used.
   */
  date: string;
  dateSource: 'frontmatter' | 'mtime';
  bytes: number;
}

const FRONTMATTER_DATE_RE = /^created\s*:\s*['"]?(\d{4}-\d{2}-\d{2})/;

/**
 * Extracts the `created: YYYY-MM-DD` date from a markdown note's YAML
 * frontmatter, or `null` when there is no frontmatter / no `created` field.
 * Pure: operates on the file content string, so it is unit-testable. Only the
 * leading `---`-delimited block is inspected (a `created:` deeper in the body
 * is ignored).
 */
export function parseCreatedFrontmatter(content: string): string | null {
  if (!content.startsWith('---')) return null;
  const lines = content.split('\n');
  // line 0 is the opening '---'; scan until the closing '---'.
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (line.trim() === '---') break; // end of frontmatter
    const m = FRONTMATTER_DATE_RE.exec(line.trim());
    if (m !== null) return m[1] ?? null;
  }
  return null;
}

/** Aggregated memory-corpus metrics. */
export interface MemoryCorpus {
  /** Count of `.md` notes (excluding the MEMORY.md index). */
  totalNotes: number;
  /** Notes grouped by owning project dir. */
  notesByProject: Record<string, number>;
  /** New notes per ISO week (`YYYY-Www`), by note date (`created:` frontmatter). */
  notesByWeek: Record<string, number>;
  /**
   * Notes on/after a configured memory-backend migration date (mtime-reliable).
   * `undefined` when no migration date was supplied: without a known migration
   * there is nothing to split, so the field is simply omitted.
   */
  notesAfterMigration?: number;
  /** Notes before the migration date (mtime UNRELIABLE — see caveat). */
  notesBeforeMigration?: number;
  /** Total bytes of memory corpus (proxy for context volume). */
  totalBytes: number;
  /**
   * Notes whose date came from mtime (no `created:` frontmatter). A non-zero
   * value flags notes whose date is mtime-derived (unreliable if a backend
   * migration reset mtimes).
   */
  notesFromMtime: number;
}

/** ISO-week label `YYYY-Www` for a YYYY-MM-DD date. */
export function isoWeek(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  // ISO week: Thursday-based.
  const day = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Default memory root: the live `~/.claude/projects` dir. */
export function defaultMemoryRoot(home = homedir()): string {
  return join(home, '.claude', 'projects');
}

/** Enumerates memory `.md` notes (excluding `MEMORY.md`) under a projects root. */
export function listMemoryNotes(projectsRoot: string): MemoryNote[] {
  if (!existsSync(projectsRoot)) return [];
  const notes: MemoryNote[] = [];
  for (const project of readdirSync(projectsRoot)) {
    const memDir = join(projectsRoot, project, 'memory');
    if (!existsSync(memDir)) continue;
    for (const entry of readdirSync(memDir)) {
      if (!entry.endsWith('.md')) continue;
      if (entry === 'MEMORY.md') continue; // the index, not a memory
      const full = join(memDir, entry);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (!st.isFile()) continue;

      // Prefer the `created:` frontmatter date (mtime-reset proof). Fall back
      // to mtime only when it is absent/unparseable.
      let created: string | null = null;
      try {
        created = parseCreatedFrontmatter(readFileSync(full, 'utf-8'));
      } catch {
        created = null;
      }
      const date = created ?? st.mtime.toISOString().slice(0, 10);
      notes.push({
        project,
        file: full,
        date,
        dateSource: created !== null ? 'frontmatter' : 'mtime',
        bytes: st.size,
      });
    }
  }
  return notes;
}

/**
 * Aggregates a list of memory notes into corpus metrics. Pure.
 *
 * `migrationDate` is OPTIONAL and backend-agnostic. When provided (a
 * `YYYY-MM-DD` date on which a memory-backend migration may have reset
 * mtimes), notes are split into before/after that date. When omitted (the
 * default), no split is computed and `notesBeforeMigration`/`notesAfterMigration`
 * are left `undefined` — note dates still come from the robust `created:`
 * frontmatter, no tool is assumed.
 */
export function aggregateMemory(
  notes: readonly MemoryNote[],
  migrationDate?: string,
): MemoryCorpus {
  const notesByProject: Record<string, number> = {};
  const notesByWeek: Record<string, number> = {};
  let totalBytes = 0;
  let after = 0;
  let before = 0;
  let fromMtime = 0;

  for (const n of notes) {
    notesByProject[n.project] = (notesByProject[n.project] ?? 0) + 1;
    const week = isoWeek(n.date);
    notesByWeek[week] = (notesByWeek[week] ?? 0) + 1;
    totalBytes += n.bytes;
    if (migrationDate !== undefined) {
      if (n.date >= migrationDate) after++;
      else before++;
    }
    if (n.dateSource === 'mtime') fromMtime++;
  }

  const corpus: MemoryCorpus = {
    totalNotes: notes.length,
    notesByProject,
    notesByWeek,
    totalBytes,
    notesFromMtime: fromMtime,
  };
  if (migrationDate !== undefined) {
    corpus.notesAfterMigration = after;
    corpus.notesBeforeMigration = before;
  }
  return corpus;
}

/**
 * "Context cost" PROXY: output tokens spent in the first N assistant messages
 * of each session = cost of re-establishing context at the start. Lower over
 * time suggests better long-term continuity (less re-priming needed). This is
 * a PROXY, not a direct measure of memory effectiveness.
 */
export interface ContextCost {
  /** Sessions that contributed at least one early assistant message. */
  sessions: number;
  /** Sum of output tokens across the first N messages of every session. */
  earlyOutputTokens: number;
  /** Mean early-output tokens per session (the trend metric; lower = better). */
  meanEarlyOutputPerSession: number | null;
  /** How many leading assistant messages were counted per session. */
  firstN: number;
}

/**
 * Reuse signal: how many sessions performed a `Read` tool_use on a path
 * containing `/memory/`. If transcripts do not expose tool inputs cleanly this
 * stays 0 and the limitation is documented; the other proxies still hold.
 */
export interface MemoryReuse {
  /** Sessions with >= 1 Read of a `/memory/` path. */
  sessionsReadingMemory: number;
  /** Total `/memory/` Read ops across all sessions. */
  memoryReadOps: number;
}

export interface MemorySignals {
  contextCost: ContextCost;
  reuse: MemoryReuse;
}

export interface SessionRecord {
  sessionId: string;
  record: TranscriptRecord;
}

/** Reads + parses all records under transcript files, tagging sessionId. */
export function readSessionRecords(files: readonly string[]): SessionRecord[] {
  const all: SessionRecord[] = [];
  for (const file of files) {
    const raw = readFileSync(file, 'utf-8');
    for (const line of raw.split('\n')) {
      const record = parseTranscriptLine(line);
      if (record === null) continue;
      all.push({ sessionId: record.sessionId ?? file, record });
    }
  }
  return all;
}

/** Within-period filter (missing ts kept). */
function inPeriod(ts: string | undefined, since: string | null, until: string | null): boolean {
  if (!ts) return true;
  const day = ts.slice(0, 10);
  if (since !== null && day < since) return false;
  if (until !== null && day > until) return false;
  return true;
}

export interface MemorySignalsOptions {
  files: readonly string[];
  since: string | null;
  until: string | null;
  firstN?: number;
}

/**
 * Computes the context-cost proxy and memory-reuse signal from an
 * already-deduped, already-period-filtered list of session records. Pure.
 */
export function memorySignalsFromRecords(
  records: readonly SessionRecord[],
  firstN = 3,
): MemorySignals {
  // Group assistant messages per session in encountered order.
  const assistantBySession = new Map<string, TranscriptRecord[]>();
  const memoryReadSessions = new Set<string>();
  let memoryReadOps = 0;

  for (const { sessionId, record } of records) {
    if (record.type === 'assistant' && record.message?.usage) {
      const list = assistantBySession.get(sessionId) ?? [];
      list.push(record);
      assistantBySession.set(sessionId, list);
    }
    for (const op of extractToolUses(record)) {
      if (op.name === 'Read' && op.filePath !== null && op.filePath.includes('/memory/')) {
        memoryReadOps++;
        memoryReadSessions.add(sessionId);
      }
    }
  }

  let earlyOutputTokens = 0;
  let sessions = 0;
  for (const list of assistantBySession.values()) {
    sessions++;
    const usage: TokenUsage = emptyTokenUsage();
    for (const record of list.slice(0, firstN)) addUsage(usage, record);
    earlyOutputTokens += usage.output;
  }

  return {
    contextCost: {
      sessions,
      earlyOutputTokens,
      meanEarlyOutputPerSession: sessions === 0 ? null : earlyOutputTokens / sessions,
      firstN,
    },
    reuse: {
      sessionsReadingMemory: memoryReadSessions.size,
      memoryReadOps,
    },
  };
}

/**
 * Computes the context-cost proxy and memory-reuse signal from raw transcript
 * files. Records are deduped by uuid (live+backup overlap) and period-filtered.
 */
export function computeMemorySignals(opts: MemorySignalsOptions): MemorySignals {
  const firstN = opts.firstN ?? 3;
  const records = readSessionRecords(opts.files);

  const { kept } = dedupByUuid(records.map((sr) => ({ ...sr, uuid: sr.record.uuid })));
  const filtered = kept.filter((sr) => inPeriod(sr.record.timestamp, opts.since, opts.until));

  return memorySignalsFromRecords(filtered, firstN);
}

/** Convenience helper used by the report. */
export function memoryProjectLabel(project: string): string {
  return basename(project);
}
