# ADR-0019: Isolation por capa como default de las plantillas Swift

- **Estado**: Propuesto
- **Fecha**: 2026-07-04
- **Decisor**: edaza
- **Aplica a**: `@devground/swift-package-template` y todo repo Swift scaffoldeado por devground

## Contexto

Swift 6.2 (sep-2025) introdujo **Approachable Concurrency**, que permite fijar el aislamiento de actor por defecto a nivel de target con `defaultIsolation(MainActor.self)` (SE-0466, tools-version ≥ 6.2). Poner todo en el `MainActor` elimina el ruido de errores de `Sendable` y es cómodo para la capa de UI.

El problema, verificado en la investigación ([informe §2.5 y §4.7](../../research/ios-swift-engineering/informe-fundacion.md)), es que **aplicar `MainActor`-by-default a las capas base es un antipatrón**: fuerza hops de actor innecesarios y rompe la naturaleza `Sendable`/`nonisolated` que necesitan `Networking` y `Persistence` para ejecutarse fuera del hilo principal. Es el error más caro de la migración a Swift 6, y una plantilla que lo codifique mal lo propaga a cada consumidor.

## Decisión

**Las plantillas `Package.swift` de devground fijan el aislamiento por capa, no global:**

- **UI / `DesignSystem`** → `swiftSettings: [.defaultIsolation(MainActor.self)]`.
- **`Networking` / `Persistence` / `FoundationUtils`** → **sin** default isolation: `nonisolated` + tipos `Sendable`.

El default de la plantilla es el correcto por construcción; el consumidor no tiene que descubrir la distinción a fuerza de errores.

## Consecuencias

**Positivas**
- Evita el error de concurrencia más costoso desde el día 1.
- Mantiene las capas base `nonisolated`+`Sendable`, que es también la **frontera de portabilidad** hacia Android (core Swift puro).
- La plantilla enseña la práctica correcta con el ejemplo, no con un documento aparte.

**Negativas / Trade-offs**
- La plantilla es más opinada y requiere que el consumidor entienda por qué UI y capas base difieren. Mitigación: comentario en el `Package.swift` generado que enlaza a este ADR.
- Si el proyecto no separa capas (app trivial monolítica), la distinción añade estructura que quizá no necesita. Mitigación: la separación por capas es justamente lo que devground promueve; un proyecto que no la quiere puede editar la plantilla.

## Alternativas consideradas

1. **`MainActor` global por comodidad (descartada)**: antipatrón documentado; rompe `Sendable` en capas base y degrada rendimiento con hops de actor.
2. **Sin default de isolation, cada repo decide (descartada)**: propenso al error exacto que este ADR previene. El punto de una plantilla es codificar la decisión difícil.

## Referencias

- [`research/ios-swift-engineering/informe-fundacion.md`](../../research/ios-swift-engineering/informe-fundacion.md) §2.5, §4.3, §4.7.
- SE-0466 (default actor isolation por módulo), Approachable Concurrency (Swift 6.2).
- [ADR-0018](0018-devground-poliglota-ts-swift.md) (los `@devground/swift-*` donde vive esta plantilla).
