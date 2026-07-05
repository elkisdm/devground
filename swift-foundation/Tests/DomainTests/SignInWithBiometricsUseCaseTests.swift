import Testing
@testable import Domain

// Vertical Auth — lógica de dominio probada aislada, inyectando stubs.

private struct StubAuthenticator: BiometricAuthenticating {
    let result: Bool
    func authenticate(reason: String) async throws -> Bool { result }
}

private struct StubRepo: AuthRepository {
    func currentSession() async throws -> AuthSession {
        AuthSession(userID: "u_1", token: "t")
    }
}

@Test func signInReturnsSessionWhenBiometricSucceeds() async throws {
    let useCase = SignInWithBiometricsUseCase(
        authenticator: StubAuthenticator(result: true),
        repository: StubRepo()
    )
    let session = try await useCase()
    #expect(session.userID == "u_1")
}

@Test func signInThrowsWhenBiometricFails() async {
    let useCase = SignInWithBiometricsUseCase(
        authenticator: StubAuthenticator(result: false),
        repository: StubRepo()
    )
    await #expect(throws: AuthError.biometricFailed) {
        _ = try await useCase()
    }
}
