# ADR-0005: Modularizar por feature en SPM con módulos de interfaz

- **Estado**: Propuesto
- **Fecha**: 2026-07-04
- **Decisor**: edaza
- **Aplica a**: La estructura completa del monorepo `swift-foundation` (targets y products del `Package.swift`, grafo de dependencias).

## Contexto

Hay dos formas de dividir una app en módulos:

- **Por capa/tipo de archivo** (`Views/`, `ViewModels/`, `Services/`): escala mal. Cada feature toca todos los módulos; nada es removible; los límites no expresan el dominio.
- **Por feature autocontenida**: cada feature es un módulo removible que compone las capas base que necesita. SPM aplica los límites gratis (un módulo no puede importar lo que no declara como dependencia).

El invariante que gobierna la arquitectura es triple (informe §4): **lógica fuera de las vistas**, **límites de módulo con dependencias unidireccionales e invertidas**, y **dependencias inyectadas y testeables**. La modularización es donde se hacen cumplir los dos últimos.

Problema de comunicación entre features: si `FeatureA` necesita algo de `FeatureB`, importar la implementación de B acopla implementación con implementación y crea un grafo frágil (o ciclos). La solución es un **módulo de interfaz** (solo protocolos) e invertir la dependencia.

El esqueleto de Fase 1 ya materializa esta decisión: el `Package.swift` declara `FoundationUtils`, `Domain`, `Networking`, `Persistence`, `DesignSystem`, `FeatureInterfaces` y `AppFeature`, con dependencias solo hacia abajo.

## Decisión

**Modularizar por FEATURE (no por capa), en Swift Package Manager, con módulos de interfaz para invertir dependencias entre features.**

Grafo de módulos, dependencias estrictamente **hacia abajo, sin ciclos**:

```
                         AppTarget / AppFeature
                    (composición raíz, DI wiring, AppRouter)
                                  │
              ┌───────────────────┼───────────────────┐
        FeatureHome          FeatureAuth          FeatureX…   ← Feature kits
              │                   │                   │
              │        ┌──────────┴──────────┐        │
      FeatureInterfaces (protocolos)     DesignSystem (MainActor OK)
              │                               │
              └──────────────┬────────────────┘
                             ▼
                          Domain                     ← Swift puro (Foundation)
                    (entidades, UseCases,
                     protocolos de repositorio)
                        │            │
                  Networking     Persistence          ← nonisolated + Sendable
                        │            │
                        └─────┬──────┘
                              ▼
                       FoundationUtils                ← cero deps de terceros
```

Reglas:

- **`FoundationUtils`** no conoce a nadie. **`Domain`** no importa SwiftUI/UIKit (frontera de portabilidad, [ADR-0013](0013-core-swift-puro-frontera-portabilidad.md)). Los **Feature kits** componen las capas inferiores. **`AppTarget`/`AppFeature`** es la **única** raíz de composición que cablea la DI.
- Cuando dos features deben comunicarse, se define un **módulo de interfaz** (`FeatureInterfaces`, solo protocolos) y se **invierte** la dependencia. Jamás implementación → implementación.
- **Aislamiento por capa** declarado en cada target ([ADR-0002](0002-modo-lenguaje-swift6-approachable-concurrency.md)): `DesignSystem`/`AppFeature` con `defaultIsolation(MainActor.self)`; `Domain`/`Networking`/`Persistence`/`FoundationUtils` `nonisolated`+`Sendable`.
- Los DTO de `Networking` **nunca** cruzan a presentación: se mapea `DTO → DomainModel` en la capa de datos.

## Consecuencias

**Positivas**
- Builds incrementales, previews de SwiftUI más rápidas y estables, trabajo en paralelo por feature.
- Features removibles: borrar una feature no rompe el resto; el grafo lo garantiza.
- SPM aplica los límites gratis (sin herramienta extra): un import ilegal no compila.
- La inversión por interfaces evita ciclos y desacopla features entre sí.

**Negativas / Trade-offs**
- Overhead inicial de definir packages e interfaces antes de escribir features. Mitigación: el esqueleto de Fase 1 ya paga ese costo una vez.
- Hay que mantener el grafo sin ciclos a mano (SPM avisa, pero el diseño es responsabilidad del dev). Mitigación: regla de "dependencias solo hacia abajo" en revisión.
- Un módulo de interfaz por cada par de features que colabora añade indirección. Mitigación: solo se crea cuando dos features realmente deben hablar, no preventivamente.

## Alternativas consideradas

1. **Un solo target monolítico**: descartado. Sin límites de módulo la arquitectura colapsa: builds lentos, previews inestables, lógica que se filtra entre capas sin barrera.
2. **Modularización por capa/tipo (`Views/`, `Services/`)**: descartado explícitamente. Escala mal; cada feature toca todos los módulos y nada es removible.
3. **Features que se importan entre sí directamente (sin módulo de interfaz)**: descartado. Acopla implementación con implementación y produce ciclos; la inversión por protocolos es el punto de la decisión.
4. **Tuist/Bazel para gestionar el grafo desde el día 1**: descartado ahora. SPM basta a esta escala; ver [ADR-0010](0010-build-system-swiftpm-tuist-bazel.md) para los umbrales de escalado.

## Referencias

- Informe fundacional §4.6 (grafo de módulos, con diagrama), §4.1 (capas), §4.9: `../../../research/ios-swift-engineering/informe-fundacion.md`
- `Package.swift` del monorepo (esqueleto Fase 1 que materializa el grafo)
- [ADR-0002 — Modo Swift 6 + aislamiento por capa](0002-modo-lenguaje-swift6-approachable-concurrency.md)
- [ADR-0008 — Monorepo, un Package.swift, distribución por fuente](0008-monorepo-package-swift-distribucion-fuente-semver.md)
- [ADR-0013 — Core Swift puro como frontera de portabilidad](0013-core-swift-puro-frontera-portabilidad.md)
