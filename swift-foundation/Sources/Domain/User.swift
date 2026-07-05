import Foundation

// Capa de dominio: Swift puro sobre Foundation, SIN UIKit/SwiftUI.
// Es la frontera de portabilidad (ADR-0013 de dominio) y el núcleo de testabilidad.

/// Entidad de dominio. `Sendable` para cruzar fronteras de aislamiento con seguridad.
public struct User: Sendable, Identifiable, Equatable {
    public let id: String
    public let name: String

    public init(id: String, name: String) {
        self.id = id
        self.name = name
    }
}

/// Protocolo de repositorio que el dominio DEFINE; la capa de datos lo implementa
/// (inversión de dependencias). `Sendable`: usable desde cualquier aislamiento.
public protocol UserRepository: Sendable {
    func fetchUser(id: String) async throws -> User
}

/// Caso de uso. Se prueba aislado, sin UI ni red real.
public struct FetchUserUseCase: Sendable {
    private let repository: UserRepository

    public init(repository: UserRepository) {
        self.repository = repository
    }

    public func callAsFunction(id: String) async throws -> User {
        try await self.repository.fetchUser(id: id)
    }
}
