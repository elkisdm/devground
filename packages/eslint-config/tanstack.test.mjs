import { describe, expect, it } from 'vitest';

import tanstackConfig from './tanstack.mjs';

describe('preset tanstack', () => {
  it('por defecto trae las reglas de Query y de Start', () => {
    const config = tanstackConfig();

    expect(config).toHaveLength(2);
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
    const [severity] = startBlock.rules['no-restricted-imports'];

    expect(severity).toBe('error');
  });

  it('restringe los clientes de base de datos mas comunes', () => {
    const [, startBlock] = tanstackConfig();
    const [, opts] = startBlock.rules['no-restricted-imports'];
    const { group } = opts.patterns[0];

    expect(group).toContain('@prisma/client');
    expect(group).toContain('pg');
    expect(group).toContain('postgres');
  });

  it('la regla de queryKey es warning: molesta sin bloquear', () => {
    // Es una convención de mantenibilidad, no una fuga. Como error rompería
    // repos existentes en el primer lint y terminaría desactivada entera.
    const [queryBlock] = tanstackConfig();
    const [severity] = queryBlock.rules['no-restricted-syntax'];

    expect(severity).toBe('warn');
  });

  it('el mensaje de queryKey dice que hacer, no solo que esta mal', () => {
    const [queryBlock] = tanstackConfig();
    const [, rule] = queryBlock.rules['no-restricted-syntax'];

    expect(rule.message).toMatch(/factory de keys/);
  });
});
