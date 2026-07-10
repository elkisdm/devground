# ADR-0002: Normalizar en relacionales, denormalizar en NoSQL

- **Estado**: Template (derivado de transcripción)
- **Fecha**: 2026-05-13
- **Fuente**: [bd.md](../sources/bd.md), [01-database-architecture.md](../01-database-architecture.md)

## Contexto

La normalización (Edgar Codd, 1970s) elimina redundancia distribuyendo datos en tablas relacionadas. Ofrece integridad y previene anomalías de inserción/actualización/borrado.

La denormalización repite datos para evitar joins y optimizar lecturas.

El error común es aplicar la misma estrategia en ambos paradigmas:
- Diseñar relacionales sin normalizar → redundancia, inconsistencias, bugs.
- Diseñar NoSQL con joins simulados → se pierde la ventaja de velocidad del modelo.

## Decisión

**En BDs relacionales (PostgreSQL, MySQL)**:
- Aplicar **3ª Forma Normal** como mínimo.
- Denormalizar solo en columnas específicas con justificación medida (vista materializada, columna calculada).

**En BDs NoSQL (MongoDB, DynamoDB, Cassandra)**:
- **Denormalizar intencionalmente**.
- Diseñar el documento alrededor de los **queries más frecuentes**.
- Aceptar redundancia controlada como precio por evitar joins distribuidos.

## Consecuencias

**Positivas**
- Relacional: integridad referencial, single source of truth, queries flexibles vía joins.
- NoSQL: lecturas con latencia mínima, schema adaptado al acceso real.

**Negativas / Trade-offs**
- Relacional: queries complejos pueden requerir muchos joins → necesidad de índices y `EXPLAIN ANALYZE`.
- NoSQL: actualizar un dato denormalizado requiere actualizarlo en N documentos → escrituras más costosas y riesgo de inconsistencia transitoria.

## Alternativas consideradas

1. **Normalizar también en NoSQL**: usar referencias entre documentos. Descartado: simula relacional sin sus garantías, peor de ambos mundos.

2. **Desnormalizar en relacional desde el inicio**: tentador para "optimizar". Descartado: prematuro, complica mantenimiento, los relacionales modernos optimizan joins agresivamente.

3. **3FN estricta también en relacional pequeño**: válido pero suficiente con 3FN — formas normales superiores (BCNF, 4FN) raramente pagan su complejidad.

## Cita de respaldo

> *"Siempre ten en cuenta qué queries o qué peticiones quieres hacer para diseñar la información."* — [bd.md](../sources/bd.md)
