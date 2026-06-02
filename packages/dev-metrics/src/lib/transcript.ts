import type { ToolCategory, TokenUsage } from '../types.js';

/** A raw, parsed line from a Claude Code `.jsonl` transcript. */
export interface TranscriptRecord {
  uuid?: string;
  type?: string;
  timestamp?: string;
  sessionId?: string;
  message?: {
    model?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
    content?: unknown;
  };
}

export interface ToolUseOp {
  name: string;
  filePath: string | null;
}

/**
 * Parses a single JSONL line into a `TranscriptRecord`, or `null` if the
 * line is blank or not valid JSON. Pure: never throws on bad input.
 */
export function parseTranscriptLine(line: string): TranscriptRecord | null {
  const trimmed = line.trim();
  if (trimmed === '') return null;
  try {
    return JSON.parse(trimmed) as TranscriptRecord;
  } catch {
    return null;
  }
}

/**
 * Deduplicates records by `uuid`, preserving first-seen order. Records
 * without a uuid are always kept (cannot be proven duplicate). The backup
 * transcript dir and the live dir overlap, so this is required to avoid
 * double-counting (see ADR-0006 caveat 2).
 *
 * Returns the kept records and how many were dropped as duplicates.
 */
export function dedupByUuid<T extends { uuid?: string }>(
  records: readonly T[],
): { kept: T[]; dropped: number } {
  const seen = new Set<string>();
  const kept: T[] = [];
  let dropped = 0;

  for (const record of records) {
    const id = record.uuid;
    if (id === undefined || id === '') {
      kept.push(record);
      continue;
    }
    if (seen.has(id)) {
      dropped++;
      continue;
    }
    seen.add(id);
    kept.push(record);
  }

  return { kept, dropped };
}

/** Maps a raw tool_use name onto one of our tracked categories. */
export function classifyTool(name: string): ToolCategory {
  switch (name) {
    case 'Write':
      return 'Write';
    case 'Edit':
    case 'MultiEdit':
      return 'Edit';
    case 'Read':
      return 'Read';
    case 'Bash':
      return 'Bash';
    default:
      return 'Other';
  }
}

/** Returns an empty token-usage accumulator. */
export function emptyTokenUsage(): TokenUsage {
  return { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 };
}

/** Adds a record's usage into an accumulator (mutates and returns it). */
export function addUsage(acc: TokenUsage, record: TranscriptRecord): TokenUsage {
  const usage = record.message?.usage;
  if (!usage) return acc;
  acc.input += usage.input_tokens ?? 0;
  acc.output += usage.output_tokens ?? 0;
  acc.cacheCreation += usage.cache_creation_input_tokens ?? 0;
  acc.cacheRead += usage.cache_read_input_tokens ?? 0;
  return acc;
}

/** Total of all token kinds. */
export function totalTokens(usage: TokenUsage): number {
  return usage.input + usage.output + usage.cacheCreation + usage.cacheRead;
}

/**
 * Extracts every `tool_use` op from a record's message content. Pulls the
 * `file_path` input when present (used for per-file iteration metrics).
 */
export function extractToolUses(record: TranscriptRecord): ToolUseOp[] {
  const content = record.message?.content;
  if (!Array.isArray(content)) return [];

  const ops: ToolUseOp[] = [];
  for (const block of content) {
    if (
      typeof block === 'object' &&
      block !== null &&
      (block as { type?: string }).type === 'tool_use'
    ) {
      const b = block as { name?: string; input?: { file_path?: string } };
      const name = b.name ?? '';
      const filePath = typeof b.input?.file_path === 'string' ? b.input.file_path : null;
      ops.push({ name, filePath });
    }
  }
  return ops;
}
