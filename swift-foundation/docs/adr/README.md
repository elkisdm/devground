# ADRs de dominio — SwiftFoundation

Decisiones arquitectónicas de **dominio** de la app iOS / librería de librerías `swift-foundation`.

A diferencia de los [ADRs de devground](../../../docs/adr/README.md) — que documentan decisiones del monorepo de estándares (proceso, tooling, extensión políglota) — estos ADRs documentan las decisiones de **dominio iOS/Swift** de la app que se construye sobre esos estándares: lenguaje, concurrencia, UI, estado, testing, diseño y portabilidad.

Se derivan del informe fundacional (`../../../research/ios-swift-engineering/informe-fundacion.md`, §7) y de las decisiones del usuario (`../../../research/ios-swift-engineering/DECISIONS.md`). Todos están en estado `Propuesto`.

## Ajustes de realidad (contra el entorno verificado)

- **Toolchain local: Swift 6.2.3** (no 6.3.x). Se usa `swift-tools-version: 6.2` y "Swift 6.2+"; Approachable Concurrency y `defaultIsolation` son de Swift 6.2, así que las decisiones se sostienen.
- **Android fuera de scope** por ahora. El [ADR-0013](0013-core-swift-puro-frontera-portabilidad.md) mantiene la disciplina de core portable por **testabilidad** y para no cerrar la puerta, no como un port inminente.
- **Fase 1 = esqueleto SPM** (sin app target iOS todavía). Decisiones sobre el app shell (deployment target, Liquid Glass, navegación) se documentan aunque su UI llegue en Fase 3.

## Formato

Formato Michael Nygard: una decisión por ADR, inmutables. Encabezado (título en imperativo) + campos **Estado** / **Fecha** / **Decisor** / **Aplica a**, y secciones **Contexto**, **Decisión**, **Consecuencias** (Positivas / Negativas-Trade-offs), **Alternativas consideradas**, **Referencias**.

## Crear un ADR nuevo

Copia [0000-template.md](0000-template.md), renómbralo a `NNNN-titulo-en-kebab-case.md` con el siguiente número de la secuencia, rellénalo y añádelo al índice de abajo.

## Índice

- [ADR-0001 — Deployment target iOS 17 + Base SDK iOS 26](0001-deployment-target-ios17-base-sdk-ios26.md) (Propuesto)
- [ADR-0002 — Modo de lenguaje Swift 6 con Approachable Concurrency](0002-modo-lenguaje-swift6-approachable-concurrency.md) (Propuesto)
- [ADR-0003 — @Observable sobre ObservableObject/Combine](0003-observable-sobre-observableobject-combine.md) (Propuesto)
- [ADR-0004 — MV/vanilla SwiftUI por defecto; MVVM caso a caso; TCA solo para estado complejo](0004-mv-swiftui-por-defecto-mvvm-tca.md) (Propuesto)
- [ADR-0005 — Modularización por feature en SPM con módulos de interfaz](0005-modularizacion-por-feature-spm-interfaces.md) (Propuesto)
- [ADR-0006 — swift-dependencies como columna de DI y testabilidad](0006-swift-dependencies-di-testabilidad.md) (Propuesto)
- [ADR-0007 — Navegación por valores con enum tipado + AppRouter inyectado](0007-navegacion-por-valores-enum-approuter.md) (Propuesto)
- [ADR-0008 — Monorepo con un Package.swift, distribución por fuente, SemVer estricto](0008-monorepo-package-swift-distribucion-fuente-semver.md) (Propuesto)
- [ADR-0009 — Swift Testing como default; XCTest solo para XCUITest y measure{}](0009-swift-testing-default-xctest-acotado.md) (Propuesto)
- [ADR-0010 — Build system: SwiftPM ahora, Tuist al escalar, Bazel solo escala extrema](0010-build-system-swiftpm-tuist-bazel.md) (Propuesto)
- [ADR-0011 — CI/CD: Xcode Cloud vs GitHub Actions + Fastlane Match](0011-cicd-xcode-cloud-vs-github-actions-fastlane.md) (Propuesto · decisión abierta con recomendación)
- [ADR-0012 — Tokens semánticos como fuente única de verdad + Liquid Glass](0012-tokens-semanticos-liquid-glass.md) (Propuesto)
- [ADR-0013 — Core Swift puro como frontera de portabilidad](0013-core-swift-puro-frontera-portabilidad.md) (Propuesto)

## Cómo se relacionan

- **Lenguaje y concurrencia**: 0002 (modo Swift 6 + aislamiento por capa) es la base; 0001 fija el mínimo iOS 17 que habilita 0003 (@Observable).
- **Presentación**: 0003 (estado) + 0004 (patrón MV) + 0007 (navegación tipada) forman la capa de UI, cableada por 0006 (DI).
- **Estructura**: 0005 (modularización por feature) + 0008 (monorepo/distribución) definen el grafo; 0013 (core puro) marca qué capas son portables.
- **Harness y operación**: 0009 (testing) se apoya en 0006 (DI); 0010 (build) y 0011 (CI/CD) sostienen la entrega.
- **Diseño**: 0012 (tokens + Liquid Glass) consume el efecto de recompilar con SDK 26 de 0001.
