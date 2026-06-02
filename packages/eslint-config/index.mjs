const DEFAULT_IGNORES = [
  'node_modules/**',
  'dist/**',
  'build/**',
  'out/**',
  '.next/**',
  'tmp/**',
];

// ADR-0011: la regla `no-restricted-syntax`/`TSAnyKeyword` SOLO matchea si el
// parser produce nodos TS. El parser por defecto (espree) no entiende TS, así
// que la regla quedaría INERTE sobre `.ts`/`.tsx`. Cargamos el parser de
// @typescript-eslint si está presente (peerDependency opcional) y lo
// registramos para los archivos TS. Si no está, el preset sigue siendo
// framework-agnostic y válido para JS puro (la regla simplemente no aplica a TS).
let tsParser;
try {
  tsParser = (await import('@typescript-eslint/parser')).default;
} catch {
  tsParser = undefined;
}

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
    // Registra el parser de TS para archivos TS cuando esté disponible, de
    // modo que `TSAnyKeyword` (ADR-0011) realmente matchee y no quede inerte.
    ...(tsParser
      ? [
          {
            files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
            languageOptions: { parser: tsParser },
          },
        ]
      : []),
    {
      rules: {
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'no-console': ['warn', { allow: ['warn', 'error'] }],

        // ADR-0010: el tamaño excesivo es señal (no falta) de falta de
        // separación de responsabilidades. `warn`, no `error`, a propósito:
        // informa en el review sin bloquear el build. Umbrales heurísticos.
        'max-lines': [
          'warn',
          { max: 400, skipBlankLines: true, skipComments: true },
        ],
        'max-lines-per-function': [
          'warn',
          { max: 80, skipBlankLines: true, skipComments: true, IIFEs: true },
        ],

        // ADR-0011: prohibido `any` en fronteras externas (DB/API). En el
        // preset base no hay plugin de TS, así que aproximamos con la regla
        // core que cubre la sintaxis de tipo `any`. El preset Next.js
        // (next.mjs) trae @typescript-eslint/no-explicit-any vía
        // eslint-config-next/typescript. Escape justificado:
        //   // eslint-disable-next-line no-restricted-syntax -- <razón>
        'no-restricted-syntax': [
          'warn',
          {
            selector: 'TSAnyKeyword',
            message:
              'ADR-0011: evita `any` en fronteras externas (DB/API). Genera tipos (ej. `supabase gen types`) en vez de castear. Si es inevitable, justifícalo con un eslint-disable-next-line + comentario.',
          },
        ],
      },
    },
  ];
}
