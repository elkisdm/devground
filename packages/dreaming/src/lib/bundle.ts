import type { DistilledSession, MemorySnapshot } from '../types.js';

export interface RenderInput {
  project: string;
  memDir: string;
  generatedAt: string;
  windowSince: Date | null;
  memories: MemorySnapshot[];
  index: string;
  sessions: DistilledSession[];
  perSessionChars: number;
}

const iso16 = (s: string | null): string => (s ? s.slice(0, 16) : '?');

/** Renders the compact markdown bundle the agent reasons over. Pure. */
export function renderBundle(input: RenderInput): string {
  const { project, memDir, generatedAt, windowSince, memories, index, sessions, perSessionChars } = input;
  const out: string[] = [];
  out.push(`# DREAMING BUNDLE — ${project}`);
  out.push(`generated: ${generatedAt}`);
  out.push(`memory_dir: ${memDir}`);
  out.push(`window_since: ${windowSince ? windowSince.toISOString() : 'ALL'}`);
  out.push(`memories: ${memories.length}   sessions_in_window: ${sessions.length}`);
  out.push('');
  out.push('---');
  out.push('## MEMORY STORE (current)');
  out.push('');
  out.push('| file | type | created | updated | chars | description |');
  out.push('|------|------|---------|---------|-------|-------------|');
  for (const m of memories) {
    const desc = (m.description || '').replace(/\|/g, '\\|').slice(0, 140);
    out.push(`| ${m.file} | ${m.type} | ${m.created} | ${m.updated || '—'} | ${m.bodyLen} | ${desc} |`);
  }
  out.push('');
  out.push('### MEMORY.md index (verbatim)');
  out.push('```markdown');
  out.push(index.trim());
  out.push('```');
  out.push('');
  out.push('---');
  out.push('## RECENT SESSIONS (distilled)');
  out.push('');
  for (const s of sessions) {
    out.push(`### session ${s.session.slice(0, 8)} — ${s.title ?? '(sin título)'}`);
    const meta: string[] = [];
    if (s.lastTs) meta.push(`last: ${iso16(s.lastTs)}`);
    if (s.branch) meta.push(`branch: ${s.branch}`);
    if (s.cwd) meta.push(`cwd: ${s.cwd}`);
    out.push(meta.join('  ·  '));
    out.push('');
    let budget = perSessionChars;
    if (s.userTurns.length) {
      out.push('**User turns:**');
      for (const t of s.userTurns) {
        const clean = t.text.replace(/\s+/g, ' ').trim();
        if (!clean) continue;
        const snip = clean.slice(0, 600);
        out.push(`- (${iso16(t.ts)}) ${snip}`);
        budget -= snip.length;
        if (budget <= 0) {
          out.push('- …(truncated)');
          break;
        }
      }
    }
    if (s.errors.length) {
      out.push('');
      out.push('**Tool errors (signals):**');
      for (const e of s.errors.slice(0, 8)) out.push(`- ${e}`);
    }
    if (s.assistantTurns.length) {
      const last = s.assistantTurns[s.assistantTurns.length - 1]?.text ?? '';
      const clean = last.replace(/\s+/g, ' ').trim().slice(0, 400);
      if (clean) {
        out.push('');
        out.push(`**Assistant (last reply, trimmed):** ${clean}`);
      }
    }
    out.push('');
    out.push('---');
    out.push('');
  }
  return out.join('\n');
}
