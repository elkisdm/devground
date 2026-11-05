# ADR-0043: Mapa de artefactos y encaje con Agile

- **Estado**: Aceptado
- **Fecha**: 2026-11-05
- **Decisor**: edaza
- **Aplica a**: skill spec-flow (Pasos 3 y 4), plantilla `AGENTS.md`, `knowledge/`, cualquier proyecto que use devground
- **Extiende**: [ADR-0029](0029-tests-como-definition-of-done.md) (tests en el DoD), [ADR-0039](0039-review-opt-in-y-spec-como-gate.md) (la spec como gate)

## Contexto

La industria nombra el trabajo de producto e ingeniería con un vocabulario estable: PRD,
historias, criterios de aceptación (AC), Definition of Ready (DoR), Definition of Done (DoD),
requisitos no funcionales (NFR), ADR, diseño técnico, y desde 2025 «spec-driven development»
con una «constitución» del proyecto (GitHub Spec Kit, Kiro). Al mismo tiempo, las empresas
donde se usa devground están adoptando Agile (Scrum o Kanban).

devground ya resuelve casi todo eso con otros nombres: el tier de spec-flow es la
clasificación por complejidad y riesgo, el brief es la spec con AC y Given/When/Then, el
`### Closing check` es el DoD, `AGENTS.md` + los ADR hacen de constitución y el registro de
trabajo (Pauta u otro) lleva backlog, épicas y sprints. Pero nada lo dice: quien llega con el
vocabulario estándar no encuentra dónde está cada cosa, y la revisión del 2026-11-05 confirmó
que cinco piezas no tienen representación: **PRD de iniciativa, DoR, catálogo de NFR, DoD en
dos niveles y constitución**.

No todos los artefactos se exigen siempre: ni Agile ni Scrum los piden (la Scrum Guide 2020
solo exige el DoD, el Product Backlog y el Sprint Backlog). La proporcionalidad por tier que
ya rige spec-flow es la regla correcta también aquí.

## Decisión

**Nombrar las piezas de devground con el vocabulario estándar, cubrir los cinco huecos sin
sumar ceremonia, y dejar explícito cómo encaja Agile.**

### 1. Mapa de artefactos

| Artefacto                           | En devground                                                          | Tier 0         | Tier 1         | Tier 2                          | Tier 3                        |
| ----------------------------------- | --------------------------------------------------------------------- | -------------- | -------------- | ------------------------------- | ----------------------------- |
| Constitución                        | `AGENTS.md` del proyecto + `docs/adr/`                                | —              | se respeta     | se respeta                      | se respeta                    |
| PRD (iniciativa)                    | `docs/prd/<iniciativa>.md` (plantilla `prd-template.md` de spec-flow) | —              | —              | si es parte de una iniciativa   | si es parte de una iniciativa |
| Historia + AC                       | `### Goal` + `### Acceptance criteria` del brief                      | —              | sí             | sí                              | sí                            |
| Spec                                | `### Spec` (Given/When/Then)                                          | —              | —              | sí                              | sí                            |
| Diseño técnico (HLD/LLD, tech spec) | `### Technical` / `### Design`                                        | —              | —              | si hay decisión real            | sí                            |
| ADR                                 | `docs/adr/`                                                           | —              | —              | si hay decisión de arquitectura | sí                            |
| NFR                                 | `knowledge/nfr-catalogo.md`, marcados en la DoR                       | —              | —              | sí                              | sí                            |
| DoR                                 | checklist al final del Paso 3 de spec-flow                            | —              | el brief corto | sí                              | sí                            |
| Tareas                              | `### Tasks` + `### Ejecución`                                         | —              | —              | `### Ejecución`                 | sí                            |
| DoD                                 | DoD base (spec-flow Paso 4 + `AGENTS.md`) + DoD del producto          | chequeo mínimo | sí             | sí                              | sí                            |
| Backlog, épicas, sprints            | el registro de trabajo del equipo (Pauta u otro)                      | —              | ítem           | ítem + brief                    | ítem + brief                  |

### 2. Encaje con Agile

Tres capas que no compiten:

- **Gestión (Agile: Scrum o Kanban)**: qué se trabaja y en qué orden. Vive en el registro de
  trabajo: backlog, épicas, sprints, revisión y retrospectiva.
