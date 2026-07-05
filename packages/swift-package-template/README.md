# @devground/swift-package-template

Plantilla de `Package.swift` para monorepos Swift/iOS modulares **por capa**, con la
decisión de aislamiento de actor correcta codificada desde el día 1. Es el análogo Swift
de `@devground/tsconfig`. Materializa [ADR-0019](https://github.com/elkisdm/devground/blob/main/docs/adr/0019-isolation-por-capa-swift.md).

La implementación de referencia viva es
[`swift-foundation/`](https://github.com/elkisdm/devground/tree/main/swift-foundation) en
este mismo repo (compila con `swift build` y pasa tests con Swift Testing).

## Por qué existe

El error más caro de la migración a Swift 6 es aplicar `MainActor` por defecto a **todas**
las capas. Es cómodo pero antipatrón: fuerza hops de actor y rompe `Sendable` en las capas
base, matando la portabilidad del core. Esta plantilla fija el default correcto:

| Capa | Aislamiento |
| --- | --- |
| `FoundationUtils`, `Domain`, `Networking`, `Persistence`, `FeatureInterfaces` | nonisolated + `Sendable` |
| `DesignSystem`, `AppFeature` | `.defaultIsolation(MainActor.self)` |

## Uso

```bash
cp node_modules/@devground/swift-package-template/templates/Package.swift  Package.swift
# renombra "SwiftFoundation" por el nombre de tu paquete y ajusta capas/feature-kits
```

El manifest `index.json` declara el mapeo para el futuro instalador del CLI
([ADR-0021](https://github.com/elkisdm/devground/blob/main/docs/adr/0021-deteccion-stack-cli.md)).

## Estado

Pre-estable (`0.0.0`) — sigue a los ADRs de devground políglota, aún en estado *Propuesto*.
`swift-tools-version: 6.2` (Approachable Concurrency y `defaultIsolation` son de Swift 6.2).
