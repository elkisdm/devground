# Cheat-sheet de decisiones (resumen operativo)

Resumen accionable de las 11 decisiones. **La fuente autoritativa es
`knowledge/adr/NNNN-*.md`** — leé ese archivo cuando esté disponible. Esto es el
fallback portable + el mapa rápido de default/trigger.

Formato de cada entrada: **Default** (qué elegir salvo razón fuerte) · **Escalá si**
(el trigger concreto que justifica subir complejidad) · **Trade-off** · **ADR fuente**.

## Datos

**Tipo de base de datos** — `0001-elegir-tipo-de-base-de-datos`
- Default: relacional (Postgres). Te da transacciones, integridad y flexibilidad de
  consulta; cubre el 90% de los casos.
- Escalá a NoSQL si: patrón de acceso único y simple a escala masiva, datos sin esquema
  estable, o necesidad de escritura horizontal extrema demostrada.
- Trade-off: NoSQL gana en un eje específico a costa de joins, consistencia y consultas ad-hoc.

**Normalizar vs denormalizar** — `0002-normalizar-vs-denormalizar`
- Default: normalizá (3FN). Evita anomalías y duplicación.
- Escalá (denormalizá) si: una lectura caliente medida sufre por demasiados joins.
- Trade-off: denormalizar acelera lecturas pero te obliga a mantener consistencia a mano.

**Índices** — `0003-cuando-usar-indices`
- Default: indexá por los patrones de consulta REALES (WHERE/JOIN/ORDER frecuentes).
- Escalá si: una query lenta lo pide (medida, no supuesta).
- Trade-off: cada índice acelera lecturas pero ralentiza escrituras y ocupa espacio. No indexes preventivamente.

## Arquitectura

**Monolito vs microservicios** — `0004-monolito-vs-microservicios`
- Default FUERTE: **monolito modular** (módulos con límites claros dentro de un deploy).
- Escalá a microservicios si: equipos múltiples que se pisan, dominios que necesitan
  escalar/deployar independientemente, y madurez de ops para soportarlo.
- Trade-off: microservicios compran independencia a costa de complejidad operacional,
  latencia de red y consistencia distribuida. Casi nunca valen en el día 1.

**Clean / Hexagonal / Screaming** — `0005-cuando-aplicar-clean-hexagonal`
- Default: separación de capas proporcional al tamaño. Screaming architecture (organizar
  por dominio/feature) casi siempre suma; hexagonal puro solo si hay lógica de negocio rica
  que aislar de la infraestructura.
- Escalá si: la lógica de dominio crece y se mezcla con framework/DB.
- Trade-off: sobre-abstraer un CRUD chico es deuda, no calidad.

**CQRS** — `0006-cuando-aplicar-cqrs`
- Default: NO.
- Escalá si: asimetría real y fuerte entre lectura y escritura que un solo modelo no resuelve.
- Trade-off: duplica modelos y agrega complejidad de sincronización.

**Serverless vs servidor dedicado** — `0007-serverless-vs-servidor-dedicado`
- Default: lo que tu plataforma/stack haga natural (ej. funciones en Vercel/Netlify para
  apps web con tráfico variable; servidor dedicado para cargas constantes o long-running).
- Escalá/cambiá si: cold starts, límites de ejecución o costos a escala lo justifican.
- Trade-off: serverless = cero ops y escala automática vs límites de runtime y costo por uso.

## Escala y sistemas (default de TODO: "todavía no" — YAGNI)

**Caché** — `0008-estrategia-de-cache`
- Default: sin caché. Optimizá la query/índice primero.
- Escalá si: lectura caliente repetida y medible que no mejora con índices.
- Trade-off: la caché agrega invalidación (uno de los problemas difíciles de verdad).

**Read replicas vs caché** — `0009-read-replicas-vs-cache`
- Default: ninguno hasta tener un cuello de botella de lectura real.
- Escalá si: la BD primaria se satura de lecturas → replica; si son las MISMAS lecturas
  repetidas → caché. Distinto problema, distinta herramienta.

**Colas y workers** — `0010-queues-y-workers-para-escrituras`
- Default: escrituras síncronas.
- Escalá si: trabajo pesado/lento en el request (emails, procesamiento, llamadas a 3eros)
  que conviene desacoplar del response.
- Trade-off: async agrega infraestructura, reintentos e idempotencia a manejar.

**Timeouts y circuit breakers** — `0011-timeouts-y-circuit-breakers`
- Default: timeouts explícitos en TODA llamada de red desde el día 1 (esto sí, siempre).
  Circuit breakers solo cuando dependés de servicios externos que pueden caer.
- Trade-off: sin timeouts, una dependencia lenta cuelga todo el sistema.

---

## Formato de DECISIONS.md (salida de Fase 5)

```markdown
# Decisiones de arquitectura — <proyecto>

Resumen de los cimientos. Detalle y razonamiento completo en `docs/adr/`.

## Contexto
- Tipo: ... · Escala esperada (6-12m): ... · Equipo: ... · Restricciones: ...

## Decisiones
| # | Decisión | Elección | Por qué (resumen) | ADR |
|---|----------|----------|-------------------|-----|
| 1 | Stack | Next.js + TS | ... | docs/adr/0001 |
| 2 | Base de datos | Postgres | ... | docs/adr/0002 |
| 3 | Arquitectura | Monolito modular | ... | docs/adr/0003 |
| ... | | | | |

## Triggers de re-evaluación
Cuándo volver a revisitar una decisión (no antes — eso sería sobre-ingeniería):
| Decisión | Re-evaluar cuando... |
|----------|----------------------|
| Microservicios | El equipo pase de N devs y los dominios se pisen en deploy |
| Caché | Una lectura caliente medida no mejore con índices |
| Colas | Trabajo en request supere ~Xms de forma consistente |
| ... | ... |
```
