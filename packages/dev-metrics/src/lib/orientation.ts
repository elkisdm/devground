import type { TranscriptRecord } from './transcript.js';
import { classifyTool, extractToolUses, dedupByUuid } from './transcript.js';
import { median } from './stats.js';

/**
 * Orientation cost = the output tokens a session spends BEFORE its first
 * Write/Edit. It is the "where does this live / how is this built" tax the agent
 * pays to get its bearings before changing code. The hypothesis a code map is
 * meant to pay off: reading `codemap.md` first should lower that tax.
 *
 * v2 addresses the two confounds ADR-0015 flagged in v1:
 *  - SIZE: absolute orientation tokens scale with task size, so we also report
 *    `orientationShare` = orientation / total session output. A share is robust
 *    to task size in a way absolute tokens are not.
 *  - DENOMINATOR: the codemap read-vs-not comparison is restricted to sessions
 *    in repos that ACTUALLY HAVE a codemap, removing the contamination from
 *    sessions where there was no map to read (e.g. before it was seeded).
 *
 * Still CORRELATIONAL: a session reads the map because the task is hard, and
 * hard tasks cost more orientation regardless. The share metric narrows that gap
 * but does not close it. Track the trend; do not read causality.
 */

const CODEMAP_RE = /(^|\/)codemap\.md$/i;

/** One transcript record tagged with its session and project (repo) dir. */
export interface SessionSource {
  sessionId: string;
  /** The `~/.claude/projects/<DIR>` folder name — maps a session to a repo. */
  projectDir: string;
  record: TranscriptRecord;
}

export interface SessionOrientation {
  sessionId: string;
  projectDir: string;
  /** Output tokens accumulated before the first Write/Edit. */
  orientationOutputTokens: number;
  /** Output tokens across the whole session (for the size-robust share). */
  totalOutputTokens: number;
  /** Whether the session ever reached a Write/Edit (a "coding" session). */
  reachedEdit: boolean;
  /** Whether the session Read a `codemap.md` before its first edit. */
  readCodemap: boolean;
}

function isEdit(name: string): boolean {
  const c = classifyTool(name);
  return c === 'Write' || c === 'Edit';
}

function outputOf(record: TranscriptRecord): number {
  if (record.type !== 'assistant') return 0;
  return record.message?.usage?.output_tokens ?? 0;
}

/** orientation / total session output. `null` when the session emitted no output. */
export function orientationShare(s: SessionOrientation): number | null {
  if (s.totalOutputTokens === 0) return null;
  return s.orientationOutputTokens / s.totalOutputTokens;
}

/**
 * Computes orientation for one session from its records IN CHRONOLOGICAL ORDER.
 * Pure — no IO — so the methodology is unit-testable with synthetic records.
 */
export function orientationForSession(
  sessionId: string,
  projectDir: string,
  records: readonly TranscriptRecord[],
): SessionOrientation {
  let orientationTokens = 0;
  let totalTokens = 0;
  let reachedEdit = false;
  let readCodemap = false;
  let editSeen = false;

  for (const record of records) {
    const ops = extractToolUses(record);
    if (!editSeen && ops.some((o) => o.name === 'Read' && o.filePath !== null && CODEMAP_RE.test(o.filePath))) {
      readCodemap = true;
    }
    const out = outputOf(record);
    totalTokens += out;
    if (!editSeen) {
      orientationTokens += out; // the turn that decides to edit still counts as orientation
      if (ops.some((o) => isEdit(o.name))) {
        editSeen = true;
        reachedEdit = true;
      }
    }
  }

  return {
    sessionId,
    projectDir,
    orientationOutputTokens: orientationTokens,
    totalOutputTokens: totalTokens,
    reachedEdit,
    readCodemap,
  };
}

/** Groups deduped sources by session, preserving order and the project dir. */
export function groupBySession(sources: readonly SessionSource[]): Map<string, SessionSource[]> {
  const { kept } = dedupByUuid(sources.map((s) => ({ ...s, uuid: s.record.uuid })));
  const bySession = new Map<string, SessionSource[]>();
  for (const source of kept) {
    const list = bySession.get(source.sessionId) ?? [];
    list.push(source);
    bySession.set(source.sessionId, list);
  }
  return bySession;
}

