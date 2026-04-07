const DEFAULT_IGNORES = [
  'node_modules/**',
  'dist/**',
  'build/**',
  'out/**',
  '.next/**',
  'tmp/**',
];

/**
 * Base ESLint flat config — framework-agnostic.
 * @param {object} [options]
 * @param {string[]} [options.ignores] - Glob patterns to ignore.
 * @returns {import('eslint').Linter.Config[]}
 */
export default function baseConfig(options = {}) {
  const ignores = options.ignores ?? DEFAULT_IGNORES;

  return [
    { ignores },
    {
      rules: {
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'no-console': ['warn', { allow: ['warn', 'error'] }],
      },
    },
  ];
}
