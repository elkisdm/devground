// swift-tools-version: 6.2
import PackageDescription

// Monorepo fundacional ("librería de librerías") — Fase 1.
// Grafo de módulos por capa, dependencias solo hacia abajo, sin ciclos.
// Isolation por capa (ADR-0019 de devground): MainActor por defecto en las capas
// de UI/composición; nonisolated + Sendable en las capas base portables.
// Modo de lenguaje Swift 6 + Approachable Concurrency (toolchain local: 6.2.3).
let package = Package(
    name: "SwiftFoundation",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "FoundationUtils", targets: ["FoundationUtils"]),
        .library(name: "Domain", targets: ["Domain"]),
        .library(name: "Networking", targets: ["Networking"]),
        .library(name: "Persistence", targets: ["Persistence"]),
        .library(name: "DesignSystem", targets: ["DesignSystem"]),
        .library(name: "FeatureInterfaces", targets: ["FeatureInterfaces"]),
        .library(name: "BiometricAuth", targets: ["BiometricAuth"]),
        .library(name: "FeatureAuth", targets: ["FeatureAuth"]),
        .library(name: "AppFeature", targets: ["AppFeature"]),
    ],
    targets: [
        // --- Capas base: nonisolated + Sendable (core Swift puro, portable) ---
        .target(name: "FoundationUtils"),
        .target(name: "Domain", dependencies: ["FoundationUtils"]),
        .target(name: "Networking", dependencies: ["Domain", "FoundationUtils"]),
        .target(name: "Persistence", dependencies: ["Domain", "FoundationUtils"]),
        .target(name: "FeatureInterfaces", dependencies: ["Domain"]),
        // Adaptador de infraestructura (LocalAuthentication): nonisolated + Sendable.
        .target(name: "BiometricAuth", dependencies: ["Domain"]),

        // --- Capa de diseño: MainActor por defecto ---
        .target(
            name: "DesignSystem",
            dependencies: ["FoundationUtils"],
            swiftSettings: [.defaultIsolation(MainActor.self)]
        ),

        // --- Feature kit Auth: presentación MainActor por defecto ---
        .target(
            name: "FeatureAuth",
            dependencies: ["Domain", "DesignSystem"],
            swiftSettings: [.defaultIsolation(MainActor.self)]
        ),

        // --- Raíz de composición: MainActor por defecto, cablea la DI ---
        .target(
            name: "AppFeature",
            dependencies: [
                "Domain", "Networking", "Persistence", "DesignSystem",
                "FeatureInterfaces", "BiometricAuth", "FeatureAuth",
            ],
            swiftSettings: [.defaultIsolation(MainActor.self)]
        ),

        // --- Tests (Swift Testing): dominio y presentación testeables aislados ---
        .testTarget(name: "DomainTests", dependencies: ["Domain"]),
        .testTarget(name: "FeatureAuthTests", dependencies: ["FeatureAuth"]),
    ],
    swiftLanguageModes: [.v6]
)
