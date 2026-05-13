# ADR-0008: Estrategia de caché — cuándo y cómo

- **Estado**: Template (derivado de transcripción)
- **Fecha**: 2026-05-13
- **Fuente**: [sistemas.md](../../sistemas.md), [03-systems-design.md](../03-systems-design.md)

## Contexto

Las cachés (Redis, Memcached, CDN) aceleran lecturas guardando resultados en memoria. Pero **toda caché paga un costo de invalidación**: cuando el dato fuente cambia, la caché debe actualizarse o quedarse obsoleta.

El error frecuente: añadir Redis "porque sí" delante de una BD que ya es rápida, o cachear datos que cambian constantemente (la caché se invalida más rápido de lo que se llena → cero beneficio, complejidad añadida).

> *"Phil Karlton: There are only two hard things in Computer Science: cache invalidation and naming things."*

## Decisión

**Cachear cuando**:
- El dato se lee mucho más de lo que se escribe (ratio típico: >10:1).
- El dato es relativamente estable (TTL razonable de minutos a horas).
- La latencia de la BD es un cuello de botella medido (no asumido).
- El dato es **compartido** entre usuarios (no personalizado por sesión).

**No cachear cuando**:
- El sistema es escritura-heavy en ese dato (la caché se invalidaría constantemente).
- El dato es altamente personalizado (un valor por usuario → la caché tiene tantas entradas como usuarios, beneficio marginal).
- Consistencia fuerte es requerida (pagos, inventario crítico).

**Estrategias de invalidación** (ordenadas de simple a robusta):

1. **TTL puro**: cada entrada expira tras N segundos. Simple. Apto cuando staleness es tolerable.
2. **Write-through**: en cada escritura, actualizar caché también. Coordinación garantizada pero acopla escritura con caché.
3. **Write-around + invalidate**: escritura va solo a BD, invalida la entrada de caché. Próxima lectura repuebla desde BD. Default robusto.
4. **Write-behind**: caché es el sistema de verdad, BD se actualiza asíncrono. Solo en sistemas muy específicos.

**Topología recomendada**:
- **CDN** (Cloudflare, CloudFront): para estáticos (imágenes, JS, CSS, HTML semi-estático). Invalidación explícita post-deploy.
- **Redis** entre la app y la BD: para datos calientes (sesiones, datos de usuario frecuentes, resultados de queries pesados).
- **Caché en memoria de la app** (Node Map, LRU): para datos de proceso, ultra-calientes, con TTL muy corto.

## Consecuencias

**Positivas**
- Latencia de lectura reducida 10–100x.
- Carga de BD reducida drásticamente.
- Costo por request menor.

**Negativas / Trade-offs**
- Cache invalidation bugs (datos viejos servidos a usuarios).
- Otro componente que falla (Redis caído → todo se vuelve lento).
- Complejidad de debugging: el bug solo aparece cuando la caché está caliente.
- "Thundering herd": cuando expira un dato muy consultado, mil requests golpean la BD a la vez.

## Alternativas consideradas

1. **No cachear, escalar BD**: válido si la BD aguanta. Read replicas (ver [ADR-0009](0009-read-replicas-vs-cache.md)) son una alternativa intermedia.

2. **Cachear todo agresivamente**: tentador. Lleva a inconsistencias y a "esa feature funciona en mi máquina pero no en producción".

3. **Stale-while-revalidate** (HTTP / SWR): servir dato viejo mientras se refresca en background. Excelente para UI (Next.js / React Query lo soportan nativamente).

## Cita de respaldo

> *"Las cachés invalidan en escritura, haciendo contraproducentes con alta ingesta de datos."* — [sistemas.md](../../sistemas.md)
