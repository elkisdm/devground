import SwiftUI

// Capa de diseño: MainActor por defecto (ver Package.swift).
// Tokens semánticos como fuente única de verdad (ADR-0012 de dominio):
// nada de hex crudos dispersos; los colores se nombran por rol.

public enum DesignTokens {
    /// Escala de espaciado base (4/8pt).
    public static let spacingUnit: CGFloat = 8
    public static func spacing(_ multiplier: CGFloat) -> CGFloat { spacingUnit * multiplier }
}

/// Colores por rol, resueltos light/dark en una sola definición. `Sendable`.
public struct SemanticColors: Sendable {
    public var textPrimary: Color
    public var textSecondary: Color
    public var accent: Color

    public init(
        textPrimary: Color = .primary,
        textSecondary: Color = .secondary,
        accent: Color = .accentColor
    ) {
        self.textPrimary = textPrimary
        self.textSecondary = textSecondary
        self.accent = accent
    }
}