export interface SegmentStat {
  sessions: number;
  medianTokens: number | null;
  medianShare: number | null;
}

export interface OrientationReport {
  codingSessions: number;
  nonCodingSessions: number;
  overall: SegmentStat;
  /** Coding sessions that ran in a repo which has a codemap. */
  codemapRepoSessions: number;
  /** Within codemap-having repos: sessions that read the map. */
  withCodemap: SegmentStat;
  /** Within codemap-having repos: sessions that did not read the map. */
  withoutCodemap: SegmentStat;
}

function statOf(sessions: readonly SessionOrientation[]): SegmentStat {
  const shares = sessions.map(orientationShare).filter((x): x is number => x !== null);
  return {
    sessions: sessions.length,
    medianTokens: median(sessions.map((s) => s.orientationOutputTokens)),
    medianShare: median(shares),
  };
}

/**
 * Aggregates per-session orientation into the report. The codemap comparison is
 * restricted to `codemapRepoDirs` (the project dirs of repos that have a codemap)
 * so "did not read" excludes repos where there was nothing to read.
 */
export function aggregateOrientation(
  sessions: readonly SessionOrientation[],
  codemapRepoDirs: ReadonlySet<string>,
): OrientationReport {
  const coding = sessions.filter((s) => s.reachedEdit);
  const inCodemapRepo = coding.filter((s) => codemapRepoDirs.has(s.projectDir));
  return {
    codingSessions: coding.length,
    nonCodingSessions: sessions.length - coding.length,
    overall: statOf(coding),
    codemapRepoSessions: inCodemapRepo.length,
    withCodemap: statOf(inCodemapRepo.filter((s) => s.readCodemap)),
    withoutCodemap: statOf(inCodemapRepo.filter((s) => !s.readCodemap)),
  };
}

/** End-to-end: from tagged sources to the report. */
export function computeOrientation(
  sources: readonly SessionSource[],
  codemapRepoDirs: ReadonlySet<string>,
): OrientationReport {
  const bySession = groupBySession(sources);
  const perSession: SessionOrientation[] = [];
  for (const [sessionId, list] of bySession) {
    perSession.push(orientationForSession(sessionId, list[0]!.projectDir, list.map((s) => s.record)));
  }
  return aggregateOrientation(perSession, codemapRepoDirs);
}

function tok(n: number | null): string {
  return n === null ? '—' : `${Math.round(n).toLocaleString('en-US')} tok`;
}

function share(n: number | null): string {
  return n === null ? '—' : `${Math.round(n * 100)}%`;
}

/** Renders the orientation report as markdown. */
export function renderOrientation(r: OrientationReport): string {
  const lines: string[] = [];
  lines.push('# Orientation cost (output tokens before first edit)');
  lines.push('');
  lines.push(`Coding sessions: **${r.codingSessions}** · excluded non-coding (no edit): ${r.nonCodingSessions}`);
  lines.push(
    `Overall median: **${tok(r.overall.medianTokens)}** · median share of session output: **${share(r.overall.medianShare)}**`,
  );
  lines.push('');
  lines.push(`## Code map payoff (within the ${r.codemapRepoSessions} sessions in codemap-having repos)`);
  lines.push('');
  lines.push('| segment | sessions | median orientation | median share |');
  lines.push('|---|--:|--:|--:|');
  lines.push(`| read codemap.md first | ${r.withCodemap.sessions} | ${tok(r.withCodemap.medianTokens)} | ${share(r.withCodemap.medianShare)} |`);
  lines.push(`| did not | ${r.withoutCodemap.sessions} | ${tok(r.withoutCodemap.medianTokens)} | ${share(r.withoutCodemap.medianShare)} |`);
  lines.push('');
  lines.push(
    '> ⚠️ CORRELATIONAL (ADR-0015): a session reads the map because the task is hard, and ' +
      'hard tasks cost more orientation regardless. The share metric narrows that confound ' +
      'but does not close it. Track the trend; do not read causality.',
  );
  return lines.join('\n');
}
