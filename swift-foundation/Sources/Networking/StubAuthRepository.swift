import Foundation
import Domain

// Capa de datos: nonisolated + Sendable. Implementación stub del repositorio de auth
// (Fase 3). El intercambio de token real contra el backend llega después.
public struct StubAuthRepository: AuthRepository {
    public init() {}

    public func currentSession() async throws -> AuthSession {
        AuthSession(userID: "u_1", token: "stub-token")
    }
}
