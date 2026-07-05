import SwiftUI

public extension EnvironmentValues {
    @Entry var semanticColors: SemanticColors = .init()
}

public extension View {
    /// Inyecta la paleta semántica en el subárbol.
    func semanticColors(_ colors: SemanticColors) -> some View {
        environment(\.semanticColors, colors)
    }
}
