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
    {
      rules: {
        // ADR-0010: tamaño como señal de refactor. `warn`, no `error`.
        'max-lines': [
          'warn',
          { max: 400, skipBlankLines: true, skipComments: true },
        ],
        'max-lines-per-function': [
          'warn',
          { max: 80, skipBlankLines: true, skipComments: true, IIFEs: true },
        ],

        // ADR-0011: prohibido `any` en fronteras externas (DB/API).
        // Aquí sí existe el plugin de TS (vía eslint-config-next/typescript),
        // así que usamos la regla canónica. Genera tipos en la frontera.
        // Escape justificado:
        //   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- <razón>
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
    { ignores },
  ];
}
