import { join } from 'node:path';
import { success } from '../utils/logger.js';
import { resolveOps } from './ops.js';
import type { InstallerOptions } from '../types.js';

export function install(options: InstallerOptions): void {
  const { targetDir, stack } = options;
  const ops = resolveOps(options);
  const isNext = stack.framework === 'nextjs';

  ops.addDevDependency(targetDir, stack.packageManager, '@devground/tsconfig', 'typescript');

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

    ops.writeFile(
      join(targetDir, 'tsconfig.json'),
      JSON.stringify(tsconfig, null, 2) + '\n',
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

    ops.writeFile(
      join(targetDir, 'tsconfig.typecheck.json'),
      JSON.stringify(typecheckConfig, null, 2) + '\n',
    );

    success('TypeScript configured with @devground/tsconfig/next.json + typecheck variant');
  } else {
    const tsconfig = {
      extends: '@devground/tsconfig/base.json',
      include: ['src/**/*.ts'],
      exclude: ['node_modules', 'dist'],
    };

    ops.writeFile(
      join(targetDir, 'tsconfig.json'),
      JSON.stringify(tsconfig, null, 2) + '\n',
    );

    success('TypeScript configured with @devground/tsconfig/base.json');
  }
}
