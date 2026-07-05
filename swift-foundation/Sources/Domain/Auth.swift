import Foundation

// Feature Auth — capa de dominio (Swift puro, frontera de portabilidad).
// Define entidades, errores tipados y protocolos; la infraestructura los implementa.

/// Sesión autenticada. `Sendable` para cruzar fronteras de aislamiento.
public struct AuthSession: Sendable, Equatable {
    public let userID: String
    public let token: String

    public init(userID: String, token: String) {
        self.userID = userID
        self.token = token
    }
}

/// Errores de autenticación (typed throws — ADR-0002 de dominio).
public enum AuthError: Error, Equatable, Sendable {
    case biometricUnavailable
    case biometricFailed
    case network

    /// Mensaje presentable al usuario (neutro).
    public var message: String {
        switch self {
        case .biometricUnavailable: "La biometría no está disponible en este dispositivo."
        case .biometricFailed: "No pudimos verificar tu identidad."
        case .network: "Hubo un problema de conexión. Intenta de nuevo."
        }
    }
}

/// Verificación biométrica (Face ID / Touch ID). La implementa `BiometricAuth`.
public protocol BiometricAuthenticating: Sendable {
    func authenticate(reason: String) async throws -> Bool
}

/// Fuente de la sesión. La implementa la capa de datos (`Networking`).
public protocol AuthRepository: Sendable {
    func currentSession() async throws -> AuthSession
}

/// Caso de uso: verifica biometría y, si pasa, obtiene la sesión.
/// Se prueba aislado inyectando stubs.
public struct SignInWithBiometricsUseCase: Sendable {
    private let authenticator: BiometricAuthenticating
    private let repository: AuthRepository

    public init(authenticator: BiometricAuthenticating, repository: AuthRepository) {
        self.authenticator = authenticator
        self.repository = repository
    }

    public func callAsFunction() async throws -> AuthSession {
        let verified = try await authenticator.authenticate(reason: "Inicia sesión")
        guard verified else { throw AuthError.biometricFailed }
        return try await self.repository.currentSession()
    }
}
