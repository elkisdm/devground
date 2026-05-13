# Buenas Prácticas — Síntesis Cruzada

Documento operativo. Lectura obligada antes de iniciar cualquier proyecto nuevo. Fusiona las conclusiones de los 3 videos en una guía accionable.

---

## Principios transversales

Los 3 videos coinciden en estas verdades fundacionales:

### 1. Entiende el problema antes que la herramienta
- **Bases de datos**: "no existe BD universal, hay BDs especializadas".
- **Arquitectura**: "ninguna arquitectura es buena/mala per se".
- **Sistemas**: "no existe solución universal, entiende el contexto primero".

Operativamente: **prohibido elegir tecnología antes de entender el dominio**.

### 2. Diseña por patrones de acceso, no por modelo teórico
- BD: "ten en cuenta qué queries quieres hacer para diseñar la información".
- Sistemas: "¿cómo interactúan los usuarios con los datos?".

Operativamente: **enumera los queries/operaciones reales antes del schema**.

### 3. Simplicidad > pureza arquitectónica
- Arquitectura: "no se trata de la arquitectura más pura, sino la que tu equipo pueda mantener".
- BD: "la simplicidad es una ventaja competitiva".

Operativamente: **empezar simple, modularizar antes que fragmentar, fragmentar solo cuando duela**.

### 4. Las features tienen perfiles independientes
- Sistemas: "pensad en estas capacidades de forma independiente por cada característica del producto".
- BD: Netflix usa Cassandra + MySQL; Uber usa Redis + PostgreSQL.

Operativamente: **una sola decisión arquitectónica global rara vez sirve a todas las features**.

### 5. Resiliencia se diseña desde día 1
- Sistemas: timeouts, circuit breakers, queues no son optimización tardía.
- BD: shard key, índices y CAP se eligen al inicio.

Operativamente: **planificar los modos de fallo en el diseño, no en producción**.

---

## Checklist para iniciar un proyecto nuevo

### Paso 1 — Mapear dominios

Lista los **bounded contexts** del producto. Ejemplo (e-commerce):
- Catálogo de productos
- Carrito y checkout
- Pagos
- Inventario
- Reviews y reputación
- Sesiones de usuario
- Eventos de tracking

### Paso 2 — Identificar patrones de acceso por dominio

Para cada dominio, responde:
- ¿Lectura-heavy o escritura-heavy?
- ¿Datos personalizados por usuario o broadcast a muchos?
- ¿Consistencia fuerte requerida o eventual aceptable?
- ¿Volumen estimado (req/seg, GB)?

### Paso 3 — Elegir arquitectura inicial

**Default**: monolito modular con capas (transporte, dominio, datos).

Solo desviarse si:
- Equipo >5 con módulos paralelos → considera extracción incremental.
- Algún módulo recibe ~10x más tráfico que el resto → microservicio para ese módulo.
- Vida del proyecto >2 años + dominio estable → aplica Clean/Hexagonal en el monolito.
- Eventos asíncronos masivos → CQRS solo para esa parte.

Ver [ADR-0004](adr/0004-monolito-vs-microservicios.md), [ADR-0005](adr/0005-cuando-aplicar-clean-hexagonal.md), [ADR-0006](adr/0006-cuando-aplicar-cqrs.md).

### Paso 4 — Elegir BD por dominio

Usa la siguiente tabla rápida:

| Dominio típico | BD recomendada |
|---|---|
| Pagos, órdenes, transacciones | PostgreSQL / MySQL |
| Catálogo flexible, CMS | MongoDB |
| Sesiones, caché, leaderboards | Redis |
| Recomendaciones, redes sociales | Neo4j |
| Eventos / telemetría / time-series | Cassandra / ClickHouse |
| Clave-valor a gran escala | DynamoDB |

Define la **shard key** desde el diseño (user_id, region, timestamp).
Documenta qué dos de CAP eligió cada BD.

Ver [ADR-0001](adr/0001-elegir-tipo-de-base-de-datos.md), [ADR-0002](adr/0002-normalizar-vs-denormalizar.md), [ADR-0003](adr/0003-cuando-usar-indices.md).

### Paso 5 — Planificar escalado y resiliencia

Para cada feature crítica, decide:

| Decisión | Default | Cuándo cambiar |
|---|---|---|
| CDN | Sí para estáticos | — |
| Cache (Redis) | Sí para lecturas frecuentes | NO si es escritura-heavy |
| Read replicas | Cuando lectura supera ~70% del tráfico | — |
| Message queue | Sí para escritura-heavy o picos | — |
| Timeouts | Siempre, en toda llamada externa | — |
| Circuit breakers | Siempre, en dependencias críticas | — |

