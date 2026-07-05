import Testing
import Domain
@testable import FeatureAuth

// El modelo de presentación transiciona de estado correctamente según el resultado
// del caso de uso, sin UI ni biometría real (stubs inyectados).

private struct StubAuthenticator: BiometricAuthenticating {
    let result: Bool
    func authenticate(reason: String) async throws -> Bool { result }
}

private struct StubRepo: AuthRepository {
    func currentSession() async throws -> AuthSession {
        AuthSession(userID: "u_1", token: "t")
    }
}

@MainActor
@Test func modelReachesAuthenticatedOnSuccess() async {
    let model = AuthModel(
        signIn: SignInWithBiometricsUseCase(
            authenticator: StubAuthenticator(result: true),
            repository: StubRepo()
        )
    )
    await model.authenticate()
    #expect(model.state == .authenticated(AuthSession(userID: "u_1", token: "t")))
}

@MainActor
@Test func modelReachesFailedOnBiometricRejection() async {
    let model = AuthModel(
        signIn: SignInWithBiometricsUseCase(
            authenticator: StubAuthenticator(result: false),
            repository: StubRepo()
        )
    )
    await model.authenticate()
    if case .failed = model.state {
        // ok
    } else {
        Issue.record("Se esperaba estado .failed, se obtuvo \(model.state)")
    }
}
