import SwiftUI

// Inyección del tema por Environment (ADR-0012): los colores semánticos bajan por
// el árbol de vistas, no se importan sueltos.

private struct SemanticColorsKey: EnvironmentKey {
    nonisolated static let defaultValue = SemanticColors()
}

public extension EnvironmentValues {
    var semanticColors: SemanticColors {
        get { self[SemanticColorsKey.self] }
        set { self[SemanticColorsKey.self] = newValue }
    }
}

public extension View {
    func semanticColors(_ colors: SemanticColors) -> some View {
        environment(\.semanticColors, colors)
    }
}
