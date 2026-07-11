import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCreatedFrontmatter } from '@devground/dev-metrics/memory';
import type { MemorySnapshot } from '../types.js';

export interface Frontmatter {
  name: string;
  description: string;
  type: string;
  created: string;
  updated: string;
}

/**
 * Parses the leading `---`-delimited frontmatter block of a memory note.
 * Handles flat top-level keys and one level of `metadata:` nesting (where
 * `type`/`created`/`updated` live). Reuses dev-metrics' `parseCreatedFrontmatter`
 * for the created date so both tools agree on it. Returns '' for missing fields.
 */
export function parseFrontmatter(content: string): Frontmatter {
  const fm: Frontmatter = { name: '', description: '', type: '', created: '', updated: '' };
  if (!content.startsWith('---')) return fm;
  const end = content.indexOf('\n---', 3);
  if (end === -1) return fm;
  const block = content.slice(3, end);
  let inMeta = false;
  for (const raw of block.split('\n')) {
    if (raw.trim() === '') continue;
    if (/^metadata\s*:/.test(raw)) {
      inMeta = true;
      continue;
    }
    const m = /^(\s*)([\w-]+)\s*:\s*(.*)$/.exec(raw);
    if (!m) {
      inMeta = false;
      continue;
    }
    const indent = m[1] ?? '';
    const key = m[2] ?? '';
    const val = unquote((m[3] ?? '').trim());
    if (inMeta && indent) {
      if (key === 'type') fm.type = val;
      else if (key === 'created') fm.created = val;
      else if (key === 'updated') fm.updated = val;
    } else {
      inMeta = false;
      if (key === 'name') fm.name = val;
      else if (key === 'description') fm.description = val;
    }
  }
  // Prefer the shared parser's created date when our flat scan missed it.
  if (!fm.created) fm.created = parseCreatedFrontmatter(content) ?? '';
  return fm;
}

function unquote(v: string): string {
  if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) {
    return v.slice(1, -1);
  }
  return v;
}

/** Snapshots every memory note in a memory dir (excludes MEMORY.md). */
export function snapshotMemory(memDir: string): MemorySnapshot[] {
  if (!existsSync(memDir)) return [];
  const out: MemorySnapshot[] = [];
  for (const entry of readdirSync(memDir).sort()) {
    if (!entry.endsWith('.md') || entry === 'MEMORY.md') continue;
    let content: string;
    try {
      content = readFileSync(join(memDir, entry), 'utf-8');
    } catch {
      continue;
    }
    const fm = parseFrontmatter(content);
    out.push({
      file: entry,
      name: fm.name || entry.replace(/\.md$/, ''),
      description: fm.description,
      type: fm.type || '?',
      created: fm.created || '?',
      updated: fm.updated,
      bodyLen: content.length,
    });
  }
  return out;
}

/** Reads the MEMORY.md index verbatim, or '' if absent. */
export function readIndex(memDir: string): string {
  const p = join(memDir, 'MEMORY.md');
  if (!existsSync(p)) return '';
  try {
    return readFileSync(p, 'utf-8');
  } catch {
    return '';
  }
}
