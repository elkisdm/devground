#!/usr/bin/env node

import { Command } from 'commander';
import prompts from 'prompts';
import { detectStack } from './detect-stack.js';
import { header, info, success, error, log } from './utils/logger.js';
import * as prettier from './installers/prettier.js';
import * as eslint from './installers/eslint.js';
import * as tsconfig from './installers/tsconfig.js';
import * as commitlint from './installers/commitlint.js';
import * as lintStaged from './installers/lint-staged.js';
import * as husky from './installers/husky.js';
import * as agentsMd from './installers/agents-md.js';
import type { InstallerOptions } from './types.js';

interface Installer {
  name: string;
  value: string;
  install: (options: InstallerOptions) => void;
}

const ALL_INSTALLERS: Installer[] = [
  { name: 'Prettier config', value: 'prettier', install: prettier.install },
  { name: 'ESLint config', value: 'eslint', install: eslint.install },
  { name: 'TypeScript configs', value: 'tsconfig', install: tsconfig.install },
  { name: 'Commitlint config', value: 'commitlint', install: commitlint.install },
  { name: 'lint-staged config', value: 'lint-staged', install: lintStaged.install },
  { name: 'Husky pre-commit hooks', value: 'husky', install: husky.install },
  { name: 'AGENTS.md + symlinks', value: 'agents-md', install: agentsMd.install },
];

const program = new Command();

program
  .name('devground-init')
  .description('Scaffold @devground development standards into any project')
  .version('1.0.0')
  .option('--preset <name>', 'Install preset (full | agents-only)')
  .option('-y, --yes', 'Skip prompts, install everything')
  .action(async (opts: { preset?: string; yes?: boolean }) => {
    header('devground-init v1.0.0');

    const targetDir = process.cwd();

    let stack;
    try {
      stack = detectStack(targetDir);
    } catch {
      error('Could not read package.json in the current directory.');
      error('Make sure you run devground-init from a project root.');
      process.exit(1);
    }

    info(`Framework:       ${stack.framework}`);
    info(`TypeScript:      ${stack.hasTypeScript ? 'yes' : 'no'}`);
    info(`Package manager: ${stack.packageManager}`);
    log('');

    const options: InstallerOptions = { targetDir, stack };

    let selectedInstallers: Installer[];

    if (opts.yes || opts.preset === 'full') {
      selectedInstallers = ALL_INSTALLERS;
    } else if (opts.preset === 'agents-only') {
      selectedInstallers = ALL_INSTALLERS.filter((i) => i.value === 'agents-md');
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

    for (const installer of selectedInstallers) {
      try {
        installer.install(options);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        error(`Failed to install ${installer.name}: ${message}`);
      }
    }

    log('');
    header('Done!');
    success(`${selectedInstallers.length} tool(s) configured successfully.`);
    log('');
  });

program.parse();
