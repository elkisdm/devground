import BiometricAuth
import DesignSystem
import Domain
import FeatureAuth
import FeatureInterfaces
import Networking
import Persistence

// Raíz de composición (única): cablea la DI conectando las capas.
// MainActor por defecto (ver Package.swift). Cruza con seguridad hacia las capas
// base nonisolated porque todo lo que atraviesa la frontera es `Sendable`.

public struct AppComposition {
    public init() {}

    /// Compone el caso de uso de dominio con la implementación de datos.
    public func makeFetchUserUseCase() -> FetchUserUseCase {
        FetchUserUseCase(repository: StubUserRepository())
    }

    public func makeStore() -> KeyValueStore {
        InMemoryKeyValueStore()
    }

    public func makeColors() -> SemanticColors {
        SemanticColors()
    }

    /// Vertical de autenticación: biometría real (LocalAuthentication) + repo de sesión.
    public func makeAuthModel() -> AuthModel {
        AuthModel(
            signIn: SignInWithBiometricsUseCase(
                authenticator: LABiometricAuthenticator(),
                repository: StubAuthRepository()
            )
        )
    }
}
