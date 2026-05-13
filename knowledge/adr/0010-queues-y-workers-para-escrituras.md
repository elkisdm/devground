# ADR-0010: Message queues + workers para escrituras masivas

- **Estado**: Template (derivado de transcripción)
- **Fecha**: 2026-05-13
- **Fuente**: [sistemas.md](../../sistemas.md), [03-systems-design.md](../03-systems-design.md)

## Contexto

Sistemas escritura-heavy (tracking de eventos, generadores de IA, ingesta de logs, procesamiento de uploads) tienen un problema que la caché no resuelve: **muchos productores escribiendo simultáneamente saturan al consumidor**.

Procesar síncronamente significa:
- El cliente espera mientras el procesamiento ocurre (mala UX para tareas largas).
- Picos de tráfico tumban el sistema (no hay buffer).
- El consumidor no puede escalar independientemente del productor.

La solución es desacoplar productor de consumidor mediante una **cola de mensajes**.

## Decisión

**Usar message queue + workers** cuando se cumple **al menos uno**:

1. La operación tarda >1 segundo y no requiere respuesta inmediata.
2. El tráfico tiene picos predecibles o impredecibles (la cola actúa de buffer).
3. La operación puede fallar y debe reintentarse sin perder datos.
4. Múltiples consumidores deben procesar el mismo evento (pub/sub).

**Topología estándar**:

```
[Cliente] → [API] → [Queue] → [Worker pool] → [DB / servicio externo]
                          ↓
                     [Cliente recibe job_id, hace polling o WebSocket]
```

**Tecnologías por caso**:

| Caso | Recomendación |
|---|---|
| Cola simple, baja latencia | **Redis Streams**, **RabbitMQ** |
| Alta escala, eventos persistentes, fan-out | **Kafka** |
| Cloud-nativo AWS | **SQS** + **EventBridge** |
| Tareas programadas / cron | **BullMQ** (Node), **Sidekiq** (Ruby), **Celery** (Python) |

**Reglas operativas**:
- **Idempotencia**: los workers deben tolerar reprocesar el mismo mensaje (los at-least-once delivery garantizan duplicados ocasionales).
- **Dead-letter queue**: mensajes que fallan N veces se aíslan para inspección manual.
- **Backpressure**: si la cola crece sin parar, hay que escalar workers o pausar productores.
- **UI feedback**: mostrar al usuario "en cola, posición #42" o "procesando" con job_id.

## Consecuencias

**Positivas**
- API responde en milisegundos (encola y vuelve).
- Sistema absorbe picos sin caer.
- Workers escalan horizontalmente independiente del API.
- Reintentos automáticos en fallos transitorios.

**Negativas / Trade-offs**
- Consistencia eventual: el resultado no está listo cuando responde el API.
- UX más compleja: hay que diseñar el estado "en proceso".
- Componente adicional (Redis/Kafka/SQS) que falla, monitorear y operar.
- Debugging distribuido: trazar un evento a través de productor → cola → worker → BD.

## Alternativas consideradas

1. **Procesamiento síncrono con timeout largo**: aceptable para operaciones de 1–5 segundos y baja concurrencia. Por encima, colapsa.

2. **Threads/promises en proceso**: simula concurrencia sin cola. Funciona para operaciones cortas, pero pierde durabilidad (proceso caído = trabajos perdidos) y no escala entre instancias.

3. **Cron jobs batch**: procesar acumulado cada N minutos. Válido para reportes, analytics, no para UX en tiempo real.

## Cita de respaldo

> *"Message Queues: encolan peticiones de escritura. Caso: IA image generators controlan velocidad de consumo, evitan colapso."* — [sistemas.md](../../sistemas.md)
