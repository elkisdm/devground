import { readFileSync } from 'node:fs';
import {
  parseTranscriptLine,
  type TranscriptRecord,
} from '@devground/dev-metrics/transcript';
import type { DistilledSession, Turn } from '../types.js';

/**
 * The raw JSONL line carries session metadata (title, branch, cwd) that the
 * shared `TranscriptRecord` type doesn't model. We reuse the shared parser and
 * widen the result to read those extra top-level fields.
 */
interface RawExtras {
  aiTitle?: string;
  gitBranch?: string;
  cwd?: string;
}
type RawRecord = TranscriptRecord & RawExtras;

// User-string turns that are harness/command noise, not real user typing.
const NOISE_MARKERS = ['<command-name>', '<local-command-stdout>', '<local-command-caveat>'];
const NOISE_PREFIXES = [
  '<local-command-caveat>',
  '<command-name>',
  '<command-message>',
  '<command-args>',
  '<local-command-stdout>',
  '<bash-',
  '<user-prompt-submit-hook>',
  'Caveat:',
];

/** True when a user string is command/caveat noise rather than real input. */
export function isNoiseUser(s: string): boolean {
  const t = s.replace(/^\s+/, '');
  const head = t.slice(0, 400);
  if (NOISE_MARKERS.some((m) => head.includes(m))) return true;
  return NOISE_PREFIXES.some((p) => t.startsWith(p));
}

/** Extracts plain text from a message.content (string or block array). */
export function textFromContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const block of content) {
      if (
        typeof block === 'object' &&
        block !== null &&
        (block as { type?: string }).type === 'text'
      ) {
        const text = (block as { text?: string }).text;
        if (text) parts.push(text);
      }
    }
    return parts.join('\n');
  }
  return '';
}

/** Pulls short tool-failure signals out of a user (tool_result) message. */
export function errorSignals(content: unknown): string[] {
  const sigs: string[] = [];
  if (!Array.isArray(content)) return sigs;
  for (const block of content) {
    if (
      typeof block === 'object' &&
      block !== null &&
      (block as { type?: string }).type === 'tool_result' &&
      (block as { is_error?: boolean }).is_error === true
    ) {
      let c: unknown = (block as { content?: unknown }).content;
      if (Array.isArray(c)) {
        c = c
          .map((x) => (typeof x === 'object' && x !== null ? (x as { text?: string }).text ?? '' : ''))
          .join(' ');
      }
      sigs.push(String(c).slice(0, 180).replace(/\n/g, ' '));
    }
  }
  return sigs;
}

/**
 * Distills an ordered list of parsed records for ONE session into its spine:
 * real user turns + assistant text + tool-error signals, plus session metadata.
 * Returns null if the session is empty or its last activity predates `lower`.
 * Pure over the records — the file read lives in `distillFile`.
 */
export function distillRecords(
  session: string,
  records: readonly RawRecord[],
  lower: Date | null,
): DistilledSession | null {
  const userTurns: Turn[] = [];
  const assistantTurns: Turn[] = [];
  const errors: string[] = [];
  let firstTs: string | null = null;
  let lastTs: string | null = null;
  let title: string | null = null;
  let branch: string | null = null;
  let cwd: string | null = null;

  for (const o of records) {
    const ts = o.timestamp ?? null;
    if (ts) {
      firstTs = firstTs ?? ts;
      lastTs = ts;
    }
    title = title ?? o.aiTitle ?? null;
    branch = branch ?? o.gitBranch ?? null;
    cwd = cwd ?? o.cwd ?? null;
    const content = o.message?.content;
    if (o.type === 'user') {
      const txt = textFromContent(content);
      if ((typeof content === 'string' || (Array.isArray(content) && txt)) && txt && !isNoiseUser(txt)) {
        userTurns.push({ ts, text: txt.trim() });
      }
      errors.push(...errorSignals(content));
    } else if (o.type === 'assistant') {
      const txt = textFromContent(content).trim();
      if (txt) assistantTurns.push({ ts, text: txt });
    }
  }

  if (lastTs && lower && new Date(lastTs) < lower) return null;
  if (userTurns.length === 0 && errors.length === 0) return null;

  return { session, title, branch, cwd, firstTs, lastTs, userTurns, assistantTurns, errors };
}

/** Reads one transcript file (reusing the shared line parser) and distills it. */
export function distillFile(path: string, lower: Date | null): DistilledSession | null {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf-8');
  } catch {
    return null;
  }
  const records: RawRecord[] = [];
  for (const line of raw.split('\n')) {
    const rec = parseTranscriptLine(line) as RawRecord | null;
    if (rec !== null) records.push(rec);
  }
  const session = path.replace(/^.*\//, '').replace(/\.jsonl$/, '');
  return distillRecords(session, records, lower);
}
