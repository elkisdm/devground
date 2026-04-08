import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const DEFAULT_IGNORES = [
  '.next/**',
  'node_modules/**',
  'out/**',
  'build/**',
  'dist/**',
  'tmp/**',
];

/**
 * Next.js ESLint flat config — extends core-web-vitals + typescript.
 * @param {object} [options]
 * @param {string[]} [options.ignores] - Additional glob patterns to ignore.
 * @returns {import('eslint').Linter.Config[]}
 */
export default function nextConfig(options = {}) {
  const ignores = options.ignores ?? DEFAULT_IGNORES;

  return [
    ...nextCoreWebVitals,
    ...nextTs,
    { ignores },
  ];
}
