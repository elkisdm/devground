#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
import type { Snapshot } from './types.js';
import { runCollect } from './commands/collect.js';
import { resolveCollectInputs } from './commands/resolve.js';
import { runInit } from './commands/init.js';
import { renderReport } from './lib/report.js';
import { renderDiff } from './lib/diff.js';
import { addEvent } from './lib/events.js';
import { defaultConfigPath } from './lib/config.js';
import { header, log, info, warn, success, error } from './lib/logger.js';

const PKG_DIR = process.cwd();
const DEFAULT_OUT_DIR = join(PKG_DIR, 'snapshots');
const DEFAULT_EVENTS_FILE = join(PKG_DIR, 'snapshots', 'events.json');
const DEFAULT_CONFIG_PATH = defaultConfigPath(PKG_DIR);

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function loadSnapshot(path: string): Snapshot {
  return JSON.parse(readFileSync(path, 'utf-8')) as Snapshot;
}

const program = new Command();

program
  .name('dev-metrics')
  .description('Track the evolution of coding-with-agents: code, quality, velocity, efficiency')
  .version('0.1.0');

program
  .command('collect')
  .description('Compute a labelled metrics snapshot from git repos and Claude Code transcripts')
  .option('--repos <paths>', 'Comma-separated repo paths (overrides config/auto-detect)', splitList)
  .option('--emails <emails>', 'Comma-separated author emails (overrides config/auto-detect)', splitList)
  .option('--config <path>', 'Path to dev-metrics.config.json', DEFAULT_CONFIG_PATH)
  .option('--since <date>', 'Only include commits/transcripts on/after this date (YYYY-MM-DD)')
  .option('--until <date>', 'Only include commits/transcripts on/before this date (YYYY-MM-DD)')
  .option('--label <text>', 'Free-text label for the snapshot')
  .option('--out-dir <dir>', 'Directory to write the snapshot JSON', DEFAULT_OUT_DIR)
  .option('--events-file <path>', 'Path to the event annotations file', DEFAULT_EVENTS_FILE)
  .option('--no-seed-events', 'Do not auto-seed events.json with detected adoption markers')
  .action(
    (opts: {
      repos?: string[];
      emails?: string[];
      config: string;
      since?: string;
      until?: string;
      label?: string;
      outDir: string;
      eventsFile: string;
      seedEvents: boolean;
    }) => {
      header('dev-metrics collect');
      try {
        // MEJORA C: precedence flags > config > auto-detect (per field).
        const resolved = resolveCollectInputs({
          flags: { repos: opts.repos, emails: opts.emails },
          configPath: opts.config,
        });
        info(`repos: ${resolved.repos.length} (source: ${resolved.reposSource})`);
        info(`identities: ${resolved.identities.length} (source: ${resolved.identitiesSource})`);
        for (const w of resolved.warnings) warn(w);

        runCollect({
          repos: resolved.repos,
          emails: resolved.identities,
          since: opts.since ?? null,
          until: opts.until ?? null,
          label: opts.label ?? null,
          outDir: opts.outDir,
          eventsFile: opts.eventsFile,
          seedEvents: opts.seedEvents,
          configEvents: resolved.config?.events,
        });
      } catch (err) {
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    },
  );

program
  .command('init')
  .description('Auto-detect accounts, repos and identities into a versionable dev-metrics.config.json')
  .option('--config <path>', 'Where to write the config', DEFAULT_CONFIG_PATH)
  .option('--base-dir <dir>', 'Base directory to scan for git repos (default ~/Documents)')
  .option('--max-depth <n>', 'Max scan depth below base dir', (v) => Number.parseInt(v, 10))
  .option('--excludes <fragments>', 'Comma-separated path fragments to exclude', splitList)
  .option('--include-forks', 'Keep third-party forks instead of excluding them')
  .option('--force', 'Overwrite an existing config file')
  .action(
    (opts: {
      config: string;
      baseDir?: string;
      maxDepth?: number;
      excludes?: string[];
      includeForks?: boolean;
      force?: boolean;
    }) => {
      header('dev-metrics init');
      try {
        const result = runInit({
          configPath: opts.config,
          baseDir: opts.baseDir,
          maxDepth: opts.maxDepth,
          excludes: opts.excludes,
          includeForks: opts.includeForks,
          force: opts.force,
        });
        if (!result.written) process.exit(1);
      } catch (err) {
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    },
  );

program
  .command('report')
  .description('Render a markdown report from a snapshot file')
  .argument('<snapshot>', 'Path to a snapshot JSON file')
  .action((snapshotPath: string) => {
    try {
      log(renderReport(loadSnapshot(snapshotPath)));
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program
  .command('diff')
  .description('Compare two snapshots and print a delta table')
  .argument('<snapshotA>', 'Path to the earlier snapshot')
  .argument('<snapshotB>', 'Path to the later snapshot')
  .action((a: string, b: string) => {
    try {
      log(renderDiff(loadSnapshot(a), loadSnapshot(b)));
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program
  .command('event')
  .description('Record an event annotation (e.g. adoption of a standard) for later diff alignment')
  .requiredOption('--date <date>', 'Event date (YYYY-MM-DD)')
  .requiredOption('--label <text>', 'Short label, e.g. "adopted eslint-config"')
  .option('--description <text>', 'Optional longer description')
  .option('--events-file <path>', 'Path to the event annotations file', DEFAULT_EVENTS_FILE)
  .action((opts: { date: string; label: string; description?: string; eventsFile: string }) => {
    try {
      addEvent(opts.eventsFile, {
        date: opts.date,
        label: opts.label,
        description: opts.description,
      });
      success(`Event recorded in ${opts.eventsFile}`);
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program.parse();
