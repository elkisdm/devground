# 01 — Arquitectura de Bases de Datos

Síntesis estructurada de [bd.md](../bd.md).

## Tesis central

> *"No existe una base de datos que sea la mejor en todo. Existen bases de datos especializadas."*

Elegir el **tipo de BD correcto** por dominio es una decisión arquitectónica crítica. Aplicaciones reales (Netflix, Uber, Amazon) mezclan varias BDs, una por subdominio.

## Tipologías y cuándo usar cada una

| Tipo | Ejemplo | Fortalezas | Casos de uso |
|---|---|---|---|
| **Relacional** | PostgreSQL, MySQL | ACID, integridad referencial, joins | Pagos, órdenes, finanzas, todo lo transaccional |
| **Documental** | MongoDB | Schema flexible (JSON), velocidad de iteración | Startups con modelo de negocio incierto, CMS, catálogos |
| **Clave-Valor** | Redis, DynamoDB | Latencia sub-milisegundo | Caché, sesiones, leaderboards, feature flags |
| **Grafos** | Neo4j | Algoritmos nativos sobre relaciones | Redes sociales, recomendaciones, fraude, rutas |
| **Columnar / Time-series** | Cassandra, ClickHouse | Escritura masiva, agregaciones | Métricas, telemetría, eventos de tracking |

**Aclaración importante**: SQL no equivale a "relacional". SQL es una sintaxis; el modelo de datos (relacional vs documental vs columnar) es lo que define el comportamiento.

## Conceptos fundamentales

### Teorema CAP
Solo puedes garantizar **dos** de tres en un sistema distribuido:
- **C**onsistency — todos los nodos ven el mismo dato a la vez.
- **A**vailability — el sistema responde siempre.
- **P**artition tolerance — sobrevive a fallos de red.

- Relacionales tradicionales priorizan **CA**.
- NoSQL distribuidas priorizan **AP** (consistencia eventual).
- Documenta qué dos elige tu BD y comunícalo a los usuarios.

### ACID vs BASE
- **ACID** (relacionales): Atomicidad, Consistencia, Aislamiento, Durabilidad. Garantías fuertes por transacción.
- **BASE** (distribuidas): **B**asically **A**vailable, **S**oft state, **E**ventual consistency. Garantías débiles a cambio de disponibilidad.

### Normalización (relacionales)
- Aplicar hasta **3FN** por defecto: elimina redundancia y previene anomalías.
- En NoSQL **se desnormaliza intencionadamente** para optimizar lecturas.

### Índices
- Aceleran lecturas (`O(log n)` con B-tree vs `O(n)` sin índice).
- Ralentizan escrituras (cada `INSERT/UPDATE` actualiza el árbol).
- Regla: indexar columnas de `WHERE`/`JOIN`/`ORDER BY` frecuentes; medir con `EXPLAIN`.

### Sharding
- Divide datos horizontalmente entre nodos según una **shard key** (user_id, region, timestamp).
- Decidir la shard key desde el diseño inicial — cambiarla después es costoso.

## Anti-patrones

- Usar una sola BD para todos los dominios "por simplicidad".
- Crear índices a ciegas: ni demasiados (mata escrituras) ni cero (mata lecturas).
- Diseñar schema sin conocer los queries futuros — genera joins innecesarios.
- Confundir SQL con relacional (DynamoDB tiene SQL y NO es relacional).
- Normalizar excesivamente en NoSQL: pierde la ventaja del modelo.
- Ignorar CAP: pretender consistencia + disponibilidad + partición es imposible.

## Citas textuales

1. *"No existe una base de datos que sea la mejor en todo. Existen bases de datos especializadas."*
2. *"Elegir el tipo correcto de base de datos para tu caso de uso es una decisión crítica que si tomas de forma errónea te puede complicar todo el desarrollo desde ahora hasta el futuro."*
3. *"El diseño es mucho más importante que la propia tecnología."*
4. *"Siempre ten en cuenta qué queries o qué peticiones quieres hacer para diseñar la información."*
5. *"La simplicidad es una ventaja competitiva."*

## ADRs derivados

- [ADR-0001 — Elegir tipo de base de datos](adr/0001-elegir-tipo-de-base-de-datos.md)
- [ADR-0002 — Normalizar vs denormalizar](adr/0002-normalizar-vs-denormalizar.md)
- [ADR-0003 — Cuándo crear índices](adr/0003-cuando-usar-indices.md)

## Referencia

Fuente original: [bd.md](../bd.md). Lectura recomendada complementaria: *"Designing Data-Intensive Applications"* (Martin Kleppmann).
