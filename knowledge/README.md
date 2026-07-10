# Knowledge Base — Arquitectura, Datos y Sistemas

Conocimiento estructurado extraído de 3 transcripciones de YouTube. Diseñado para ser consultable por humanos y agentes de IA antes de tomar decisiones técnicas en proyectos reales.

> **Fuente de verdad**: este directorio `knowledge/` en la raíz del repo es la **FUENTE ÚNICA** de esta base de conocimiento. La copia en `packages/architecture-guide/knowledge/` es un **espejo sincronizado**: el script `packages/architecture-guide/scripts/sync-knowledge.js` la regenera (copia `knowledge/` raíz → package) en el hook `prepublishOnly`. **No edites la copia del package a mano** — se sobreescribe al publicar. Para cambiar cualquier archivo de la base, **edita siempre `knowledge/` raíz**.

## Origen

Las fuentes primarias están en `sources/`:

- [bd.md](sources/bd.md) — Arquitectura de bases de datos
- [patron arq.md](sources/patron%20arq.md) — Patrones de arquitectura de software
- [sistemas.md](sources/sistemas.md) — Diseño de sistemas escalables

**No modificar las transcripciones**. Son la fuente verificable.

## Mapa

| Pregunta | Documento |
|---|---|
| ¿Qué tipo de BD elijo? | [01-database-architecture.md](01-database-architecture.md) |
| ¿Monolito, microservicios, hexagonal, CQRS? | [02-architectural-patterns.md](02-architectural-patterns.md) |
| ¿Cómo escalo lecturas/escrituras? ¿Cuándo uso caché, queues, circuit breakers? | [03-systems-design.md](03-systems-design.md) |
| Empiezo un proyecto desde cero, ¿qué hago primero? | [BEST-PRACTICES.md](BEST-PRACTICES.md) |
| Necesito justificar una decisión técnica concreta | [adr/](adr/) |
| ¿Esta guía realmente sirve? Caso real aplicado | [CASE-STUDY-devground.md](CASE-STUDY-devground.md) |

## Cómo usar esta base

1. **Antes de iniciar un proyecto**: lee `BEST-PRACTICES.md` completo. Es la síntesis cruzada y la guía operativa.
2. **Frente a una decisión técnica puntual**: busca el ADR correspondiente en `adr/`. Cada ADR responde una pregunta atómica con decisión, trade-offs y alternativas.
3. **Para profundizar en un tema**: lee el documento de síntesis (01, 02, 03) antes de ir a las transcripciones originales.

## Estructura

```
knowledge/
├── README.md                       (este archivo)
├── 01-database-architecture.md     síntesis de bd.md
├── 02-architectural-patterns.md    síntesis de patron arq.md
├── 03-systems-design.md            síntesis de sistemas.md
├── BEST-PRACTICES.md               síntesis cruzada + checklist
├── CASE-STUDY-devground.md         la guía aplicada al propio repo
├── sources/                        transcripciones originales (bd, patrones, sistemas)
└── adr/
    ├── README.md                   qué es un ADR
    ├── 0001-elegir-tipo-de-base-de-datos.md
    ├── 0002-normalizar-vs-denormalizar.md
    ├── 0003-cuando-usar-indices.md
    ├── 0004-monolito-vs-microservicios.md
    ├── 0005-cuando-aplicar-clean-hexagonal.md
    ├── 0006-cuando-aplicar-cqrs.md
    ├── 0007-serverless-vs-servidor-dedicado.md
    ├── 0008-estrategia-de-cache.md
    ├── 0009-read-replicas-vs-cache.md
    ├── 0010-queues-y-workers-para-escrituras.md
    └── 0011-timeouts-y-circuit-breakers.md
```

## Principio rector

Los 3 videos coinciden en una idea fundamental:

> **Entiende el problema antes que la herramienta. No existe arquitectura, BD ni patrón "mejor" en abstracto — solo decisiones contextuales.**

Cualquier ADR o recomendación de esta base debe leerse con ese filtro.
