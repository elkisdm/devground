# ADR-0046: Núcleo público y capa de organización

- **Estado**: Aceptado
- **Fecha**: 2026-11-05
- **Decisor**: edaza
- **Aplica a**: `@devground/sdd` (skill spec-flow), cualquier organización que adopte devground
- **Extiende**: [ADR-0042](0042-plan-de-ejecucion-unificado-con-pauta.md) (Pauta), [ADR-0043](0043-mapa-de-artefactos-y-encaje-con-agile.md) (DoD en dos niveles)

## Contexto

`@devground/sdd` se publica en npm con acceso público y empaqueta la skill spec-flow tal como
se usa en una máquina concreta. Desde ADR-0042, esa skill trae una sección «Registro en
Pauta» con los proyectos de una empresa (`ATL`, `CLA`) y las herramientas de su registro de
trabajo. Quien instala el paquete recibe instrucciones que no le sirven, y la organización
expone en público cómo trabaja por dentro.

Además, una empresa que adopte devground como su capa de ingeniería necesita poner reglas
propias (quién aprueba, DoD de cada producto, registro de trabajo, excepciones) sin hacer un
fork de la skill.

## Decisión

**El núcleo publicado es genérico. Lo propio de una organización vive en un overlay que la
skill lee si existe.**

1. **Overlay de spec-flow.** En el Paso 0, spec-flow lee, si existen y en este orden:
   - `~/.claude/spec-flow-overlay.md`: la capa de la máquina o de la organización;
   - `docs/process/spec-flow-overlay.md`: la capa del proyecto, que gana sobre la anterior.

   Un overlay puede **agregar** pasos (registro en un tracker, aprobaciones, evidencias) y
   filas al DoD. No puede quitar pasos del núcleo (tests, closing check, DoR).

2. **El bloque de Pauta sale del núcleo** y pasa al overlay de la máquina que lo usa. El
   núcleo solo dice, en genérico, que si el equipo usa un registro de trabajo el overlay
   describe cómo registrar el cambio. ADR-0042 sigue vigente para quien tenga ese overlay.
3. **El marco corporativo no vive en devground.** Las políticas de una empresa (gobierno,
   RACI, excepciones, DoD por producto) viven en su propio repositorio de contexto y llegan a
   cada proyecto por el overlay o por `docs/definition-of-done.md` (ADR-0043).
4. **Regla para el núcleo**: ningún archivo que se publique en npm nombra empresas, personas,
   proyectos privados ni servicios internos. Los ADR del repo pueden mencionarlos como
   contexto histórico.

## Consecuencias

**Positivas**

- El paquete público sirve a cualquiera sin instrucciones ajenas.
- Una organización ajusta el flujo sin fork y sin perder las actualizaciones del núcleo.

**Negativas / Trade-offs**

- Una pieza más que leer en el Paso 0. Mitigación: si no hay overlay, no cuesta nada.
- El overlay de la máquina no está versionado en el repo. Mitigación: la organización lo
  versiona en su repositorio de contexto y lo enlaza.

## Alternativas consideradas

1. **Dejar Pauta en el núcleo con la condición «solo si el proyecto está registrado»**: es lo
   que había y sigue exponiendo detalles internos en un paquete público.
2. **Un fork privado de spec-flow por organización**: diverge del núcleo en semanas; es el
   problema de deriva que ADR-0027 ya resolvió para la orquestación.

## Referencias

- [ADR-0016](0016-spec-flow-como-paquete-sdd.md), [ADR-0027](0027-empaquetar-regla-de-orquestacion.md), [ADR-0042](0042-plan-de-ejecucion-unificado-con-pauta.md), [ADR-0043](0043-mapa-de-artefactos-y-encaje-con-agile.md)
