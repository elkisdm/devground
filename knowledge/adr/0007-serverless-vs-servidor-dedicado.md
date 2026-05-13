# ADR-0007: Serverless vs Servidor Dedicado

- **Estado**: Template (derivado de transcripción)
- **Fecha**: 2026-05-13
- **Fuente**: [patron arq.md](../../patron%20arq.md), [02-architectural-patterns.md](../02-architectural-patterns.md)

## Contexto

Serverless (AWS Lambda, Cloudflare Workers, Vercel Functions) ofrece:
- Escalado automático a cero o a millones.
- Sin gestión de servidores.
- Pago por invocación.

Servidor dedicado (EC2, droplets, k8s) ofrece:
- Latencia predecible (sin cold starts).
- Coste predecible a tráfico constante.
- Stack completo bajo control.

Confusión común: serverless **no es una arquitectura**, es un **modelo de despliegue**. Una Lambda puede contener un monolito o un microservicio.

Caso de referencia: **Amazon Prime Video migró componentes de Lambda a EC2 dedicado por costo** — no porque Lambda sea mala, sino porque su patrón de tráfico (constante, alto volumen) no encajaba con el modelo de pago por invocación.

## Decisión

**Usar serverless** cuando:
- Tráfico es **esporádico o en picos** (ej. webhooks, cron jobs, procesamiento batch ocasional).
- Equipo pequeño que no quiere gestionar infraestructura.
- El cold start (típicamente 100–500ms) es aceptable.
- Latencia de respuesta no es crítica.

**Usar servidor dedicado** cuando:
- Tráfico es **constante y alto** (el coste por invocación supera el coste fijo del servidor).
- Latencia crítica (<50ms p99) — los cold starts son inaceptables.
- Necesidad de conexiones persistentes (WebSockets, SSE, conexiones DB pooled).
- Workloads intensivos en CPU o memoria (Lambdas tienen límites estrictos).

**Modelos híbridos** son legítimos:
- Servidor dedicado para el grueso del tráfico + Lambdas para cron jobs y webhooks.
- Edge functions (Cloudflare Workers, Vercel Edge) para latencia baja global + servidor dedicado para lógica pesada.

## Consecuencias

**Positivas (serverless)**
- Time-to-market mínimo.
- Cero servidor caído por OOM o disco lleno a las 3am.
- Escalado automático sin pensarlo.

**Negativas (serverless)**
- Cold starts (mitigable con provisioned concurrency, pero anula el ahorro).
- Vendor lock-in significativo.
- Coste impredecible bajo carga sostenida (puede ser 5–10x más caro que EC2 equivalente).
- Límites estrictos (tiempo de ejecución, memoria, payload size).

**Positivas (servidor dedicado)**
- Coste predecible y optimizable.
- Performance predecible.
- Sin límites artificiales.

**Negativas (servidor dedicado)**
- Hay que gestionar (OS, parches, monitoring, scaling).
- Capacidad ociosa fuera de horas pico.
- Requiere equipo DevOps o uso de PaaS (Heroku, Railway, Fly.io).

## Alternativas consideradas

1. **Containers en k8s gestionado** (EKS, GKE): combina control de servidor con autoescalado moderno. Apto para equipos con DevOps. Curva de aprendizaje alta.

2. **PaaS managed** (Heroku, Railway, Fly.io, Render): middle ground. Cero ops, costos predecibles, sin lock-in extremo. Default razonable para startups que crecen.

3. **Edge functions** (Cloudflare Workers, Vercel Edge): subset de serverless con cold start <10ms. Ideal para middleware, autenticación, transformación de respuestas. Limitadas en runtime (no Node completo).

## Cita de respaldo

> *"Amazon Prime Video migró de serverless a servidor dedicado por costo. No porque las Lambdas sean malas, sino porque ese problema no se adaptaba bien."* — síntesis de [patron arq.md](../../patron%20arq.md)
