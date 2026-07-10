# 03 — Diseño de Sistemas Escalables

Síntesis estructurada de [sistemas.md](sources/sistemas.md).

## Tesis central

> *"¿Cómo interactúan los usuarios con los datos que estoy guardando?"*

Antes de elegir herramienta, define el **patrón de acceso**. Sistemas reales tienen features con perfiles opuestos (Netflix: lectura-heavy para streaming, escritura-heavy para tracking de progreso). Cada feature merece su propio diseño.

## Patrones de acceso

| Patrón | Característica | Ejemplo |
|---|---|---|
| **Fan-out** (lectura) | Un dato leído por millones | Capítulo de Netflix, post viral |
| **Fan-in** (escritura) | Muchos usuarios escribiendo simultáneamente | Tracking de eventos, generadores de imágenes IA |

**El tradeoff clave**: las cachés invalidan en escritura. En sistemas write-heavy, una caché es contraproducente.

## Componentes de arquitectura

| Componente | Para qué sirve | Cuándo usar |
|---|---|---|
| **CDN** (Cloudflare, CloudFront) | Servir estáticos desde nodos cercanos al usuario | Lectura-heavy de contenido inmutable o semi-estático |
| **Caché en memoria** (Redis, Memcached) | Acelerar lecturas frecuentes | Datos calientes con baja tasa de cambio |
| **Read Replicas** | BDs réplicas solo-lectura | Lectura masiva, tolerable consistencia eventual (segundos) |
| **Message Queue** (Kafka, RabbitMQ, SQS) | Encolar escrituras / desacoplar productor de consumidor | Fan-in, picos de escritura, procesamiento asíncrono |
| **Workers** | Procesan tareas de la cola | Escalado horizontal: más workers = más throughput |
| **Timeouts** | Limitar espera en llamadas inter-servicio | Siempre. En toda llamada externa |
| **Circuit Breakers** | Cortar llamadas a un servicio caído | Cuando hay dependencias críticas externas |

## Estrategias de escalado

### Lectura-heavy
1. **CDN** para estáticos.
2. **Cache layer** (Redis) delante de la BD para datos calientes.
3. **Read replicas** para lecturas pesadas (analytics, dashboards).
4. Estrategia de invalidación: borrar caché en escritura, recachear on-demand.

### Escritura-heavy
1. **Message queue** antes del procesador.
2. **Workers escalables horizontalmente** consumiendo la cola.
3. **Feedback al usuario**: "tu trabajo está en cola, posición 42".
4. Evitar cachés (se invalidarían constantemente).

### Resiliencia (transversal)
1. **Timeouts** en toda llamada inter-servicio (30–60s típico, menor en hot paths).
2. **Circuit breakers** en dependencias críticas.
3. **Backoff exponencial** en reintentos.
4. **Bulkheads**: aislar pools de conexiones para que un servicio caído no agote recursos compartidos.

## Anti-patrones

- Aplicar la misma estrategia a todas las features (cada una tiene su patrón).
- Cachear en sistemas escritura-heavy (la caché se invalida más rápido de lo que se llena).
- No poner timeouts: una llamada bloqueada en cadena tumba el sistema.
- Reintentar contra un servicio caído sin circuit breaker — agrava la caída.
- Pensar en escalado solo al final (la shard key, el patrón de acceso y los timeouts se deciden al inicio).

## Citas textuales

1. *"¿Cómo interactúan los usuarios con los datos que estoy guardando?"*
2. *"No existe una solución universal. Lo primero es entender el problema, entender el contexto y desde ahí escoges lo que puede solucionar ese problema."*
3. *"Las escrituras también son otro tipo de necesidad que implican otras herramientas a la hora de escalar."*
4. *"Tenéis que pensar en estas capacidades de escalabilidad de forma independiente por cada característica del producto."*
5. *"Servicios resilientes, productos que aunque intentes machacarlos a muerte de tráfico, acaben sobreviviendo."*

## ADRs derivados

- [ADR-0008 — Estrategia de caché](adr/0008-estrategia-de-cache.md)
- [ADR-0009 — Read replicas vs caché](adr/0009-read-replicas-vs-cache.md)
- [ADR-0010 — Queues y workers para escrituras](adr/0010-queues-y-workers-para-escrituras.md)
- [ADR-0011 — Timeouts y circuit breakers](adr/0011-timeouts-y-circuit-breakers.md)

## Referencia

Fuente original: [sistemas.md](sources/sistemas.md). Lectura complementaria: *"Designing Data-Intensive Applications"* (Kleppmann), *"Release It!"* (Michael Nygard) para circuit breakers y patrones de resiliencia.
