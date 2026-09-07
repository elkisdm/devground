import { BASE_RESTRICTED_SYNTAX } from './index.mjs';

/**
 * Preset TanStack OPT-IN — Start, Router, Query y Table (ADR-0035).
 *
 * NO reemplaza a `@tanstack/eslint-config`: ese es el oficial del ecosistema y
 * se mantiene solo. Esto se compone ENCIMA y cubre lo que el oficial no toca —
 * los errores que cuestan una tarde de depuración en estos repos y que ninguna
 * regla existente atrapa.
 *
 * Uso (el base es una FUNCIÓN, no un array — hay que invocarlo):
 *
 *   import devground from '@devground/eslint-config';
 *   import tanstack from '@devground/eslint-config/tanstack';
 *   import tanstackOfficial from '@tanstack/eslint-config';
 *
 *   export default [...devground({}), ...tanstackOfficial, ...tanstack()];
 *
 * @param {object} [options]
 * @param {boolean} [options.start=true] - Convenciones de TanStack Start (rutas de servidor).
 * @param {boolean} [options.query=true] - Reglas de TanStack Query.
 * @returns {import('eslint').Linter.Config[]}
 */
export default function tanstackConfig(options = {}) {
  const { start = true, query = true } = options;

  /** @type {import('eslint').Linter.Config[]} */
  const config = [];

  if (query) {
    config.push({
      files: ['**/*.{ts,tsx,js,jsx}'],
      rules: {
        // Se ESPARCEN los selectores del preset base. El flat config REEMPLAZA
        // las opciones de una regla en vez de fusionarlas, así que declarar
        // `no-restricted-syntax` acá sin esto borraría la prohibición de `any`
        // del ADR-0011 en todo el proyecto, en silencio. Hay un test que corre
        // ESLint de verdad para que no vuelva a pasar.
        'no-restricted-syntax': [
          'warn',
          ...BASE_RESTRICTED_SYNTAX,
          {
            // Una queryKey escrita a mano en cada llamada es el origen habitual
            // de la caché que no invalida: basta un typo o un orden distinto
            // para que dos consultas que deberían compartir entrada no lo hagan.
            // La convención es una factory de keys por dominio.
            //
            // El selector se ancla en la PROPIEDAD, no en el nombre del hook:
            // así cubre useQuery, useSuspenseQuery, useInfiniteQuery,
            // queryOptions() y cualquier envoltorio propio, en vez de solo uno.
            selector: "Property[key.name='queryKey'] > ArrayExpression > :matches(Literal, TemplateLiteral)",
            message:
              'queryKey literal inline: usa una factory de keys (ej. keys.leads.detail(id)) para que la invalidación sea consistente.',
          },
        ],
      },
    });
  }

  if (start) {
    config.push({
      // En TanStack Start el código de servidor y el de cliente conviven en el
      // mismo archivo. Importar el cliente de base de datos a nivel de módulo lo
      // empaqueta en el bundle del navegador junto con sus credenciales: no es
      // un problema de estilo, es una fuga.
      files: ['**/routes/**/*.{ts,tsx}', '**/*.route.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/db', '**/db/*', '**/server/db*', 'postgres', 'pg', '@prisma/client'],
                message:
                  'El cliente de base de datos no puede importarse en un archivo de ruta: muévelo a un módulo de servidor y consúmelo desde createServerFn(), o terminará en el bundle del cliente.',
              },
            ],
          },
        ],
      },
    });
  }

  return config;
}
