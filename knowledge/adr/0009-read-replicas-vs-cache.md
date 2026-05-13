# ADR-0009: Read replicas vs caché para escalar lecturas

- **Estado**: Template (derivado de transcripción)
- **Fecha**: 2026-05-13
- **Fuente**: [sistemas.md](../../sistemas.md), [03-systems-design.md](../03-systems-design.md)

## Contexto

Cuando un sistema se vuelve lectura-heavy hay dos estrategias canónicas para escalar:

1. **Caché en memoria** (Redis, Memcached): respuestas sub-milisegundo, pero requiere invalidación cuidadosa y se vuelve contraproducente si las escrituras son frecuentes.
2. **Read replicas**: copias de solo lectura de la BD que replican asíncronamente desde el primario. Las escrituras van al primario; las lecturas se distribuyen entre réplicas.

Son **complementarias, no excluyentes**. La pregunta correcta no es "¿caché o réplicas?" sino "¿qué problema tengo y en qué orden las aplico?".

## Decisión

**Aplicar primero el que ataque el cuello de botella real**:

| Síntoma | Estrategia recomendada |
|---|---|
| Pocas queries muy calientes, datos compartidos entre usuarios | **Caché** (Redis) |
| Muchas queries variadas, todas pesadas | **Read replicas** |
| Lecturas globales (geográficas) | **CDN** + caché regional |
| Analytics/dashboards sobre datos transaccionales | **Read replica dedicada** (o data warehouse) |
| Escritura-heavy, lecturas moderadas | **Read replicas**, evitar caché |

**Topología combinada (escala media-grande)**:
```
[Cliente] → [CDN] → [App] → [Redis] → [Read Replica] → [Primary DB]
                                    ↘ [Primary DB] (escrituras)
```

**Decisiones operacionales**:
- Read replicas aceptan **consistencia eventual** (lag típico: segundos). Documentar y comunicar: no las uses para "leer-tu-propia-escritura" sin precauciones.
- Para lecturas inmediatas post-escritura, usar el primario o sticky reads.
- Monitorear **replication lag** activamente. Si supera el SLO, alertar.

## Consecuencias

**Positivas**
- Lecturas escalan horizontalmente con N réplicas.
- Primary queda libre para escrituras.
- Failover natural: si el primary cae, una réplica puede promoverse.

**Negativas / Trade-offs**
- Consistencia eventual: app debe tolerarla o detectar y compensar.
- Costo: cada réplica es un servidor adicional.
- Complejidad de routing: la app debe saber qué query va a primary vs réplica.

## Alternativas consideradas

1. **Solo caché, sin réplicas**: válido en escala pequeña-media con queries calientes localizables. Falla cuando la "long tail" de queries variadas también satura el primary.

2. **Solo read replicas, sin caché**: válido cuando las queries son tan diversas que cualquier caché tendría hit rate bajo. Costo más alto que caché en escala media.

3. **Sharding del primary**: divide datos entre múltiples primaries por shard key (user_id, region). Resuelve también escrituras. Mayor complejidad — aplicar cuando réplicas no bastan.

4. **CDC + read store especializado**: change data capture (Debezium) replica a Elasticsearch / ClickHouse para queries específicos. Aplicar para analytics o búsqueda.

## Cita de respaldo

> *"Read Replicas: aligera principal, retraso de segundos es generalmente aceptable."* — [sistemas.md](../../sistemas.md)
