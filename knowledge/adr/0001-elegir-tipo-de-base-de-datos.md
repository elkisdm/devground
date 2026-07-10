# ADR-0001: Elegir tipo de base de datos según el dominio

- **Estado**: Template (derivado de transcripción)
- **Fecha**: 2026-05-13
- **Fuente**: [bd.md](../sources/bd.md), [01-database-architecture.md](../01-database-architecture.md)

## Contexto

Al iniciar un proyecto o agregar un nuevo dominio, hay que decidir qué motor de base de datos usar. La presión cultural empuja a "elegir lo que ya conocemos" (típicamente PostgreSQL) o "elegir lo que está de moda" (MongoDB en 2015, DynamoDB en 2020).

Ambas presiones ignoran que **el modelo de datos óptimo depende del patrón de acceso del dominio**. Aplicaciones reales de gran escala (Netflix, Uber, Amazon) usan múltiples BDs en paralelo, una por subdominio.

## Decisión

**Mapear cada dominio (bounded context) a su tipología de BD óptima**, según esta tabla:

| Dominio | Modelo | Motor recomendado |
|---|---|---|
| Transaccional (pagos, órdenes) | Relacional | PostgreSQL, MySQL |
| Catálogo flexible, CMS | Documental | MongoDB |
| Sesiones, caché, leaderboards | Clave-Valor | Redis |
| Clave-Valor a gran escala | Clave-Valor distribuido | DynamoDB |
| Relaciones complejas, recomendaciones | Grafo | Neo4j |
| Eventos / telemetría / time-series | Columnar / wide-column | Cassandra, ClickHouse |

Permitir **múltiples BDs en el mismo proyecto** cuando los dominios lo justifican (polyglot persistence).

## Consecuencias

**Positivas**
- Cada dominio usa la herramienta diseñada para su patrón de acceso → mejor rendimiento, menos código de workaround.
- Escalabilidad heterogénea: el dominio de tracking puede escalar a Cassandra sin tocar PostgreSQL.
- Las garantías ACID se aplican donde importa (pagos), no se imponen donde estorban (eventos).

**Negativas / Trade-offs**
- Mayor complejidad operacional: más motores que monitorear, backupear, actualizar.
- Equipo necesita conocer múltiples tecnologías.
- Riesgo de inconsistencia entre BDs si no se diseña con cuidado (saga pattern, outbox pattern).
- Sobre-ingeniería si el proyecto es pequeño — un MVP con 3 features no necesita 3 BDs.

## Alternativas consideradas

1. **Una sola BD para todo (PostgreSQL)**: válido para proyectos pequeños/medianos. PostgreSQL puede absorber JSON (jsonb), clave-valor y full-text search razonablemente. Descartado para proyectos que crucen ~100k usuarios o requieran latencias <10ms en lecturas calientes.

2. **MongoDB para todo**: tentador por la flexibilidad. Descartado para dominios transaccionales (los pagos sin ACID estricto son una fuente de fraude e inconsistencias).

3. **Elegir según el equipo conoce**: pragmático pero subóptimo. Mejor invertir 2 semanas en aprender Redis que arrastrar latencias de PostgreSQL por años.

## Cita de respaldo

> *"Elegir el tipo correcto de base de datos para tu caso de uso es una decisión crítica que si tomas de forma errónea te puede complicar todo el desarrollo desde ahora hasta el futuro."* — [bd.md](../sources/bd.md)
