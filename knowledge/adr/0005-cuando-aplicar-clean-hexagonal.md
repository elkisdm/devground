# ADR-0005: Cuándo aplicar Clean Architecture / Hexagonal

- **Estado**: Template (derivado de transcripción)
- **Fecha**: 2026-05-13
- **Fuente**: [patron arq.md](../../patron%20arq.md), [02-architectural-patterns.md](../02-architectural-patterns.md)

## Contexto

Clean Architecture (Robert C. Martin) y Hexagonal Architecture / Ports & Adapters (Alistair Cockburn) son técnicas para invertir dependencias: el dominio no depende de infraestructura (BD, framework, HTTP); en su lugar define puertos (interfaces) que la infraestructura implementa.

Beneficios reales: testeabilidad máxima, capacidad de cambiar BD/framework con bajo impacto, dominio expresable en términos de negocio.

Costo real: requiere **definir interfaces correctas desde el inicio**, lo cual exige conocer el dominio. En proyectos con requisitos volátiles, las interfaces se rediseñan constantemente y el patrón se convierte en una cárcel ceremonial.

## Decisión

**Aplicar Clean/Hexagonal cuando** se cumplen las 3 condiciones:

1. **Dominio comprendido**: el equipo entiende el negocio. Hay alguien (PO, arquitecto, domain expert) capaz de articular invariantes y reglas estables.
2. **Vida del proyecto >2 años**: la inversión inicial se amortiza con el tiempo de mantenimiento.
3. **Equipo familiarizado con el patrón**: al menos un senior que lo haya implementado antes y pueda guiar.

**No aplicar Clean/Hexagonal cuando**:
- Es un MVP / spike / prueba de concepto.
- Los requisitos cambian semanalmente.
- El equipo lo está aprendiendo en el proyecto (paraliza la velocidad).
- El "dominio" es CRUD sobre una BD (no hay lógica de negocio real que aislar).

**Default intermedio**: usar **arquitectura por capas** (transporte → dominio → datos) dentro del monolito modular. Es 80% del beneficio con 20% del costo.

## Consecuencias

**Positivas**
- Tests unitarios rápidos (no requieren BD ni HTTP).
- Cambiar de PostgreSQL a Mongo es realmente factible (no solo teórico).
- Lógica de negocio expresada en lenguaje del dominio, no del framework.

**Negativas / Trade-offs**
- Más archivos, más interfaces, más mapeos entre capas.
- Curva de aprendizaje real (típicamente 2–4 sprints).
- En proyectos pequeños el ratio código-de-arquitectura vs código-de-negocio se invierte (más boilerplate que features).

## Alternativas consideradas

1. **Capas simples (3 capas)**: API/Service/Repository. Cubre el 80% de los casos. Default recomendado para la mayoría de proyectos.

2. **Anemic domain con CRUD directo**: válido para apps administrativas, dashboards internos, herramientas de tooling. No requiere abstracción adicional.

3. **DDD táctico completo** (Aggregates, Value Objects, Domain Events, etc.): superset de Clean/Hexagonal. Aplicar solo si el dominio es genuinamente complejo (banca, seguros, logística) y el equipo lo entiende.

## Cita de respaldo

> *"No se trata de tener la arquitectura más pura, sino de tener la arquitectura que realmente tu equipo pueda mantener."* — [patron arq.md](../../patron%20arq.md)
