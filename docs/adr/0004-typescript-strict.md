# ADR-0004: TypeScript strict por defecto

- **Estado**: Aceptado
- **Fecha**: 2026-05-13 (documentado retroactivamente)
- **Decisor**: edaza
- **Aplica a**: `@devground/tsconfig` y todos los paquetes que la consumen

## Contexto

TypeScript ofrece varios "niveles" de estrictez. Por defecto (`strict: false`) muchos errores genuinos pasan silenciosos: `null` no se chequea, parámetros implícitamente `any`, etc.

devground se posiciona como "estándares de desarrollo" — un preset relajado contradice esa promesa. Por otro lado, `strict: true` puede ser doloroso en proyectos legacy o equipos no familiarizados.

La pregunta: ¿qué nivel de estrictez exportar por defecto?

## Decisión

`@devground/tsconfig` exporta **TypeScript strict** (`strict: true`) en todos sus presets (`base`, `next`, `node`, `typecheck`).

Adicionalmente activa:
- `noUncheckedIndexedAccess`: el acceso por índice devuelve `T | undefined`.
- `noImplicitOverride`: requiere `override` explícito en métodos.
- `noFallthroughCasesInSwitch`: previene caída accidental entre casos.

## Consecuencias

**Positivas**
- Captura clases enteras de bugs en compile-time (null deref, type mismatches).
- Refactors masivos seguros (el compilador guía el cambio).
- Tipos explícitos como documentación viva.
- Alinea con la cultura de "estándares modernos" del repo.

**Negativas / Trade-offs**
- Curva de aprendizaje real para equipos no familiarizados con `strict`.
- Proyectos legacy migrando a este preset tendrán errores iniciales — hay que asumir el costo de "type cleanup" en la migración.
- `noUncheckedIndexedAccess` puede ser fricción inicial; mitigación: documentado en README.

## Alternativas consideradas

1. **strict: false (default de tsc)**: descartado por las razones del Contexto.
2. **strict: true sin `noUncheckedIndexedAccess`**: el flag adicional captura bugs reales (acceso a array fuera de rango). Vale el costo.
3. **Múltiples presets (strict y permissive)**: descartado por complejidad. Si un proyecto necesita laxitud, puede `extends` y desactivar selectivamente — pero la opinión por defecto es strict.

## Referencias

- [knowledge/BEST-PRACTICES.md](../../knowledge/BEST-PRACTICES.md) — coherente con el principio "simplicidad > pureza": una sola opinión clara mejor que matriz de presets.
