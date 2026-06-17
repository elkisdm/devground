import { readFileSync, existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { defaultTranscriptRoots, findTranscripts } from '../lib/transcript-collect.js';
import { parseTranscriptLine } from '../lib/transcript.js';
import { repoPathToProjectDir } from '../lib/repo-attribution.js';
import { computeOrientation, renderOrientation, type SessionSource } from '../lib/orientation.js';

export interface OrientationArgs {
  /** Repo paths used to decide which sessions ran in a codemap-having repo. */
  repos: string[];
  /** Extra transcript roots (e.g. a frozen backup); defaults to ~/.claude/projects. */
  transcriptRoots?: string[];
  backupDir?: string;
}

/** Project dirs of the repos that currently have a `docs/codemap.md`. */
export function codemapRepoDirs(repos: readonly string[]): Set<string> {
  const dirs = new Set<string>();
  for (const repo of repos) {
    if (existsSync(join(repo, 'docs', 'codemap.md'))) {
      dirs.add(repoPathToProjectDir(repo));
    }
  }
  return dirs;
}

/** Reads every transcript line, tagging each record with its session and project dir. */
export function readSessionSources(files: readonly string[]): SessionSource[] {
  const sources: SessionSource[] = [];
  for (const file of files) {
    const projectDir = basename(dirname(file));
    const raw = readFileSync(file, 'utf-8');
    for (const line of raw.split('\n')) {
      const record = parseTranscriptLine(line);
      if (record === null) continue;
      sources.push({ sessionId: record.sessionId ?? file, projectDir, record });
    }
  }
  return sources;
}

/** Runs the orientation-cost analysis over all transcripts and returns markdown. */
export function runOrientation(args: OrientationArgs): string {
  const roots = args.transcriptRoots ?? defaultTranscriptRoots(args.backupDir);
  const files = findTranscripts(roots);
  const sources = readSessionSources(files);
  const report = computeOrientation(sources, codemapRepoDirs(args.repos));
  return renderOrientation(report);
}
