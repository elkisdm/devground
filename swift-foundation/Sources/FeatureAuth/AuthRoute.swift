// Navegación por valores (ADR-0007 de dominio): rutas modeladas como enum tipado,
// nunca strings. Un solo modelo compartido entre navegación in-app y deep links.
public enum AuthRoute: Hashable, Sendable {
    case signIn
    case home(userID: String)
}
