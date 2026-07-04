import Foundation
import Domain

// Capa de datos: nonisolated + Sendable. Transforma DTO → modelo de dominio.
// El DTO nunca cruza hacia presentación.

struct UserDTO: Decodable, Sendable {
    let id: String
    let fullName: String

    func toDomain() -> User { User(id: id, name: fullName) }
}

/// Implementación stub del repositorio (Fase 1). El cliente HTTP real llega en Fase 3.
/// `Sendable` por conformar a `UserRepository: Sendable`; sin estado mutable.
public struct StubUserRepository: UserRepository {
    public init() {}

    public func fetchUser(id: String) async throws -> User {
        UserDTO(id: id, fullName: "Stub User").toDomain()
    }
}
