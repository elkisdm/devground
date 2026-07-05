import SwiftUI

// Inyección del tema por Environment (ADR-0012): los colores semánticos bajan por
// el árbol de vistas, no se importan sueltos. `@Entry` genera el EnvironmentKey.

public extension EnvironmentValues {
    @Entry var semanticColors: SemanticColors = .init()
}

public extension View {
    func semanticColors(_ colors: SemanticColors) -> some View {
        environment(\.semanticColors, colors)
    }
}
