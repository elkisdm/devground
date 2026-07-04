import Domain

// Módulo de interfaz: SOLO protocolos para comunicar features entre sí
// (inversión de dependencias — nunca implementación contra implementación).
// nonisolated por defecto.

public protocol AuthFeatureInterface: Sendable {
    func currentUser() async -> User?
}
