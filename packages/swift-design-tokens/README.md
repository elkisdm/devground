# @devground/swift-design-tokens

Tokens semánticos para SwiftUI: **colores por rol** (light/dark en una definición),
**escala de espaciado** 4/8pt, **tipografía Dynamic Type** y helpers de **Liquid Glass**
(iOS/macOS 26 con fallback). Es el design system base de la capa `DesignSystem`.
Materializa [ADR-0012 de dominio](https://github.com/elkisdm/devground/blob/main/swift-foundation/docs/adr/0012-tokens-semanticos-liquid-glass.md).

Implementación de referencia viva:
[`swift-foundation/Sources/DesignSystem/`](https://github.com/elkisdm/devground/tree/main/swift-foundation/Sources/DesignSystem).

## Qué trae

| Archivo | Rol |
| --- | --- |
| `DesignTokens.swift` | Escala de espaciado + `SemanticColors` (colores por rol, `nonisolated`) |
| `Typography.swift` | Fuentes ligadas a text styles → Dynamic Type |
| `Theme.swift` | Inyección de la paleta por `Environment` (`.semanticColors(_:)`) |
| `LiquidGlass.swift` | `navigationGlass(in:)` — vidrio solo en navegación, gated `#available` |

## Principios que impone

- **Sin hex crudos** — rompen dark mode y vibrancy; se nombran colores por rol.
- **Vidrio solo en navegación** — nunca sobre contenido ni glass-on-glass.
- **Degradación** — en OS < 26, `navigationGlass` cae a `.ultraThinMaterial`.
- **Accesibilidad** — la tipografía escala con Dynamic Type; los colores por rol
  respetan contraste. (Los gates de VoiceOver / Reduce Transparency / contraste sobre
  fondos ocupados se validan en simulador/dispositivo, no en `swift build`.)

## Uso

Copia los artefactos a tu capa `DesignSystem` (ver `index.json`). Requiere que el target
sea MainActor por defecto salvo `SemanticColors`, que es `nonisolated`.

## Estado

Pre-estable (`0.0.0`) — sigue a los ADRs, aún en estado *Propuesto*.
