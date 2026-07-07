import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defaultMemoryRoot } from '@devground/dev-metrics/memory';
import type { DistilledSession } from '../types.js';
import { distillFile } from './distill.js';
import { snapshotMemory, readIndex } from './memory.js';
import { resolveWindow } from './window.js';
import { renderBundle } from './bundle.js';

export interface GatherOptions {
  project: string;
  days: number;
  since: string;
  forceDays: boolean;
  maxSessions: number;
  perSessionChars: number;
  out?: string;
  root?: string; // projects root override (defaults to ~/.claude/projects)
  now?: Date;
}

export interface GatherResult {
  project: string;
  memoryDir: string;
  windowSince: string | null;
  memories: number;
  sessionsInWindow: number;
  bundle: string;
  bundleChars: number;
}

/** Resolves (memoryDir, transcriptsDir) for an encoded project name. */
export function resolveProject(root: string, project: string): { memDir: string; projDir: string } {
  const projDir = join(root, project);
  if (!existsSync(projDir)) {
    const available = readdirSync(root)
      .filter((p) => existsSync(join(root, p, 'memory')))
      .sort();
    throw new Error(`project dir not found: ${projDir}\navailable:\n  ${available.join('\n  ')}`);
  }
  const memDir = join(projDir, 'memory');
  if (!existsSync(memDir)) throw new Error(`no memory/ under ${projDir}`);
  return { memDir, projDir };
}

/**
 * The full deterministic gather: pick in-window transcripts, distill them,
 * snapshot the memory store, render + write the bundle. Never touches memory.
 */
export function gather(opts: GatherOptions): GatherResult {
  const root = opts.root ?? defaultMemoryRoot();
  const now = opts.now ?? new Date();
  const { memDir, projDir } = resolveProject(root, opts.project);
  const lower = resolveWindow(memDir, {
    days: opts.days,
    since: opts.since,
    forceDays: opts.forceDays,
    now,
  });

  const transcripts = readdirSync(projDir)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => join(projDir, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);

  const sessions: DistilledSession[] = [];
  for (const path of transcripts) {
    const mtime = new Date(statSync(path).mtimeMs);
    if (lower && mtime < lower) continue; // cheap pre-filter
    const d = distillFile(path, lower);
    if (d) sessions.push(d);
    if (sessions.length >= opts.maxSessions) break;
  }
  sessions.sort((a, b) => (b.lastTs ?? '').localeCompare(a.lastTs ?? ''));

  const memories = snapshotMemory(memDir);
  const index = readIndex(memDir);
  const bundle = renderBundle({
    project: opts.project,
    memDir,
    generatedAt: now.toISOString(),
    windowSince: lower,
    memories,
    index,
    sessions,
    perSessionChars: opts.perSessionChars,
  });

  const outPath = opts.out ?? join(memDir, '.dream', 'bundle-latest.md');
  mkdirSync(join(outPath, '..'), { recursive: true });
  writeFileSync(outPath, bundle, 'utf-8');

  return {
    project: opts.project,
    memoryDir: memDir,
    windowSince: lower ? lower.toISOString() : null,
    memories: memories.length,
    sessionsInWindow: sessions.length,
    bundle: outPath,
    bundleChars: bundle.length,
  };
}
