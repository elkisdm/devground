import Foundation

/// Cadena garantizada no vacía tras recortar espacios. Value type `Sendable`,
/// sin dependencias de terceros. Capa base: `nonisolated` por defecto.
public struct NonEmptyString: Sendable, Equatable, CustomStringConvertible {
    public let value: String

    public init?(_ raw: String) {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        self.value = trimmed
    }

    public var description: String { value }
}
