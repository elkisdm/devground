import Testing
@testable import Domain

// Prueba de humo del harness: el caso de uso de dominio se testea AISLADO,
// sin UI ni red real, inyectando un repositorio stub (ADR-0009 de dominio).

private struct StubRepo: UserRepository {
    func fetchUser(id: String) async throws -> User {
        User(id: id, name: "Ada")
    }
}

@Test func `fetch user use case returns user from repository`() async throws {
    let useCase = FetchUserUseCase(repository: StubRepo())
    let user = try await useCase(id: "42")
    #expect(user.id == "42")
    #expect(user.name == "Ada")
}
