# ADR-0006: Cuándo aplicar CQRS

- **Estado**: Template (derivado de transcripción)
- **Fecha**: 2026-05-13
- **Fuente**: [patron arq.md](../sources/patron%20arq.md), [02-architectural-patterns.md](../02-architectural-patterns.md)

## Contexto

CQRS (Command Query Responsibility Segregation) separa el modelo de escritura (commands) del modelo de lectura (queries). Permite:
- Escalar lecturas y escrituras independientemente.
- Procesar comandos asíncronamente (encolar y responder rápido al cliente).
- Modelar lecturas con vistas materializadas distintas al modelo de escritura.

El costo es alto: dos modelos a mantener, sincronización eventual entre ellos, complejidad de debugging y observabilidad.

## Decisión

**Aplicar CQRS únicamente** cuando se cumple **al menos uno**:

1. **Alto volumen asíncrono**: miles de eventos/segundo donde el cliente no necesita respuesta inmediata (tracking de clicks, métricas, logs de actividad).
2. **Asimetría extrema lectura/escritura**: el dominio recibe 100x más lecturas que escrituras (o viceversa) y necesita modelos separados.
3. **Vistas de lectura radicalmente distintas al modelo de escritura**: dashboards que agregan/cruzan datos de múltiples fuentes y se actualizan asincrónicamente.

**No aplicar CQRS** cuando:
- El flujo es CRUD síncrono normal (el 90% de las apps).
- La carga es moderada (<1k req/seg).
- El equipo no tiene experiencia con sistemas eventualmente consistentes.

## Consecuencias

**Positivas**
- Escritura responde rápido (encola y vuelve).
- Lecturas usan modelos optimizados (vistas materializadas, BD especializada).
- Sistema absorbe picos de escritura sin colapsar.

**Negativas / Trade-offs**
- Consistencia eventual: lo que escribes no aparece inmediatamente en queries.
- UX debe diseñarse para esto (mostrar "procesando..." en vez de el resultado).
- Dos modelos a mantener — duplicación intencional.
- Debugging más complejo: el evento perdido entre command y read model es la pesadilla operativa típica.

## Alternativas consideradas

1. **CRUD síncrono normal**: default para el 90% de los casos. Suficiente hasta que el volumen lo desborde.

2. **Solo separar lecturas con read replicas**: ver [ADR-0009](0009-read-replicas-vs-cache.md). Da el beneficio de escalado de lecturas sin la complejidad de CQRS.

3. **Event Sourcing + CQRS**: combinación natural. Event sourcing guarda eventos en vez de estado actual, CQRS proyecta esos eventos a múltiples read models. Solo si el dominio lo justifica (banca, auditoría, sistemas legales).

## Cita de respaldo

> *"CQRS añade complejidad innecesaria si el tráfico es bajo o síncrono."* — síntesis de [patron arq.md](../sources/patron%20arq.md)
