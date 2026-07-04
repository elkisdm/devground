# ADR-0013: Mantener el core en Swift puro como frontera de portabilidad

- **Estado**: Propuesto
- **Fecha**: 2026-07-04
- **Decisor**: edaza
- **Aplica a**: Las capas base del monorepo — `Domain`, `Networking`, `Persistence`, `FoundationUtils`. Es la regla que las define. `DesignSystem` y las Feature UIs quedan explícitamente fuera (son nativas no portables).

## Contexto

El acoplamiento del dominio a UIKit/SwiftUI es el **bloqueador #1 de portabilidad** y el mayor enemigo de la testabilidad. Una capa de dominio que importa SwiftUI no se puede probar sin UI ni compartir con otra plataforma.

El patrón de menor riesgo para compartir lógica entre iOS y Android es **shared core + native UI**: se comparte dominio/datos/red y se mantiene la UI nativa (SwiftUI en iOS, Jetpack Compose en Android). **SwiftUI no corre en Android: es un límite duro.** La frontera de lo compartible coincide **exactamente** con el corte de capas: `Domain`, `Networking`, `Persistence`, `FoundationUtils` (Swift puro sobre `Foundation`, sin UIKit/SwiftUI) es lo portable; `DesignSystem` + Feature UIs es lo nativo no portable.

**Android está fuera de scope por ahora** (`../../../research/ios-swift-engineering/DECISIONS.md`: Fase 8 desactivada). Por eso esta decisión NO es "vamos a portar ya". Es una **disciplina que se mantiene HOY** por dos razones que valen aunque nunca se porte:

1. **Testabilidad inmediata**: un `Domain` sin UI se prueba aislado sin simulador ni red real (encaja con [ADR-0009](0009-swift-testing-default-xctest-acotado.md)).
2. **No cerrar la puerta**: si Android entra en scope mañana, el core ya compila con el SDK oficial de Swift para Android (Swift 6.3, marzo 2026) o lo lleva Skip (modo Fuse, nativo) — sin reescritura.

El esqueleto ya lo materializa: `Domain`, `Networking`, `Persistence`, `FoundationUtils` son targets `nonisolated`+`Sendable` que no dependen de `DesignSystem` ni de nada de UI ([ADR-0005](0005-modularizacion-por-feature-spm-interfaces.md), [ADR-0002](0002-modo-lenguaje-swift6-approachable-concurrency.md)).

## Decisión

**Mantener `Domain`, `Networking`, `Persistence` y `FoundationUtils` en Swift puro sobre `Foundation`, sin ningún import de UIKit/SwiftUI. Es una regla por construcción, no una aspiración.**

| Agnóstico de UI (portable) | Nativo SwiftUI (no portable) |
|---|---|
| `FoundationUtils` | `DesignSystem` (tokens + componentes glass) |
| `Domain` (UseCases, entidades, reglas) | Vistas y navegación SwiftUI |
| `Networking` (Client, DTO→Domain) | `AppRouter` / integración `@Environment` |
| `Persistence` (protocolos) | Live Activities, Liquid Glass, deep-link presentation |

- **Prohibición dura**: `Domain`/`Networking`/`Persistence`/`FoundationUtils` **no importan** UIKit ni SwiftUI. `Domain` importa solo `Foundation`. Un import ilegal es un fallo de revisión (y, dado el grafo de módulos, no debería siquiera compilar si esas capas no dependen de `DesignSystem`).
- Estas capas son `nonisolated`+`Sendable` (no `MainActor`-by-default), coherente con el aislamiento por capa de ADR-0002.
- **Marco de la decisión hoy**: la razón operante es **testabilidad + no cerrar la puerta**, NO un port inminente. Android es Fase 8 condicional, desactivada.
- **Si Android entra en scope** (futuro): el core compila con el SDK oficial de Swift para Android + **Skip Fuse** (Swift-first, ruta natural para un equipo Swift), o se expone a un módulo **KMP** (Kotlin-first). Se **evita Compose Multiplatform para la UI iOS** (renderiza sobre canvas Skia, degrada feel/rendimiento/accesibilidad nativos) salvo pantallas internas. Esa elección de ruta se documentaría en un ADR nuevo cuando se active la fase.

## Consecuencias

**Positivas**
- Testabilidad inmediata: el dominio se prueba aislado sin UI ni red real — beneficio que se cobra hoy, sin Android.
- La puerta a compartir con Android queda abierta sin reescritura: el core ya está en el lado correcto de la frontera.
- Refuerza la separación de capas ([ADR-0005](0005-modularizacion-por-feature-spm-interfaces.md)): el dominio libre de UI es un límite arquitectónico sano en sí mismo.

**Negativas / Trade-offs**
- Aislar terceros y mantener el dominio libre de UIKit/SwiftUI añade **boilerplate** y exige **disciplina sostenida**. Mitigación: es la misma disciplina que ya imponen la DI tras protocolos (ADR-0006) y el grafo de módulos; el costo marginal es bajo.
- Se paga una disciplina cuyo beneficio de portabilidad podría no cobrarse nunca (si Android nunca entra). Mitigación: el beneficio de **testabilidad** ya justifica la regla por sí solo, aunque Android jamás llegue.
- Si algún día se porta, quedan costos reales no cubiertos por esta decisión: overhead de interop (bridging Swift↔Kotlin/Java vía JNI), y que la ruta Swift→Android es más joven que KMP. Mitigación: se asumen cuando (y si) se active la Fase 8; hoy no aplican.

## Alternativas consideradas

1. **Permitir que el dominio importe SwiftUI por comodidad**: descartado. Es el bloqueador #1 de portabilidad y mata la testabilidad aislada; contradice todo el punto de la capa.
2. **No imponer la disciplina hasta que Android entre en scope**: descartado. Retrofitear la separación después es caro (hay que desacoplar todo el dominio); mantenerla desde el día 1 cuesta poco y ya paga en testabilidad.
3. **Adoptar KMP o Skip ahora (portar ya)**: descartado. Android está fuera de scope; introducir la toolchain multiplataforma hoy sería sobre-ingeniería. La disciplina de core puro es el único prerrequisito que sí se mantiene.
4. **Compose Multiplatform para la UI iOS**: descartado (para el futuro hipotético). Renderiza sobre canvas Skia y degrada la experiencia nativa; solo válido para pantallas internas/utilitarias.

## Referencias

- Informe fundacional §2.6 (impacto en Android), §4.8 (frontera de portabilidad, con tabla), §4.1 (capas), §4.9: `../../../research/ios-swift-engineering/informe-fundacion.md`
- Decisiones del usuario (Android fuera de scope; se conserva la disciplina de core portable): `../../../research/ios-swift-engineering/DECISIONS.md`
- `Package.swift` del monorepo (Domain/Networking/Persistence/FoundationUtils como capas base nonisolated)
- [ADR-0002 — nonisolated + Sendable en capas base](0002-modo-lenguaje-swift6-approachable-concurrency.md)
- [ADR-0005 — Modularización por feature (grafo de capas)](0005-modularizacion-por-feature-spm-interfaces.md)
- [ADR-0009 — Swift Testing (dominio testeable aislado)](0009-swift-testing-default-xctest-acotado.md)
- SDK oficial de Swift para Android (Swift 6.3, mar-2026), Skip Fuse, KMP
