# ADRs — Architecture Decision Records

Decisiones arquitectónicas atómicas, derivadas de las transcripciones en la raíz del repo.

## Qué es un ADR

Un **Architecture Decision Record** es un documento corto que captura **una** decisión arquitectónica significativa: qué se decidió, por qué, qué se descartó y qué consecuencias acarrea.

Formato originado por Michael Nygard (*"Documenting Architecture Decisions"*, 2011) y adoptado como estándar de facto.

## Por qué importan

Sin ADRs, las decisiones se pierden en chats, PRs y memorias humanas. Seis meses después nadie recuerda por qué se eligió PostgreSQL sobre Mongo, alguien lo cuestiona, se reabre el debate y se pierde una semana.

Con ADRs:
- Cualquier persona nueva (humana o agente IA) entiende el contexto en minutos.
- Las decisiones son **versionables** (vivien en git junto al código).
- Forzar escribirlos obliga a pensar las alternativas antes de decidir.

## Formato

```markdown
# ADR-XXXX: <Título de la decisión>

- **Estado**: Propuesto | Aceptado | Reemplazado por ADR-YYYY
- **Fecha**: YYYY-MM-DD
- **Fuente**: <archivos de referencia>

## Contexto
Situación que motiva la decisión. Restricciones, requisitos, fuerzas en juego.

## Decisión
La regla concreta que se adopta. Imperativa.

## Consecuencias
- **Positivas**: qué ganamos.
- **Negativas / Trade-offs**: qué sacrificamos.

## Alternativas consideradas
Otras opciones evaluadas y por qué se descartaron.
```

## Reglas de oro

1. **Una decisión por ADR**. Si tienes dos, son dos ADRs.
2. **Inmutables**. No se editan los ADRs aceptados — se crean nuevos que los reemplazan.
3. **Numerados secuencialmente**, sin huecos.
4. **Cortos**. Si pasa de 2 páginas, probablemente son varios ADRs.

## Índice

### Datos
- [ADR-0001 — Elegir tipo de base de datos](0001-elegir-tipo-de-base-de-datos.md)
- [ADR-0002 — Normalizar vs denormalizar](0002-normalizar-vs-denormalizar.md)
- [ADR-0003 — Cuándo crear índices](0003-cuando-usar-indices.md)

### Arquitectura
- [ADR-0004 — Monolito vs Microservicios](0004-monolito-vs-microservicios.md)
- [ADR-0005 — Cuándo aplicar Clean/Hexagonal](0005-cuando-aplicar-clean-hexagonal.md)
- [ADR-0006 — Cuándo aplicar CQRS](0006-cuando-aplicar-cqrs.md)
- [ADR-0007 — Serverless vs Servidor Dedicado](0007-serverless-vs-servidor-dedicado.md)

### Sistemas
- [ADR-0008 — Estrategia de caché](0008-estrategia-de-cache.md)
- [ADR-0009 — Read replicas vs caché](0009-read-replicas-vs-cache.md)
- [ADR-0010 — Queues y workers para escrituras](0010-queues-y-workers-para-escrituras.md)
- [ADR-0011 — Timeouts y circuit breakers](0011-timeouts-y-circuit-breakers.md)

## Estado de estos ADRs

**Estos ADRs son TEMPLATES** derivados del conocimiento de las transcripciones. No representan decisiones del repo `devground-1` (que es tooling, no una app). Están pensados para:

1. Ser referenciados desde futuras decisiones en cualquier proyecto.
2. Ser copiados como punto de partida cuando un equipo enfrente la decisión.
3. Demostrar cómo aplicar el conocimiento a casos concretos.

Cuando se usen en un proyecto real, cada ADR debe instanciarse con su **contexto específico** y firmarse con fecha y estado.
