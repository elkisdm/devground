import Observation
import Domain

// Feature Auth — capa de presentación. MainActor por defecto (ver Package.swift).
// Estado con @Observable (tracking por propiedad, ADR-0003 de dominio); flujo
// unidireccional: la vista dispara acciones, el modelo publica estado.

@Observable
public final class AuthModel {
    public enum State: Equatable, Sendable {
        case idle
        case authenticating
        case authenticated(AuthSession)
        case failed(String)
    }

    public private(set) var state: State = .idle

    private let signIn: SignInWithBiometricsUseCase

    public init(signIn: SignInWithBiometricsUseCase) {
        self.signIn = signIn
    }

    public func authenticate() async {
        state = .authenticating
        do {
            let session = try await signIn()
            state = .authenticated(session)
        } catch let error as AuthError {
            state = .failed(error.message)
        } catch {
            state = .failed("Error inesperado.")
        }
    }
}
