import prompts from 'prompts';
import { error, info, log } from '@devground/logger';
import { resolveInstall } from './select.js';
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
import type { InstallTally } from './tally.js';
import type { DetectedStack, InstallerOptions, InstallResult, PackageManager } from './types.js';

export interface Installer {
  name: string;
  value: string;
  install: (options: InstallerOptions) => InstallResult;
}

export const ALL_INSTALLERS: Installer[] = [
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

/** Prints the detected framework/TypeScript/package-manager summary. */
export function printStack(stack: DetectedStack): void {
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
export async function chooseInstallers(
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
export function runInstallers(
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
