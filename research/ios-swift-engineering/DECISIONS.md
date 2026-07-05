# Decisiones tomadas — iniciativa iOS/Swift + devground políglota

> Complemento de [`informe-fundacion.md`](./informe-fundacion.md). Fija las respuestas a las
> preguntas abiertas §8 del informe y cómo podan el stack. Fecha: 2026-07-04.

## Respuestas del usuario

| Pregunta (informe §8) | Decisión |
| --- | --- |
| Punto de partida | **Greenfield** (app nueva desde cero) |
| Deployment target | **iOS 17** (SwiftUI-first, `@Observable` sin fallbacks, ~97% del parque) |
| Equipo | **Solo / 1-2 devs** |
| Android en scope | **No por ahora** (pero se mantiene la disciplina de core portable) |

## Stack podado (consecuencia de las decisiones)

Greenfield + solo dev + sin Android elimina toda la complejidad "para escala":

| Área | Decisión definitiva | Descartado (y por qué) |
| --- | --- | --- |
| Lenguaje/concurrencia | Swift 6.3.x, **modo lenguaje Swift 6 + Approachable Concurrency desde el día 1** | Migración por capas / `@preconcurrency` (no hay legado) |
| UI + estado | **SwiftUI + `@Observable`**, patrón **MV / vanilla SwiftUI** | TCA, MVVM-C sistemático (ceremonia innecesaria para 1-2 devs) |
| Build system | **SwiftPM puro** + caché nativa Xcode 26 | Tuist, Bazel (no hay build times ni equipo que lo justifiquen) |
| Base SDK / target | Base SDK **iOS 26** (obligatorio publicar) · target **iOS 17** | — |
| Testing | **Swift Testing** + `swift-dependencies` + `swift-clocks` + `swift-snapshot-testing` | — |
| DI | **`swift-dependencies`** (inyección tras protocolos) | — |
| Distribución librería | Monorepo, un `Package.swift`, **fuente**, SemVer estricto | Library Evolution / XCFramework (todo compila junto) |
| Navegación | `NavigationStack` + `enum` tipado + `AppRouter` inyectado | — |
| Diseño | Liquid Glass (glass solo en navegación) + tokens semánticos | — |
| CI/CD | Pendiente elegir Xcode Cloud vs GitHub Actions + Fastlane Match (pregunta abierta §8.6) | — |
| Android | **Fase 8 desactivada.** Se conserva la disciplina: `Domain`/`Networking`/`Persistence`/`FoundationUtils` en Swift puro sin UIKit/SwiftUI | KMP / Skip (fuera de scope hoy) |

## Preguntas abiertas que quedan

- **§8.6 CI/CD**: Xcode Cloud (all-in Apple, menos fricción) vs GitHub Actions + Fastlane Match (portable). Sin equipo grande, Xcode Cloud es la apuesta de menor fricción por defecto.
- **§8.7 iPad como target de primera clase**: aún sin definir.
- **§8.10 Rigor de accesibilidad**: cumplimiento formal WCAG 2.1 AA vs buenas prácticas.
- **§8.11 Librería base interna vs OSS pública**: define registry privado vs Swift Package Index.

## Próximos pasos

1. Derivar los ADRs de dominio iOS (informe §7, decisiones 1-13) — status `proposed`.
2. Derivar los ADRs de devground políglota (informe §7, 14-18) en `docs/adr/` (siguiente: 0018).
3. Ejecutar Fase 1 del roadmap (monorepo + grafo de módulos) — **pasa por `spec-flow`** al ser un cambio de código real.
