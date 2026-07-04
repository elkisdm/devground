# SwiftFoundation

Monorepo fundacional ("librería de librerías") para apps iPhone en Swift — **Fase 1** del
roadmap en [`../research/ios-swift-engineering/informe-fundacion.md`](../research/ios-swift-engineering/informe-fundacion.md) §6.

Greenfield · deployment target iOS 17 · Base SDK iOS 26 · modo lenguaje Swift 6 +
Approachable Concurrency · solo/1-2 devs · sin Android por ahora (pero el core es Swift
puro portable). Decisiones en [`../research/ios-swift-engineering/DECISIONS.md`](../research/ios-swift-engineering/DECISIONS.md)
y ADRs de dominio en [`docs/adr/`](docs/adr/).

## Grafo de módulos (dependencias solo hacia abajo, sin ciclos)

```
AppFeature (MainActor)  ── raíz de composición, cablea la DI
  ├─ FeatureInterfaces ──┐
  ├─ DesignSystem (MainActor) ─┐
  ├─ Networking ─┐        │     │
  ├─ Persistence ┤        │     │
  └─ Domain ◄────┴────────┘     │   FeatureInterfaces → Domain
        │                       │   DesignSystem → FoundationUtils
        └─ FoundationUtils ◄────┘   Networking/Persistence → Domain, FoundationUtils
```

| Capa | Aislamiento | Rol |
| --- | --- | --- |
| `FoundationUtils` | nonisolated | Value types y helpers, cero deps de terceros |
| `Domain` | nonisolated + Sendable | Entidades, casos de uso, protocolos de repositorio (Swift puro, **frontera de portabilidad**) |
| `Networking` | nonisolated + Sendable | Cliente + DTO→Domain |
| `Persistence` | nonisolated + Sendable | Protocolos de almacenamiento |
| `DesignSystem` | **MainActor** | Tokens semánticos + componentes SwiftUI |
| `FeatureInterfaces` | nonisolated | Solo protocolos entre features (inversión de deps) |
| `AppFeature` | **MainActor** | Raíz de composición |

## Verificar

```bash
swift build          # compila el grafo en modo lenguaje Swift 6, sin warnings de concurrencia

# swift test necesita el toolchain de Xcode (la librería Swift Testing no viene con las
# Command Line Tools). Sin cambiar xcode-select globalmente:
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcrun swift test

# Alternativa permanente (requiere sudo, una sola vez):
#   sudo xcode-select -s /Applications/Xcode.app
#   swift test
```

## Estado

Fase 1 = esqueleto de librerías. El app shell iOS (.xcodeproj, UI Liquid Glass, navegación)
y el harness completo (`swift-dependencies`, `swift-clocks`, snapshots) llegan en Fases 2-3.