- **Ingeniería (devground)**: cómo se especifica, se construye y se demuestra que está
  terminado: spec-flow, tests, gates, ADR.
- **Gobierno (la organización)**: los límites comunes de seguridad, datos, diseño y
  cumplimiento. Vive en la capa de organización ([ADR-0046](0046-nucleo-publico-y-capa-de-organizacion.md)), no en el núcleo público.

**El DoD es el punto de contacto**: Scrum lo exige y devground lo define y lo verifica. Un ítem
que no cumple el DoD no está terminado y vuelve al backlog.

### 3. PRD solo para iniciativas

Un PRD existe cuando un objetivo de negocio se reparte en varios cambios (en el registro de
trabajo, una épica). Vive en `docs/prd/<iniciativa>.md` con la plantilla de spec-flow:
problema, para quién, métrica de éxito, alcance y fuera de alcance, NFR, riesgos y decisiones
abiertas. Los briefs de Tier 2–3 llevan una línea `**Origen**:` que enlaza el PRD o la épica
(o `—` si el cambio es suelto). Un cambio aislado no necesita PRD.

### 4. DoR como checklist, no como etapa

Al cerrar el brief (fin del Paso 3), en Tier 2–3, se marca:

- objetivo y AC verificables;
- archivos y rutas verificados contra el código;
- supuestos de alto impacto confirmados o declarados;
- dependencias externas identificadas (servicios, accesos, otras personas);
- NFR aplicables marcados desde el catálogo.

Si algo falta, se completa antes de la primera edición. En Tier 0–1 el brief corto ya es la DoR.

### 5. Catálogo de NFR

`knowledge/nfr-catalogo.md` es un índice: cada atributo de calidad (seguridad, rendimiento,
disponibilidad, observabilidad, costo, accesibilidad, datos personales) con el ADR o KB que lo
fija y la pregunta que hay que responder. No duplica los ADR: los enlaza.

### 6. DoD en dos niveles

- **Base (todo proyecto)**: el DoD del Paso 4 de spec-flow y la sección «Definition of Done»
  de `AGENTS.md`.
- **Del producto (opcional)**: `docs/definition-of-done.md` en el repo agrega filas propias
  (por criticidad, regulación o tipo de sistema). El `### Closing check` de spec-flow las suma
  cuando el archivo existe. Nunca resta filas del nivel base.

### 7. La constitución es `AGENTS.md`

No se crea un archivo nuevo. `AGENTS.md` (estándar abierto, lo leen todos los agentes) más los
ADR del repo son la constitución. La skill `cimientos` la siembra en proyectos nuevos.

## Consecuencias

**Positivas**

- Quien llega con el vocabulario estándar encuentra cada pieza en una tabla.
- Los cinco huecos se cubren con un checklist, un índice, una plantilla y un archivo opcional:
  ninguno agrega ceremonia a Tier 0–1.
- La empresa puede adoptar Agile sin crear un marco paralelo: devground ya es su capa de
  ingeniería.

**Negativas / Trade-offs**

- La DoR y la línea `Origen` suman unas líneas al brief de Tier 2–3. Mitigación: son checklist
  de marcar, no texto nuevo.
- El DoD del producto puede crecer sin control. Mitigación: solo suma filas verificables; una
  fila que no se puede comprobar no entra.

## Alternativas consideradas

1. **Adoptar GitHub Spec Kit tal cual**: su flujo (constitution → specify → plan → tasks →
   implement → converge) es equivalente al de spec-flow, pero no gradúa la ceremonia por
   riesgo, que es la lección central de ADR-0029 a ADR-0040.
2. **Una plantilla por artefacto (PRD, BRD, HLD, LLD, DoR, NFR…)**: más burocracia y menos
   adopción; casi todos ya viven como secciones del brief.

## Referencias

- GitHub Spec Kit: https://github.com/github/spec-kit
- AGENTS.md: https://agents.md
- Scrum Guide 2020 (Definition of Done): https://scrumguides.org/scrum-guide.html
- Kiro, specs: https://kiro.dev/docs/specs/
- [ADR-0029](0029-tests-como-definition-of-done.md), [ADR-0039](0039-review-opt-in-y-spec-como-gate.md), [ADR-0042](0042-plan-de-ejecucion-unificado-con-pauta.md), [ADR-0046](0046-nucleo-publico-y-capa-de-organizacion.md)
