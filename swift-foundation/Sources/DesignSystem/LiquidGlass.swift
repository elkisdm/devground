import SwiftUI

// Liquid Glass (iOS/macOS 26) aplicado SOLO a superficies de navegación
// (nunca a contenido ni glass-on-glass — ADR-0012 de dominio).
// Degrada con gracia en OS anteriores vía #available (ADR-0001 de dominio).

public extension View {
    /// Aplica Liquid Glass a una superficie de navegación. En OS < 26 cae a un
    /// material del sistema, preservando profundidad legible.
    @ViewBuilder
    func navigationGlass(in shape: some Shape = Capsule()) -> some View {
        if #available(iOS 26.0, macOS 26.0, *) {
            glassEffect(.regular, in: shape)
        } else {
            background(.ultraThinMaterial, in: shape)
        }
    }
}
