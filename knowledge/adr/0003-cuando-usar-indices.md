# ADR-0003: Cuándo crear índices en bases de datos

- **Estado**: Template (derivado de transcripción)
- **Fecha**: 2026-05-13
- **Fuente**: [bd.md](../sources/bd.md), [01-database-architecture.md](../01-database-architecture.md)

## Contexto

Los índices (típicamente B-tree) reducen la búsqueda en una tabla de `O(n)` a `O(log n)`. Pero cada índice añade costo a las escrituras: cada `INSERT/UPDATE/DELETE` debe actualizar todos los índices afectados.

Dos errores comunes y opuestos:
1. **Cero índices**: la app funciona en desarrollo, en producción cualquier query a tabla de 1M filas tumba el sistema.
2. **Demasiados índices**: indexar "por si acaso" cada columna → escrituras se vuelven 5–10x más lentas, espacio en disco se infla, el optimizador elige planes peores.

## Decisión

**Indexar** las siguientes columnas por defecto:
- **Primary keys** (automático en casi todas las BDs).
- **Foreign keys** (no es automático en MySQL/PostgreSQL — hay que crearlos).
- Columnas usadas en `WHERE` de queries frecuentes.
- Columnas usadas en `JOIN` (lado opuesto a la FK).
- Columnas usadas en `ORDER BY` o `GROUP BY` frecuentes.

**No indexar**:
- Columnas con baja cardinalidad (booleanos, enums de pocos valores).
- Columnas raramente filtradas.
- Tablas write-heavy donde el costo de escritura excede el beneficio de lectura.

**Proceso de validación**:
1. Antes de crear un índice: ejecutar `EXPLAIN` / `EXPLAIN ANALYZE` sobre el query problemático.
2. Crear el índice en una rama / staging.
3. Re-ejecutar `EXPLAIN` y validar que el plan cambia y mejora.
4. Monitorear escrituras post-deploy (degradación >20% = revisar).

## Consecuencias

**Positivas**
- Queries de lectura predecibles y rápidas.
- FKs indexadas evitan locks innecesarios y previenen bugs de integridad lentos.
- Decisiones basadas en evidencia (`EXPLAIN`) en vez de intuición.

**Negativas / Trade-offs**
- Escrituras más lentas (proporcional al número de índices).
- Espacio en disco adicional (típicamente 10–30% del tamaño de la tabla por índice).
- Necesidad de mantenimiento: índices fragmentados, índices duplicados, índices nunca usados.

## Alternativas consideradas

1. **Auto-indexar todo**: algunas plataformas lo ofrecen (DynamoDB con GSI). Descartado en relacionales: control explícito es preferible.

2. **No usar índices, escalar verticalmente**: comprar hierro hasta que funcione. Descartado: pospone el problema y multiplica el costo.

3. **Índices parciales / funcionales**: técnica avanzada (PostgreSQL `CREATE INDEX ... WHERE`). Adoptar cuando el query lo justifique (ej. soft-deleted rows).

## Cita de respaldo

> *"El diseño es mucho más importante que la propia tecnología."* — [bd.md](../sources/bd.md)
