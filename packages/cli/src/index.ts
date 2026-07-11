#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
import prompts from 'prompts';
import { detectStack } from './detect-stack.js';
import { isValidPreset, resolveInstall, VALID_PRESETS } from './select.js';
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
import type { InstallerOptions, InstallResult } from './types.js';

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
    if (opts.preset !== undefined && !isValidPreset(opts.preset)) {
      error(`Unknown preset "${opts.preset}". Valid presets: ${VALID_PRESETS.join(', ')}.`);
      process.exit(1);
    }

    const targetDir = process.cwd();

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

    info(`Framework:       ${stack.framework}`);
    info(`TypeScript:      ${stack.hasTypeScript ? 'yes' : 'no'}`);
    info(`Package manager: ${stack.packageManager}`);
    log('');

    const options: InstallerOptions = { targetDir, stack };

    let selectedInstallers: Installer[];

    const resolution = resolveInstall(
      ALL_INSTALLERS.map((i) => i.value),
      opts,
      Boolean(process.stdin.isTTY),
    );

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
      selectedInstallers = ALL_INSTALLERS.filter((i) => resolution.values.includes(i.value));
    } else {
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

      if (!response.tools || response.tools.length === 0) {
        info('Nothing selected. Exiting.');
        process.exit(0);
      }

      const selectedValues = response.tools as string[];
      selectedInstallers = ALL_INSTALLERS.filter((i) =>
        selectedValues.includes(i.value),
      );
    }

    log('');
    header('Installing...');

    const tally: InstallTally = { installed: 0, skipped: 0, failed: 0 };
    for (const installer of selectedInstallers) {
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

    log('');
    header('Done!');
    const summary = formatTally(tally);
    if (tally.failed > 0) {
      // Report the real tally and fail loudly so CI doesn't read a partial
      // install as success.
      error(summary);
      process.exit(1);
    }
    success(summary);
    log('');
  });

program.parse();
