// swift-tools-version: 6.2
import PackageDescription

// Plantilla @devground/swift-package-template — monorepo modular por capa.
//
// Decisión clave (ADR-0019 de devground): la ISOLATION se declara POR CAPA, no global.
//   - Capas de UI/composición (DesignSystem, AppFeature) → .defaultIsolation(MainActor.self)
//   - Capas base portables (FoundationUtils, Domain, Networking, Persistence,
//     FeatureInterfaces) → SIN default isolation: nonisolated + tipos Sendable.
// Aplicar MainActor-by-default a las capas base es un antipatrón (hops de actor,
// rompe Sendable, mata la portabilidad del core).
//
// Modo de lenguaje Swift 6 activado deliberadamente vía swiftLanguageModes.
// Dependencias solo hacia abajo, sin ciclos.
let package = Package(
    name: "SwiftFoundation", // ← renombra por el nombre de tu paquete raíz
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "FoundationUtils", targets: ["FoundationUtils"]),
        .library(name: "Domain", targets: ["Domain"]),
        .library(name: "Networking", targets: ["Networking"]),
        .library(name: "Persistence", targets: ["Persistence"]),
        .library(name: "DesignSystem", targets: ["DesignSystem"]),
        .library(name: "FeatureInterfaces", targets: ["FeatureInterfaces"]),
        .library(name: "AppFeature", targets: ["AppFeature"]),
    ],
    targets: [
        // --- Capas base: nonisolated + Sendable (core Swift puro, portable) ---
        .target(name: "FoundationUtils"),
        .target(name: "Domain", dependencies: ["FoundationUtils"]),
        .target(name: "Networking", dependencies: ["Domain", "FoundationUtils"]),
        .target(name: "Persistence", dependencies: ["Domain", "FoundationUtils"]),
        .target(name: "FeatureInterfaces", dependencies: ["Domain"]),

        // --- Capa de diseño: MainActor por defecto ---
        .target(
            name: "DesignSystem",
            dependencies: ["FoundationUtils"],
            swiftSettings: [.defaultIsolation(MainActor.self)]
        ),

        // --- Raíz de composición: MainActor por defecto, cablea la DI ---
        .target(
            name: "AppFeature",
            dependencies: ["Domain", "Networking", "Persistence", "DesignSystem", "FeatureInterfaces"],
            swiftSettings: [.defaultIsolation(MainActor.self)]
        ),

        // --- Tests: Swift Testing (ver @devground/swift-test-harness en Fase 2+) ---
        .testTarget(name: "DomainTests", dependencies: ["Domain"]),
    ],
    swiftLanguageModes: [.v6]
)
