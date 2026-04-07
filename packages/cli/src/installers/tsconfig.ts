import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { addDevDependency } from '../utils/package-json.js';
import { success } from '../utils/logger.js';
import type { InstallerOptions } from '../types.js';

export function install(options: InstallerOptions): void {
  const { targetDir, stack } = options;
  const isNext = stack.framework === 'nextjs';

  addDevDependency(targetDir, stack.packageManager, '@devground/tsconfig', 'typescript');

  if (isNext) {
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

    writeFileSync(
      join(targetDir, 'tsconfig.json'),
      JSON.stringify(tsconfig, null, 2) + '\n',
      'utf-8',
    );

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

    writeFileSync(
      join(targetDir, 'tsconfig.typecheck.json'),
      JSON.stringify(typecheckConfig, null, 2) + '\n',
      'utf-8',
    );

    success('TypeScript configured with @devground/tsconfig/next.json + typecheck variant');
  } else {
    const tsconfig = {
      extends: '@devground/tsconfig/base.json',
      include: ['src/**/*.ts'],
      exclude: ['node_modules', 'dist'],
    };

    writeFileSync(
      join(targetDir, 'tsconfig.json'),
      JSON.stringify(tsconfig, null, 2) + '\n',
      'utf-8',
    );

    success('TypeScript configured with @devground/tsconfig/base.json');
  }
}
