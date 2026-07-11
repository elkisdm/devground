# ADR-0011: Timeouts y circuit breakers en toda llamada externa

- **Estado**: Template (derivado de transcripción)
- **Fecha**: 2026-05-13
- **Fuente**: [sistemas.md](../sources/sistemas.md), [03-systems-design.md](../03-systems-design.md)

## Contexto

En sistemas distribuidos, los fallos no son binarios (funciona / no funciona) — son **lentos**. Una dependencia que tarda 30s en responder es peor que una que retorna error en 100ms, porque acumula peticiones bloqueadas hasta agotar threads/conexiones/memoria.

**Cascada de fallos**: el servicio A llama al B, que llama al C. C está caído. Sin timeouts, A y B se bloquean esperando. Sin circuit breakers, A y B siguen llamando a C aunque sepan que está caído, ahogando el sistema cuando C intenta recuperarse.

> *"Release It!"* (Michael Nygard) — el libro de referencia para estos patrones — fue escrito tras presenciar varios outages catastróficos por esta dinámica exacta.

## Decisión

**Toda llamada inter-servicio o a recursos externos DEBE tener**:

### 1. Timeout explícito
- Hot path (request HTTP de usuario): **1–5 segundos**.
- Background jobs: **30–60 segundos**.
- Operaciones batch: documentado y consciente.
- **Nunca**: timeout infinito o por defecto del framework (suele ser 0 = infinito).

### 2. Circuit breaker en dependencias críticas
Estados:
- **Closed**: peticiones pasan normalmente.
- **Open**: tras N fallos consecutivos, todas las peticiones fallan rápido sin tocar la dependencia (típicamente 30–60s).
- **Half-Open**: pasada la ventana, deja pasar 1–3 peticiones de prueba. Si pasan, vuelve a Closed; si fallan, vuelve a Open.

### 3. Backoff exponencial en reintentos
- Primer reintento: 1s
- Segundo: 2s
- Tercero: 4s
- Con jitter (randomización) para evitar thundering herd.
- Máximo 3 reintentos en hot path; más en background jobs.

### 4. Bulkheads (aislamiento de recursos)
- Pool de conexiones separado por dependencia: si la BD de analytics se cae, no agota las conexiones disponibles para la BD principal.

## Implementación recomendada

**Node/TypeScript**:
- `axios` / `undici` con `timeout` explícito.
- `opossum` para circuit breakers.
- `async-retry` o `p-retry` para backoff.

**Otras runtimes**:
- Go: `context.WithTimeout`, librería `gobreaker`.
- Java: Resilience4j (sucesor de Hystrix).
- Python: `httpx` con timeouts, `pybreaker`.

**Observabilidad obligatoria**:
- Métricas: timeouts/min, circuit state, retries/min, latencia p50/p95/p99.
- Alertas: circuit abierto, timeout rate >5%.

## Consecuencias

**Positivas**
- Fallos contenidos: una dependencia caída no tumba el sistema entero.
- Recuperación natural: el circuit half-open permite recuperarse sin intervención.
- Comportamiento predecible bajo carga.
- Usuarios reciben errores rápidos en vez de timeouts del navegador.

**Negativas / Trade-offs**
- Más código en cada llamada externa (mitigable con wrappers/decorators).
- Errores prematuros si los timeouts están mal calibrados (un servicio legítimamente lento puede dispararse incorrectamente).
- Circuit abierto significa errores 5xx al usuario — hay que diseñar fallbacks (datos cacheados, modo degradado).

## Alternativas consideradas

1. **Sin timeouts, sin circuit breakers**: lo que tiene casi todo MVP. Funciona hasta el primer outage en cascada, que ocurre el peor día posible.

2. **Solo timeouts, sin circuit breaker**: mejor que nada, pero bajo carga sostenida el sistema sigue intentando llamar al servicio caído, agotando recursos.

3. **Service mesh** (Istio, Linkerd): implementa timeouts, circuit breakers, retries a nivel de infraestructura. Excelente para microservicios maduros. Sobre-ingeniería para monolitos o pocos servicios.

4. **Fallback con dato cacheado / valor por defecto**: complemento esencial al circuit breaker. Cuando el circuit está abierto, retornar un valor razonable en vez de error si el dominio lo permite.

## Cita de respaldo

> *"Timeouts: evita cascada de fallos si un servicio está caído. Circuit Breakers: permite recuperación natural sin sobrecarga de reintentos."* — [sistemas.md](../sources/sistemas.md)

> *"Servicios resilientes, productos que aunque intentes machacarlos a muerte de tráfico, acaben sobreviviendo."* — [sistemas.md](../sources/sistemas.md)
