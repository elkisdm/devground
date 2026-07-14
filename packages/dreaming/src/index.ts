#!/usr/bin/env node

import { join } from 'node:path';
import { Command } from 'commander';
import { info, success, warn, error } from '@devground/logger';
import { gather, encodeProjectDir } from './lib/gather.js';
import { install } from './commands/install.js';
import { readVersion } from './lib/version.js';

function runInstall(global: boolean): void {
  try {
    const { written, skipped, dest } = install({ global });
    const scope = global ? `global (${dest})` : `project (${dest})`;
    if (written > 0) success(`dreaming installed — ${scope} — ${written} file(s)`);
    if (skipped > 0) warn(`${skipped} file(s) already existed (kept your version)`);
    if (written === 0 && skipped > 0) info('Already up to date.');
    info('Run /dreaming (or say "consolida la memoria") to review a project\'s memory out of band.');
    info('It proposes a reviewed diff — nothing is written to memory without your approval.');
  } catch (e) {
    error(String(e instanceof Error ? e.message : e));
    process.exit(1);
  }
}

const program = new Command();

program
  .name('devground-dreaming')
  .description('Out-of-band memory consolidation for Claude Code (gather harness + skill installer)')
  .version(readVersion(join(__dirname, '..')));

program
  .command('install', { isDefault: true })
  .description('Install the dreaming skill into a Claude Code skills dir')
  .option('--global', 'Install into ~/.claude/skills (all projects)', false)
  .action((opts: { global: boolean }) => runInstall(opts.global));

program
  .command('gather')
  .description('Deterministic gather: distill in-window transcripts + snapshot the memory store into a bundle')
  .option(
    '--project <dir>',
    'Encoded project dir under ~/.claude/projects (defaults to the current working directory, encoded)',
    encodeProjectDir(process.cwd()),
  )
  .option('--days <n>', 'Fallback window in days when there is no prior dream', (v) => parseInt(v, 10), 14)
  .option('--since <val>', "'last' (since last dream), or an ISO date", 'last')
  .option('--force-days', 'Ignore last-dream state; use the --days window', false)
  .option('--max-sessions <n>', 'Cap sessions in the bundle', (v) => parseInt(v, 10), 40)
  .option('--per-session-chars <n>', 'Cap user-turn chars per session', (v) => parseInt(v, 10), 4000)
  .option('--out <path>', 'Bundle output path (default <memory>/.dream/bundle-latest.md)')
  .action(
    (opts: {
      project: string;
      days: number;
      since: string;
      forceDays: boolean;
      maxSessions: number;
      perSessionChars: number;
      out?: string;
    }) => {
      try {
        const r = gather({
          project: opts.project,
          days: opts.days,
          since: opts.since,
          forceDays: opts.forceDays,
          maxSessions: opts.maxSessions,
          perSessionChars: opts.perSessionChars,
          out: opts.out,
        });
        process.stdout.write(JSON.stringify(r, null, 2) + '\n');
      } catch (e) {
        error(String(e instanceof Error ? e.message : e));
        process.exit(1);
      }
    },
  );

program.parseAsync(process.argv);
