import { join } from 'node:path';
import { success, warn } from '@devground/logger';
import { resolveOps } from './ops.js';
import { writeFileGuarded } from './write-guard.js';
import type { InstallerOptions, InstallResult } from '../types.js';

export function install(options: InstallerOptions): InstallResult {
  const { targetDir, stack } = options;
  const ops = resolveOps(options);
  const isNext = stack.framework === 'nextjs';

  if (isNext) {
    const mainPath = join(targetDir, 'tsconfig.json');
    const typecheckPath = join(targetDir, 'tsconfig.typecheck.json');

    // Nothing to do if both already exist — skip the dependency too.
    if (ops.fileExists(mainPath) && ops.fileExists(typecheckPath)) {
      warn('TypeScript config skipped: tsconfig.json and tsconfig.typecheck.json already exist (left untouched).');
      return 'skipped';
    }

    ops.addDevDependency(targetDir, stack.packageManager, '@devground/tsconfig', 'typescript');

    const tsconfig = {
      extends: '@devground/tsconfig/next.json',
      compilerOptions: {
        paths: {
          '@/*': ['./*'],
        },
      },
      include: [
        'next-env.d.ts',
        '**/*.ts',
        '**/*.tsx',
        '.next/types/**/*.ts',
      ],
      exclude: ['node_modules'],
    };

    const typecheckConfig = {
      extends: '@devground/tsconfig/next-typecheck.json',
      compilerOptions: {
        paths: {
          '@/*': ['./*'],
        },
      },
      include: [
        'next-env.d.ts',
        '**/*.ts',
        '**/*.tsx',
        '.next/types/**/*.ts',
      ],
      exclude: ['node_modules'],
    };

    const wroteMain = writeFileGuarded(ops, mainPath, JSON.stringify(tsconfig, null, 2) + '\n', 'tsconfig.json');
    const wroteTypecheck = writeFileGuarded(
      ops,
      typecheckPath,
      JSON.stringify(typecheckConfig, null, 2) + '\n',
      'tsconfig.typecheck.json',
    );

    // Be honest about what actually got written when one file pre-existed.
    const written = [wroteMain ? 'tsconfig.json' : null, wroteTypecheck ? 'tsconfig.typecheck.json' : null].filter(
      Boolean,
    );
    if (written.length > 0) {
      success(`TypeScript configured with @devground/tsconfig/next.json (${written.join(' + ')})`);
    }

    // Partial skip: 'installed' as long as at least one file was written
    // (the guard above already handled the both-exist case as 'skipped').
    return written.length > 0 ? 'installed' : 'skipped';
  } else {
    const mainPath = join(targetDir, 'tsconfig.json');

    if (ops.fileExists(mainPath)) {
      warn(`TypeScript config skipped: ${mainPath} already exists (left untouched).`);
      return 'skipped';
    }

    ops.addDevDependency(targetDir, stack.packageManager, '@devground/tsconfig', 'typescript');

    const tsconfig = {
      extends: '@devground/tsconfig/base.json',
      include: ['src/**/*.ts'],
      exclude: ['node_modules', 'dist'],
    };

    ops.writeFile(mainPath, JSON.stringify(tsconfig, null, 2) + '\n');

    success('TypeScript configured with @devground/tsconfig/base.json');
    return 'installed';
  }
}
