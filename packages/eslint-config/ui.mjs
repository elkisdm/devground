import jsxA11y from 'eslint-plugin-jsx-a11y';

const UI_FILES = ['**/*.jsx', '**/*.tsx'];

/**
 * Preset UI OPT-IN — accesibilidad (jsx-a11y, alineado a ui-conventions base.md §3)
 * más restricciones PARAMETRIZABLES de primitivas nativas y de imports de iconos.
 * No cambia el comportamiento de los presets base/next: se compone aparte y solo
 * si el consumidor lo importa. jsx-a11y es un peerDependency (opcional): si no está
 * instalado, importar este preset falla con un error claro (igual que next.mjs con
 * eslint-config-next).
 *
 * @param {object} [options]
 * @param {Record<string,string>} [options.ownComponents] - Mapa primitiva→componente propio,
 *   ej. { button: 'Button', input: 'Input' }. Genera `no-restricted-syntax` (warn) que empuja
 *   a usar el componente del sistema en vez del elemento nativo. Vacío = regla inactiva.
 * @param {string} [options.iconLayer] - Ruta de la capa única de iconos, ej. '@/components/icons'.
 * @param {string[]} [options.restrictedIconPackages] - Paquetes de iconos a restringir, ej.
 *   ['lucide-react','@heroicons/react']. Con iconLayer genera `no-restricted-imports` (warn).
 * @returns {import('eslint').Linter.Config[]}
 */
export default function uiConfig(options = {}) {
  const { ownComponents = {}, iconLayer = null, restrictedIconPackages = [] } = options;

  const config = [
    { ...jsxA11y.flatConfigs.recommended, files: UI_FILES },
    {
      files: UI_FILES,
      rules: {
        // ui-conventions base.md §3: a11y es corrección → error.
        'jsx-a11y/control-has-associated-label': 'error',
        'jsx-a11y/label-has-associated-control': ['error', { assert: 'either' }],
        'jsx-a11y/aria-props': 'error',
        'jsx-a11y/aria-role': ['error', { ignoreNonDOM: true }],
        'jsx-a11y/role-has-required-aria-props': 'error',
      },
    },
  ];

  const nativeSelectors = Object.entries(ownComponents).map(([native, own]) => ({
    selector: `JSXOpeningElement[name.name='${native}']`,
    message: `ui-conventions §1: usa <${own}> del sistema de componentes en vez del <${native}> nativo.`,
  }));
  if (nativeSelectors.length > 0) {
    config.push({ files: UI_FILES, rules: { 'no-restricted-syntax': ['warn', ...nativeSelectors] } });
  }

  if (iconLayer && restrictedIconPackages.length > 0) {
    config.push({
      files: UI_FILES,
      rules: {
        'no-restricted-imports': [
          'warn',
          {
            paths: restrictedIconPackages.map((name) => ({
              name,
              message: `ui-conventions §1: importa iconos desde ${iconLayer} (capa única) en vez de ${name} directo.`,
            })),
          },
        ],
      },
    });
  }

  return config;
}
