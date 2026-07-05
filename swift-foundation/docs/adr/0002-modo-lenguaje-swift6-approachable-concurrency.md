# ADR-0002: Activar el modo de lenguaje Swift 6 con Approachable Concurrency

- **Estado**: Propuesto
- **Fecha**: 2026-07-04
- **Decisor**: edaza
- **Aplica a**: Todo el monorepo `swift-foundation` (`swiftLanguageModes` del `Package.swift`, `swiftSettings` por target, y el `SWIFT_VERSION` del app shell en Fase 3).

## Contexto

Swift separa dos cosas que suelen confundirse: **actualizar la toolchain** y **activar el modo de lenguaje Swift 6**. Subir de toolchain (aquí, la local es **6.2.3**) NO impone data-race safety estricta por sí solo; fuera del modo 6 los chequeos de concurrencia son warnings incrementales, no errores. Activar el modo es un paso **deliberado y separado**: cambiar `SWIFT_VERSION = 6` (o `swiftLanguageModes: [.v6]` en SPM).

El giro relevante fue **Swift 6.2** (15-sep-2025) con **Approachable Concurrency**: volvió usable la data-race safety al poner el código en el main actor por defecto (`-default-isolation MainActor`), en vez del estilo "annotation-heavy" de Swift 6.0 que paralizaba equipos con ruido de errores de `Sendable`. `nonisolated(nonsending)` y `defaultIsolation(_:)` (SE-0466) son de Swift 6.2, por lo que las decisiones se sostienen sobre la toolchain local 6.2.3.

Como es un proyecto **greenfield sin legado**, no hay migración por capas ni `@preconcurrency` como puente: se activa el modo 6 desde el día 1. La complejidad de "migración big-bang prohibida" que aplicaría a una base Swift 5 existente aquí no existe.

El riesgo real no es activar el modo, sino los atajos que lo evaden: `@unchecked Sendable` reintroduce data races silenciosas; aplicar `MainActor`-by-default a las capas base (Networking/Persistence) genera hops de actor y rompe `Sendable` — un antipatrón documentado.

## Decisión

Compilar todo el monorepo en **modo de lenguaje Swift 6** con **Approachable Concurrency** activada, y decidir el aislamiento **por capa, no global**.

- `Package.swift`: `swift-tools-version: 6.2` + `swiftLanguageModes: [.v6]` (ya presente en Fase 1). App shell (Fase 3): `SWIFT_VERSION = 6` explícito en el `.xcconfig`.
- **Aislamiento por capa** (regla dura, ver [ADR-0005](0005-modularizacion-por-feature-spm-interfaces.md) y ADR-0019 de devground):
  - UI, `DesignSystem`, `AppFeature` (raíz de composición) → `swiftSettings: [.defaultIsolation(MainActor.self)]`. `@MainActor` es el **default mental**.
  - `FoundationUtils`, `Domain`, `Networking`, `Persistence` → **`nonisolated` + `Sendable`**. Estas capas NO llevan `defaultIsolation(MainActor.self)`.
- **`@concurrent`** (mutuamente excluyente con `@MainActor`) y **actors dedicados** solo para trabajo genuinamente concurrente: un actor de red, un actor de persistencia, cómputo pesado. No por defecto.
- **Regla de revisión: cero `@unchecked Sendable` sin justificación escrita.** Si un diff necesita anotaciones defensivas para compilar, el modelo de concurrencia está mal diseñado y se rediseña, no se silencia.
- Features avanzadas (typed throws para errores acotados; `~Copyable`/ownership solo en rutas calientes o recursos de propiedad única; Embedded Swift solo si tocas firmware) se adoptan puntualmente, nunca por defecto en todo el dominio.
- **Library Evolution (`BUILD_LIBRARY_FOR_DISTRIBUTION`)**: NO se activa. Todo compila junto (ver [ADR-0008](0008-monorepo-package-swift-distribucion-fuente-semver.md)); solo aplica si distribuyes `.xcframework` a terceros.

Nota de versiones: el informe menciona Swift 6.3.x; la toolchain instalada localmente es **6.2.3**, que ya incluye Approachable Concurrency y `defaultIsolation`. Se usa `swift-tools-version: 6.2` y se sube cuando la toolchain local avance, sin cambiar ninguna de estas decisiones.

## Consecuencias

**Positivas**
- Data-race safety verificada por el compilador desde el día 1, sin la deuda de una migración posterior.
- Approachable Concurrency elimina el ruido de errores de `Sendable`: el modelo es single-threaded/MainActor por defecto, más simple de razonar.
- El aislamiento por capa mantiene las capas base (`Domain`/`Networking`/`Persistence`) `nonisolated`+`Sendable`, lo que es prerrequisito de la frontera de portabilidad ([ADR-0013](0013-core-swift-puro-frontera-portabilidad.md)).

**Negativas / Trade-offs**
- Activar el modo 6 desde el inicio puede frenar puntualmente cuando un diseño de concurrencia está mal planteado. Mitigación: eso es señal, no fricción — se rediseña en el mismo PR en vez de acumular `@unchecked Sendable`.
- Aplicar el aislamiento correcto por capa NO es trivial y es el error más caro si se hace por comodidad (MainActor a todo). Mitigación: la decisión está codificada en la plantilla de `Package.swift` y auditada en revisión.
- La cadencia de versiones de Swift (6.0→6.4 en ~20 meses) obliga a mantener la toolchain pinneada y al día.

## Alternativas consideradas

1. **Quedarse en modo Swift 5 con warnings incrementales**: descartado. Posterga la data-race safety y acumula deuda; en greenfield no hay razón para no empezar en modo 6.
2. **Migración por capas con `@preconcurrency` como puente**: descartado. Es la estrategia correcta para legado Swift 5, pero aquí no hay legado que migrar.
3. **`defaultIsolation(MainActor.self)` global (todos los targets)**: descartado explícitamente. Aplicarlo a Networking/Persistence genera hops de actor innecesarios y rompe `Sendable`; es un antipatrón. El aislamiento se decide por capa.
4. **Estilo Swift 6.0 annotation-heavy sin Approachable Concurrency**: descartado. Genera ruido de `Sendable` que paraliza el equipo; Approachable Concurrency (6.2) es justamente la corrección de ese estilo.

## Referencias

- Informe fundacional §2.1 (Swift moderno y concurrencia), §4.3 (concurrencia como parte de la arquitectura), §4.9 (tabla de decisiones): `../../../research/ios-swift-engineering/informe-fundacion.md`
- Decisiones del usuario (greenfield, modo Swift 6 desde el día 1): `../../../research/ios-swift-engineering/DECISIONS.md`
- [ADR-0005 — Modularización por feature en SPM](0005-modularizacion-por-feature-spm-interfaces.md) (donde vive el aislamiento por capa)
- [ADR-0013 — Core Swift puro como frontera de portabilidad](0013-core-swift-puro-frontera-portabilidad.md)
- SE-0466 (`defaultIsolation`), Approachable Concurrency (Swift 6.2)
