import tsParser from '@typescript-eslint/parser';
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import base, { BASE_RESTRICTED_SYNTAX } from './index.mjs';
import tanstackConfig from './tanstack.mjs';

const linter = new Linter();

/** Lintea un fragmento TS con la composición dada y devuelve los ids de regla. */
function lint(code, config) {
  const withParser = [{ files: ['**/*.ts'], languageOptions: { parser: tsParser } }, ...config];
  return linter
    .verify(code, withParser, { filename: 'src/foo.ts' })
    .map((m) => m.ruleId);
}

describe('preset tanstack — forma', () => {
  it('por defecto trae las reglas de Query y de Start', () => {
    expect(tanstackConfig()).toHaveLength(2);
  });

  it('permite desactivar cada mitad por separado', () => {
    expect(tanstackConfig({ start: false })).toHaveLength(1);
    expect(tanstackConfig({ query: false })).toHaveLength(1);
    expect(tanstackConfig({ start: false, query: false })).toHaveLength(0);
  });

  it('la regla de Start apunta a archivos de ruta, no a todo el proyecto', () => {
    const [, startBlock] = tanstackConfig();

    expect(startBlock.files).toContain('**/routes/**/*.{ts,tsx}');
    expect(startBlock.files).toContain('**/*.route.{ts,tsx}');
  });

  it('la fuga de cliente de base de datos en una ruta es error, no warning', () => {
    // Un import de db en un archivo de ruta viaja al bundle del navegador con
    // sus credenciales. Degradarlo a warning lo vuelve ignorable en CI.
    const [, startBlock] = tanstackConfig();

    expect(startBlock.rules['no-restricted-imports'][0]).toBe('error');
  });

  it('restringe los clientes de base de datos mas comunes', () => {
    const [, startBlock] = tanstackConfig();
    const { group } = startBlock.rules['no-restricted-imports'][1].patterns[0];

    expect(group).toEqual(expect.arrayContaining(['@prisma/client', 'pg', 'postgres']));
  });
});

/**
 * Estos corren ESLint de verdad. Los de arriba solo miran la forma del objeto,
 * y esa es exactamente la razón por la que un selector muerto y el borrado de
 * las reglas del base pasaron desapercibidos: ninguna aserción sobre `files`,
 * severidad o mensaje cambia cuando el selector deja de matchear.
 */
describe('preset tanstack — comportamiento real de ESLint', () => {
  const ANY_CODE = 'type X = any;\nexport function f(v: any) { return v as any; }\n';

  it('el base solo ya prohibe `any` (ADR-0011)', () => {
    const ids = lint(ANY_CODE, base({}));

    expect(ids.filter((r) => r === 'no-restricted-syntax')).toHaveLength(3);
  });

  it('componer tanstack NO apaga la prohibicion de `any` del base', () => {
    // El flat config REEMPLAZA las opciones de una regla en vez de fusionarlas.
    // Sin esparcir BASE_RESTRICTED_SYNTAX, adoptar este preset opt-in apagaba
    // la regla insignia del repo en todo el proyecto, sin aviso.
    const ids = lint(ANY_CODE, [...base({}), ...tanstackConfig()]);

    expect(ids.filter((r) => r === 'no-restricted-syntax')).toHaveLength(3);
  });

  it('el preset incluye los selectores del base, no una copia divergente', () => {
    const [queryBlock] = tanstackConfig();
    const [, ...selectors] = queryBlock.rules['no-restricted-syntax'];

    expect(selectors).toEqual(expect.arrayContaining(BASE_RESTRICTED_SYNTAX));
  });

  it('avisa sobre una queryKey literal inline', () => {
    const ids = lint("useQuery({ queryKey: ['leads', 1] });\n", tanstackConfig());

    expect(ids).toContain('no-restricted-syntax');
  });

  it('cubre los demas hooks de Query, no solo useQuery', () => {
    // El selector anterior se anclaba en `callee.name='useQuery'`, asi que
    // useSuspenseQuery, useInfiniteQuery y queryOptions() pasaban limpios.
    for (const call of ['useSuspenseQuery', 'useInfiniteQuery', 'queryOptions']) {
      const ids = lint(`${call}({ queryKey: ['leads'] });\n`, tanstackConfig());

      expect(ids, `${call} deberia avisar`).toContain('no-restricted-syntax');
    }
  });

  it('tambien cubre los template literals, el caso propenso a typos', () => {
    const ids = lint('useQuery({ queryKey: [`leads-${id}`] });\n', tanstackConfig());

    expect(ids).toContain('no-restricted-syntax');
  });

  it('no avisa cuando la key sale de una factory', () => {
    const ids = lint('useQuery({ queryKey: keys.leads.detail(id) });\n', tanstackConfig());

    expect(ids).not.toContain('no-restricted-syntax');
  });
});
