import Domain

// Adaptador de infraestructura: nonisolated + Sendable (capa base).
// Envuelve LocalAuthentication tras el protocolo de dominio `BiometricAuthenticating`.
// Gated: LocalAuthentication existe en iOS/macOS; en plataformas sin ella se degrada.

#if canImport(LocalAuthentication)
    import LocalAuthentication

    public struct LABiometricAuthenticator: BiometricAuthenticating {
        public init() {}

        public func authenticate(reason: String) async throws -> Bool {
            let context = LAContext()
            var policyError: NSError?
            guard context.canEvaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                error: &policyError
            ) else {
                throw AuthError.biometricUnavailable
            }
            do {
                return try await context.evaluatePolicy(
                    .deviceOwnerAuthenticationWithBiometrics,
                    localizedReason: reason
                )
            } catch {
                throw AuthError.biometricFailed
            }
        }
    }
#else
    public struct LABiometricAuthenticator: BiometricAuthenticating {
        public init() {}
        public func authenticate(reason: String) async throws -> Bool {
            throw AuthError.biometricUnavailable
        }
    }
#endif
