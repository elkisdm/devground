import SwiftUI

// Tokens semánticos como fuente única de verdad (ADR-0012). Nada de hex crudos.

public enum DesignTokens {
    /// Escala de espaciado base (4/8pt).
    public static let spacingUnit: CGFloat = 8
    public static func spacing(_ multiplier: CGFloat) -> CGFloat { spacingUnit * multiplier }
}

/// Colores por rol, resueltos light/dark en una sola definición. `Sendable` y
/// `nonisolated`: cruza fronteras de aislamiento (default de un EnvironmentKey nonisolated).
public struct SemanticColors: Sendable {
    public var textPrimary: Color
    public var textSecondary: Color
    public var accent: Color

    public nonisolated init(
        textPrimary: Color = .primary,
        textSecondary: Color = .secondary,
        accent: Color = .accentColor
    ) {
        self.textPrimary = textPrimary
        self.textSecondary = textSecondary
        self.accent = accent
    }
}
