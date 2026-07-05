import DesignSystem
import Domain
import SwiftUI

/// Vista de autenticación. Tokens semánticos (colores por Environment, tipografía
/// Dynamic Type), sin hex crudos. El vidrio se reserva a la superficie de navegación.
public struct AuthView: View {
    @Environment(\.semanticColors) private var colors
    @State private var model: AuthModel

    public init(model: AuthModel) {
        _model = State(initialValue: model)
    }

    public var body: some View {
        VStack(spacing: DesignTokens.spacing(2)) {
            Text("Bienvenido")
                .font(Typography.title)
                .foregroundStyle(self.colors.textPrimary)

            switch self.model.state {
            case .idle, .failed:
                Button("Iniciar sesión con Face ID") {
                    Task { await self.model.authenticate() }
                }
                .padding(DesignTokens.spacing(2))
                .navigationGlass(in: .capsule)
            case .authenticating:
                ProgressView()
            case .authenticated:
                Text("Sesión iniciada").foregroundStyle(self.colors.textSecondary)
            }

            if case let .failed(message) = model.state {
                Text(message)
                    .font(Typography.footnote)
                    .foregroundStyle(.red)
            }
        }
        .padding(DesignTokens.spacing(2))
    }
}

#if DEBUG
    private struct PreviewAuthenticator: BiometricAuthenticating {
        func authenticate(reason: String) async throws -> Bool {
            true
        }
    }

    private struct PreviewRepo: AuthRepository {
        func currentSession() async throws -> AuthSession {
            AuthSession(userID: "u_1", token: "t")
        }
    }

    #Preview {
        AuthView(
            model: AuthModel(
                signIn: SignInWithBiometricsUseCase(
                    authenticator: PreviewAuthenticator(),
                    repository: PreviewRepo()
                )
            )
        )
        .semanticColors(SemanticColors())
    }
#endif
