#!/usr/bin/env node

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const targetDir = process.cwd();
const pkgPath = path.join(targetDir, 'package.json');

function log(msg) {
  console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
}

function warn(msg) {
  console.log(`  \x1b[33m!\x1b[0m ${msg}`);
}

function heading(msg) {
  console.log(`\n  \x1b[1m\x1b[36m${msg}\x1b[0m\n`);
}

if (!fs.existsSync(pkgPath)) {
  console.error('  \x1b[31m✗\x1b[0m No package.json found. Run this from your project root.');
  process.exit(1);
}

heading('devground setup');

// Detect framework
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
const isNextjs = 'next' in (deps || {});
const framework = isNextjs ? 'Next.js' : 'react' in (deps || {}) ? 'React' : 'Node.js';
log(`Stack detectado: ${framework}`);

// 1. Prettier
if (!pkg.prettier) {
  pkg.prettier = '@devground/prettier-config';
  log('Prettier config activado');
} else {
  warn('Prettier config ya existe — no se sobreescribe');
}

// 2. Lint-staged
if (!pkg['lint-staged']) {
  pkg['lint-staged'] = '@devground/lint-staged-config';
  log('Lint-staged config activado');
} else {
  warn('Lint-staged config ya existe — no se sobreescribe');
}

// 3. Prepare script
if (!pkg.scripts) pkg.scripts = {};
if (pkg.scripts.prepare !== 'husky') {
  pkg.scripts.prepare = 'husky';
  log('Script "prepare": "husky" agregado');
}

// Write package.json
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

// 4. ESLint config
const eslintPath = path.join(targetDir, 'eslint.config.mjs');
if (!fs.existsSync(eslintPath)) {
  const eslintContent = isNextjs
    ? `import nextConfig from '@devground/eslint-config/next';\n\nexport default nextConfig();\n`
    : `import baseConfig from '@devground/eslint-config';\n\nexport default baseConfig();\n`;
  fs.writeFileSync(eslintPath, eslintContent);
  log(`eslint.config.mjs creado (${isNextjs ? 'Next.js' : 'base'})`);
} else {
  warn('eslint.config.mjs ya existe — no se sobreescribe');
}

// 5. TSConfig
const tsconfigPath = path.join(targetDir, 'tsconfig.json');
if (!fs.existsSync(tsconfigPath)) {
  const preset = isNextjs ? '@devground/tsconfig/next.json' : '@devground/tsconfig/base.json';
  const includes = isNextjs
    ? ['next-env.d.ts', '**/*.ts', '**/*.tsx']
    : ['src/**/*.ts'];
  const tsconfig = {
    extends: preset,
    compilerOptions: { paths: { '@/*': ['./*'] } },
    include: includes,
    exclude: ['node_modules'],
  };
  fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n');
  log(`tsconfig.json creado (extends ${preset})`);

  if (isNextjs) {
    const typecheckPath = path.join(targetDir, 'tsconfig.typecheck.json');
    if (!fs.existsSync(typecheckPath)) {
      const typecheck = {
        extends: '@devground/tsconfig/next-typecheck.json',
        include: ['app/**/*.ts', 'app/**/*.tsx', 'components/**/*.ts', 'components/**/*.tsx', 'lib/**/*.ts', 'lib/**/*.tsx'],
        exclude: ['node_modules'],
      };
      fs.writeFileSync(typecheckPath, JSON.stringify(typecheck, null, 2) + '\n');
      log('tsconfig.typecheck.json creado (CI)');
    }
  }
} else {
  warn('tsconfig.json ya existe — no se sobreescribe');
}

// 6. Commitlint config
const commitlintPath = path.join(targetDir, 'commitlint.config.js');
if (!fs.existsSync(commitlintPath)) {
  fs.writeFileSync(commitlintPath, `module.exports = { extends: ['@devground/commitlint-config'] };\n`);
  log('commitlint.config.js creado');
} else {
  warn('commitlint.config.js ya existe — no se sobreescribe');
}

// 7. Husky
const huskyDir = path.join(targetDir, '.husky');
try {
  execSync('npx husky init', { cwd: targetDir, stdio: 'pipe' });
  log('Husky inicializado');
} catch {
  if (fs.existsSync(huskyDir)) {
    warn('Husky ya inicializado');
  }
}

const preCommitPath = path.join(huskyDir, 'pre-commit');
fs.writeFileSync(preCommitPath, 'pnpm exec lint-staged\n', { mode: 0o755 });
log('.husky/pre-commit configurado');

// 8. AGENTS.md + symlinks
const agentsMdSource = path.resolve(__dirname, '..', 'agents-md', 'AGENTS.md');
// Fallback: if installed from npm, agents-md is a sibling package in node_modules
const agentsMdFallback = path.resolve(targetDir, 'node_modules', '@devground', 'agents-md', 'AGENTS.md');
const source = fs.existsSync(agentsMdSource) ? agentsMdSource : agentsMdFallback;

const agentsDest = path.join(targetDir, 'AGENTS.md');
if (fs.existsSync(source)) {
  fs.copyFileSync(source, agentsDest);
  log('AGENTS.md creado');

  const symlinks = [
    { target: 'AGENTS.md', link: 'CLAUDE.md' },
    { target: 'AGENTS.md', link: '.cursorrules' },
    { target: path.join('..', 'AGENTS.md'), link: path.join('.github', 'copilot-instructions.md') },
    { target: path.join('..', 'AGENTS.md'), link: path.join('.gemini', 'styleguide.md') },
  ];

  for (const { target, link } of symlinks) {
    const linkPath = path.join(targetDir, link);
    const linkDir = path.dirname(linkPath);

    if (!fs.existsSync(linkDir)) {
      fs.mkdirSync(linkDir, { recursive: true });
    }

    try {
      fs.lstatSync(linkPath);
      fs.unlinkSync(linkPath);
    } catch {
      // doesn't exist
    }

    try {
      fs.symlinkSync(target, linkPath);
      log(`Symlink ${link} → ${target}`);
    } catch {
      const resolvedTarget = path.resolve(targetDir, target);
      fs.copyFileSync(resolvedTarget, linkPath);
      warn(`Copiado ${link} (symlinks no soportados)`);
    }
  }
} else {
  warn('AGENTS.md template no encontrado — ejecuta npx devground-agents manualmente');
}

heading('Listo');
console.log('  Todos los estandares devground estan configurados.\n');
console.log('  Ejecuta tus herramientas:');
console.log('    pnpm lint          # ESLint');
console.log('    pnpm exec prettier --check .  # Prettier');
console.log('    git commit         # pre-commit hook activo');
console.log('');
