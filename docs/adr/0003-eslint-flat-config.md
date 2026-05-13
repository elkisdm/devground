# ADR-0003: ESLint v9 Flat Config

- **Estado**: Aceptado
- **Fecha**: 2026-05-13 (documentado retroactivamente)
- **Decisor**: edaza
- **Aplica a**: `@devground/eslint-config` y todos los paquetes que la consumen

## Contexto

ESLint v9 (2024) marcó **Flat Config como default** y depreció el formato legacy `.eslintrc.*`. Cualquier config compartida nueva tiene que decidir si:
- Mantener el formato legacy por compatibilidad con proyectos antiguos.
- Adoptar Flat Config y forzar a usuarios a la nueva sintaxis.
- Exportar ambos formatos.

devground se posiciona como **estándares modernos para proyectos nuevos**. Es coherente alinear con la dirección oficial de ESLint.

## Decisión

`@devground/eslint-config` exporta **solo Flat Config** (`eslint.config.mjs`).

Estructura del paquete:
- `index.js` — preset base (JS/TS estricto).
- `next.js` — preset Next.js (extiende base + reglas de `@next/eslint-plugin-next`).

Los proyectos consumidores escriben:
```js
// eslint.config.mjs
import config from '@devground/eslint-config/next';
export default config;
```

## Consecuencias

**Positivas**
- Alineado con la dirección oficial de ESLint (sin deuda técnica al actualizar).
- Composición vía `import` es más natural que `extends` strings opacos del formato legacy.
- TypeScript-friendly desde el inicio.
- Performance: Flat Config evalúa una sola vez (vs cascada de `.eslintrc` recursivos).

**Negativas / Trade-offs**
- Proyectos en ESLint v8 o anterior NO pueden usar este paquete sin migrar primero.
- Mensaje claro en README requerido (cumplido) para que usuarios sepan.
- Algunos plugins del ecosistema todavía publican solo en formato legacy → requieren wrappers (`@eslint/compat`).

## Alternativas consideradas

1. **Dual export (legacy + flat)**: duplica mantenimiento y oculta que legacy está deprecado. Descartado.
2. **Solo legacy**: contradice la posición "estándares modernos" de devground. Descartado.
3. **Biome en vez de ESLint**: alternativa moderna (Rust, todo-en-uno). Descartado para esta versión: el ecosistema de plugins de ESLint sigue siendo dominante (especialmente Next.js, React Hooks). Re-evaluar en futuro.

## Referencias

- [ESLint Flat Config migration guide](https://eslint.org/docs/latest/use/configure/migration-guide)
- Commit `f49bdb2` añadió preset Next.js sobre TypeScript base.
