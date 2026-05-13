# @devground/architecture-guide

> Base de conocimiento de arquitectura + plantillas de ADR, instalables en cualquier proyecto con un comando.

## Qué instala

```
knowledge/
├── README.md
├── 01-database-architecture.md
├── 02-architectural-patterns.md
├── 03-systems-design.md
├── BEST-PRACTICES.md
├── CASE-STUDY-devground.md
└── adr/
    ├── README.md
    └── 0001..0011-*.md       # 11 ADR templates derivados de fuentes externas
```

Contenido sintetizado a partir de transcripciones de YouTube sobre bases de datos, patrones arquitectónicos y diseño de sistemas escalables. Convertido en documentación accionable + ADRs en formato Michael Nygard.

## Uso

### Opción 1 — Vía CLI de devground

```bash
npx devground-init
# Selecciona "Architecture Guide" en el prompt
```

### Opción 2 — Directo

```bash
pnpm add -D @devground/architecture-guide
npx devground-architecture
```

Esto copia `knowledge/` a la raíz de tu proyecto. **No sobreescribe** si ya existe.

### Crear un nuevo ADR

```bash
npx devground-adr new "Use Postgres for transactional data"
# → Crea docs/adr/0001-use-postgres-for-transactional-data.md
```

El comando:
1. Detecta el siguiente número disponible en `docs/adr/`.
2. Slugifica el título (sin acentos, sin espacios).
3. Crea el archivo con el template de Michael Nygard pre-poblado.

## Filosofía

> "No existe arquitectura, BD ni patrón mejor en abstracto — solo decisiones contextuales."

Esta guía no te dice qué hacer. Te da el marco para decidir con criterio y documentar la decisión.

**Empieza por leer `knowledge/BEST-PRACTICES.md`**.

## Licencia

MIT
