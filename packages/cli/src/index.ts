#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
import prompts from 'prompts';
import { detectStack } from './detect-stack.js';
import { resolveInstall, VALID_PRESETS } from './select.js';
import { header, info, success, error, log } from '@devground/logger';
import * as prettier from './installers/prettier.js';
import * as eslint from './installers/eslint.js';
import * as tsconfig from './installers/tsconfig.js';
import * as commitlint from './installers/commitlint.js';
import * as lintStaged from './installers/lint-staged.js';
import * as husky from './installers/husky.js';
import * as vitest from './installers/vitest.js';
import * as agentsMd from './installers/agents-md.js';
import * as architectureGuide from './installers/architecture-guide.js';
import * as uiConventions from './installers/ui-conventions.js';
import { formatTally, type InstallTally } from './tally.js';
import type { DetectedStack, InstallerOptions, InstallResult, PackageManager } from './types.js';
import { defaultInstallerOps } from './installers/ops.js';
import { createDepCollector } from './installers/collect-deps.js';
import { presetIsValid, tallyExitCode } from './exit.js';

interface Installer {
  name: string;
  value: string;
  install: (options: InstallerOptions) => InstallResult;
}

const ALL_INSTALLERS: Installer[] = [
  { name: 'Prettier config', value: 'prettier', install: prettier.install },
  { name: 'ESLint config', value: 'eslint', install: eslint.install },
  { name: 'TypeScript configs', value: 'tsconfig', install: tsconfig.install },
  { name: 'Commitlint config', value: 'commitlint', install: commitlint.install },
  { name: 'lint-staged config', value: 'lint-staged', install: lintStaged.install },
  { name: 'Husky pre-commit hooks', value: 'husky', install: husky.install },
  { name: 'Vitest + coverage ratchet', value: 'vitest', install: vitest.install },
  { name: 'AGENTS.md + symlinks', value: 'agents-md', install: agentsMd.install },
  { name: 'Architecture guide + ADR templates', value: 'architecture-guide', install: architectureGuide.install },
  { name: 'UI conventions skill (React/Next)', value: 'ui-conventions', install: uiConventions.install },
];

// Single source of truth for the version: the package manifest, not a literal.
// __dirname is dist/ at runtime (CommonJS output), so ../package.json is the
// package manifest.
const pkgVersion = (
  JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8')) as { version: string }
).version;

/** Prints the detected framework/TypeScript/package-manager summary. */
function printStack(stack: DetectedStack): void {
  info(`Framework:       ${stack.framework}`);
  info(`TypeScript:      ${stack.hasTypeScript ? 'yes' : 'no'}`);
  info(`Package manager: ${stack.packageManager}`);
  log('');
}

/**
 * Resolves which installers to run: from `--yes`/`--preset` in non-interactive
 * environments, or from an interactive multiselect prompt otherwise. Returns
 * `null` when the interactive prompt was shown but nothing was selected — the
 * caller logs and exits(0) in that case.
 */
async function chooseInstallers(
  opts: { preset?: string; yes?: boolean },
  isTTY: boolean,
): Promise<Installer[] | null> {
  const resolution = resolveInstall(ALL_INSTALLERS.map((i) => i.value), opts, isTTY);

  if (resolution.kind === 'install') {
    // Either an explicit --yes/--preset, or a non-interactive environment
    // where we default to the full preset instead of refusing (the write-guard
    // keeps a re-run on a configured project safe).
    if (resolution.defaulted) {
      info(
        'Non-interactive environment: defaulting to the full preset ' +
          '(pass --preset <full|agents-only> or --yes to choose explicitly).',
      );
    }
    return ALL_INSTALLERS.filter((i) => resolution.values.includes(i.value));
  }

  const response = await prompts({
    type: 'multiselect',
    name: 'tools',
    message: 'Select tools to install:',
    choices: ALL_INSTALLERS.map((i) => ({
      title: i.name,
      value: i.value,
      selected: true,
    })),
    hint: '- Space to toggle. Enter to confirm.',
  });

  if (!response.tools || response.tools.length === 0) return null;

  const selectedValues = response.tools as string[];
  return ALL_INSTALLERS.filter((i) => selectedValues.includes(i.value));
}

/**
 * Runs every selected installer, tallying installed/skipped/failed, then
 * flushes the collected dev dependencies in a single package-manager call.
 * A flush failure is fatal (exit 1) since a partial dependency install would
 * leave the project in a broken state.
 */
function runInstallers(
  selected: Installer[],
  options: InstallerOptions,
  flush: (dir: string, pm: PackageManager) => void,
  pm: PackageManager,
  dir: string,
): InstallTally {
  const tally: InstallTally = { installed: 0, skipped: 0, failed: 0 };
  for (const installer of selected) {
    try {
      const result = installer.install(options);
      if (result === 'skipped') {
        tally.skipped++;
      } else {
        tally.installed++;
      }
    } catch (err) {
      tally.failed++;
      const message = err instanceof Error ? err.message : String(err);
      error(`Failed to install ${installer.name}: ${message}`);
    }
  }

  try {
    flush(dir, pm);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    error(`Failed to install dependencies: ${message}`);
    process.exit(1);
  }

  return tally;
}

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
