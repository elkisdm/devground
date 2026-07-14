#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
import { detectStack } from './detect-stack.js';
import { VALID_PRESETS } from './select.js';
import { header, info, success, error, log } from '@devground/logger';
import { formatTally } from './tally.js';
import type { InstallerOptions } from './types.js';
import { defaultInstallerOps } from './installers/ops.js';
import { createDepCollector } from './installers/collect-deps.js';
import { presetIsValid, tallyExitCode } from './exit.js';
import { printStack, chooseInstallers, runInstallers } from './run.js';

// Single source of truth for the version: the package manifest, not a literal.
// __dirname is dist/ at runtime (CommonJS output), so ../package.json is the
// package manifest.
const pkgVersion = (
  JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8')) as { version: string }
).version;

const program = new Command();

program
  .name('devground-init')
  .description('Scaffold @devground development standards into any project')
  .version(pkgVersion)
  .option('--preset <name>', 'Install preset (full | agents-only)')
  .option('-y, --yes', 'Skip prompts, install everything')
  .action(async (opts: { preset?: string; yes?: boolean }) => {
    header(`devground-init v${pkgVersion}`);

    // Validate the preset up front instead of silently falling through to the
    // interactive prompt on a typo (which read as success in CI).
    if (!presetIsValid(opts.preset)) {
      error(`Unknown preset "${opts.preset}". Valid presets: ${VALID_PRESETS.join(', ')}.`);
      process.exit(1);
    }

    const targetDir = process.cwd();

    // A repo with no package.json (e.g. a Swift-only project) has no JS/TS presets
    // to install. Exit cleanly instead of running installers that crash on ENOENT.
    if (!existsSync(join(targetDir, 'package.json'))) {
      info('No package.json found here — there are no JS/TS presets to install.');
      process.exit(0);
    }

    let stack;
    try {
      stack = detectStack(targetDir);
    } catch (err) {
      // Preserve the real cause: only blame a missing manifest when it's
      // actually missing; surface parse/permission errors instead of hiding them.
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === 'ENOENT') {
        error('Could not find package.json in the current directory.');
        error('Make sure you run devground-init from a project root.');
      } else {
        error(`Could not read package.json: ${err instanceof Error ? err.message : String(err)}`);
      }
      process.exit(1);
    }

    printStack(stack);

    const { ops: collectingOps, flush } = createDepCollector(defaultInstallerOps);
    const options: InstallerOptions = { targetDir, stack, ops: collectingOps };

    const selectedInstallers = await chooseInstallers(opts, Boolean(process.stdin.isTTY));
    if (selectedInstallers === null) {
      info('Nothing selected. Exiting.');
      process.exit(0);
    }

    log('');
    header('Installing...');

    const tally = runInstallers(selectedInstallers, options, flush, stack.packageManager, targetDir);

    log('');
    header('Done!');
    const summary = formatTally(tally);
    if (tallyExitCode(tally) === 1) {
      // Report the real tally and fail loudly so CI doesn't read a partial
      // install as success.
      error(summary);
      process.exit(1);
    }
    success(summary);
    log('');
  });

program.parse();
