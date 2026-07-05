import SwiftUI
import DesignSystem

// Vista de autenticación. Usa los tokens semánticos del design system (sin hex crudos).
public struct AuthView: View {
    @State private var model: AuthModel

    public init(model: AuthModel) {
        _model = State(initialValue: model)
    }

    public var body: some View {
        VStack(spacing: DesignTokens.spacing(2)) {
            switch model.state {
            case .idle, .failed:
                Button("Iniciar sesión con Face ID") {
                    Task { await model.authenticate() }
                }
            case .authenticating:
                ProgressView()
            case .authenticated:
                Text("Sesión iniciada")
            }

            if case let .failed(message) = model.state {
                Text(message).foregroundStyle(.red)
            }
        }
        .padding(DesignTokens.spacing(2))
    }
}
