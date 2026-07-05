import SwiftUI

// Liquid Glass (iOS/macOS 26) SOLO en superficies de navegación — nunca en contenido
// ni glass-on-glass (ADR-0012). Degrada con gracia vía #available (ADR-0001).

public extension View {
    @ViewBuilder
    func navigationGlass<S: Shape>(in shape: S = Capsule()) -> some View {
        if #available(iOS 26.0, macOS 26.0, *) {
            glassEffect(.regular, in: shape)
        } else {
            background(.ultraThinMaterial, in: shape)
        }
    }
}