Ver [ADR-0008](adr/0008-estrategia-de-cache.md), [ADR-0009](adr/0009-read-replicas-vs-cache.md), [ADR-0010](adr/0010-queues-y-workers-para-escrituras.md), [ADR-0011](adr/0011-timeouts-y-circuit-breakers.md).

### Paso 6 — Documentar las decisiones

Por cada decisión no trivial, crea un ADR en `/docs/adr/` del proyecto. Formato Michael Nygard (ver [adr/README.md](adr/README.md)). Esto **no es burocracia** — es la única manera de que decisiones tomadas hoy no se reviertan por accidente en 6 meses.

---

## Cheatsheet de decisión rápida

```
┌─────────────────────────────────────────────────────────────────┐
│ TIPO DE BD                                                       │
│  ¿Transacciones fuertes + integridad referencial? → PostgreSQL  │
│  ¿Schema flexible, iteración rápida?              → MongoDB     │
│  ¿Latencia <1ms, datos efímeros?                  → Redis       │
│  ¿Relaciones complejas, traversal de grafos?      → Neo4j       │
│  ¿Telemetría/eventos masivos?                     → Cassandra   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ARQUITECTURA                                                     │
│  Equipo <5, MVP, dominio acoplado    → Monolito + capas         │
│  Equipo mediano, evolución sostenida → Monolito modular         │
│  Dominio estable, vida >2 años       → + Clean/Hexagonal        │
│  Módulo con 10x tráfico              → Extraer microservicio    │
│  Eventos asíncronos masivos          → CQRS en ese módulo       │
│  Tráfico en picos esporádicos        → Serverless en ese módulo │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ESCALADO                                                         │
│  Lectura-heavy   → CDN + Redis + read replicas                   │
│  Escritura-heavy → Queue + workers, evitar cachés                │
│  Siempre         → Timeouts + circuit breakers                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Aplicación en devground

Hay que ser honesto: **`devground-1` es un monorepo de paquetes npm de tooling** (ESLint, Prettier, husky, commitlint, CLI de scaffolding). No tiene base de datos, no tiene microservicios, no escala a millones de usuarios. La mayoría de este conocimiento **no aplica al monorepo en sí**.

Donde **sí** aplica:

### 1. A los proyectos que devground inicializa

El CLI `devground-init` configura proyectos nuevos. Una mejora natural es que pueda sembrar también esta guía:

- **Propuesta**: añadir flag `devground init --with-architecture-docs` que copie esta carpeta `knowledge/` (o una versión template) al proyecto destino.
- **Justificación**: el público objetivo de devground (equipos que quieren estándares desde día 1) es exactamente el público que se beneficia de tener ADRs pre-poblados.

### 2. A las decisiones del propio monorepo

Aunque sea tooling, hay decisiones aplicables:
- **Patrones de acceso al monorepo**: el CLI se ejecuta esporádicamente (instalación). Es un patrón de "tráfico en picos" — esto justifica que sea un CLI distribuido por npm en lugar de un servicio (que sería sobre-ingeniería).
- **Simplicidad > pureza**: devground evita reinventar (usa Changesets, ESLint v9 flat config, husky). Aplicar Clean/Hexagonal aquí sería absurdo — es una librería, no un dominio de negocio.
- **Decisiones documentadas**: el propio devground podría tener su `docs/adr/` para decisiones como "por qué pnpm workspace y no npm/yarn", "por qué Changesets", "por qué ESLint flat config".

### 3. Como contenido didáctico

devground se posiciona como "estándares de desarrollo". Esta carpeta `knowledge/` es coherente con esa misión: convierte estándares informales (videos de YouTube) en artefactos consultables. **Podría exponerse como `@devground/architecture-guide`** — un paquete npm que instale los docs y ADRs templates en `/docs/` del proyecto destino.

---

## Lectura mínima recomendada

Si solo tienes 30 minutos:
1. Este documento (`BEST-PRACTICES.md`).
2. [ADR-0001](adr/0001-elegir-tipo-de-base-de-datos.md) y [ADR-0004](adr/0004-monolito-vs-microservicios.md).

Si tienes 2 horas:
3. Los 3 documentos de síntesis (01, 02, 03).
4. Los 11 ADRs.

Si tienes 1 día:
5. Las 3 transcripciones originales en la raíz.
6. *"Designing Data-Intensive Applications"* (Kleppmann) — el libro de referencia que cubre los 3 temas con profundidad.
