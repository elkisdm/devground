import astroPlugin from 'eslint-plugin-astro';

const DEFAULT_IGNORES = [
  'dist/**',
  '.astro/**',
  'node_modules/**',
  'build/**',
  'out/**',
  'tmp/**',
];

/**
 * Astro ESLint flat config — applies eslint-plugin-astro recommended rules to
 * .astro files and leaves .ts/.tsx files (React/Solid/Vue islands, utilities)
 * to be linted by the consumer's own TypeScript/framework presets.
 *
 * @param {object} [options]
 * @param {string[]} [options.ignores] - Additional glob patterns to ignore.
 * @returns {import('eslint').Linter.Config[]}
 */
export default function astroConfig(options = {}) {
  const ignores = options.ignores ?? DEFAULT_IGNORES;

  return [
    ...astroPlugin.configs.recommended,
    { ignores },
  ];
}
