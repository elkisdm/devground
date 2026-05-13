# ADR-0004: Empezar con monolito modular, no con microservicios

- **Estado**: Template (derivado de transcripción)
- **Fecha**: 2026-05-13
- **Fuente**: [patron arq.md](../../patron%20arq.md), [02-architectural-patterns.md](../02-architectural-patterns.md)

## Contexto

Desde ~2014 la industria adoptó microservicios como default cultural. Estudios posteriores muestran que **~37% de las migraciones a microservicios son solo parcialmente exitosas**: el fallo es contextual (equipo pequeño, dominios acoplados, falta de DevOps), no técnico.

El monolito carga estigma injustificado. Lo que llamamos "monolito malo" suele ser un *giant ball of mud* — un monolito sin estructura interna. El problema es la falta de modularidad, no el modelo de despliegue.

## Decisión

**Default**: empezar todo proyecto nuevo como **monolito modular** con arquitectura por capas (transporte/dominio/datos) y bounded contexts internos.

**Extraer a microservicio** solo si se cumple **al menos uno** de los siguientes criterios:

1. Un módulo recibe ~10x más tráfico que el resto y requiere escalado independiente.
2. Dos módulos tienen ciclos de release radicalmente distintos (uno cambia diariamente, otro mensualmente).
3. Equipos separados quieren trabajar en paralelo sin coordinarse en el deploy.
4. Requisitos de tecnología incompatibles entre módulos (ej. un módulo necesita Go por rendimiento, el resto es Node).

**No** justifica microservicios:
- "Es lo moderno".
- "Lo que hace Netflix / Amazon".
- "Por si crecemos".
- "Para tener equipos independientes" (sin equipos reales que justifiquen).

## Consecuencias

**Positivas**
- Velocidad de desarrollo alta en MVP y primeros años.
- Despliegue simple (un binario, un pipeline).
- Debugging directo, transacciones locales con ACID.
- Refactor cross-módulo trivial (un commit cambia varios módulos).
- Coste operacional bajo.

**Negativas / Trade-offs**
- Si el equipo crece a >15 personas en el mismo monolito, los merge conflicts y los deploy bloqueantes se vuelven dolorosos.
- Cualquier crash tumba todo (vs solo un servicio).
- Escalado horizontal escala todo, no solo lo que lo necesita.

## Alternativas consideradas

1. **Microservicios desde día 1**: requiere equipo experimentado (>5 senior con DevOps maduro), infraestructura (k8s, service mesh, observability), y dominios genuinamente desacoplados. Sin esto = fracaso garantizado.

2. **Monolito sin modularidad**: el clásico *ball of mud*. Es lo que la gente recuerda cuando dice "los monolitos no escalan". El problema no es el monolito, es la falta de bounded contexts.

3. **Serverless functions desde día 1**: ortogonal — serverless es despliegue, no arquitectura. Aun usando Lambdas se puede tener "monolito en una función" o microservicios distribuidos.

## Cita de respaldo

> **Martin Fowler**: *"Nunca deberías empezar con arquitectura de microservicios, sino que primero deberías empezar con un monolito, hacerlo modular y luego separarlo en microservicios cuando sea realmente un problema."* — [patron arq.md](../../patron%20arq.md)

> **Sam Newman**: *"Implementar microservicios en un equipo pequeño es un riesgo muy alto. Los beneficios no compensan todo el coste técnico."* — [patron arq.md](../../patron%20arq.md)
