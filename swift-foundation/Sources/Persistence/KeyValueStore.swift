import Foundation

// Capa de datos: nonisolated + Sendable. Protocolo unificado de almacenamiento
// clave-valor (Keychain/UserDefaults/File se implementan detrás de este contrato).

public protocol KeyValueStore: Sendable {
    func string(forKey key: String) -> String?
    func set(_ value: String?, forKey key: String)
}

/// Store en memoria para tests/previews.
/// `@unchecked Sendable` JUSTIFICADO: el acceso al diccionario mutable está
/// serializado por `NSLock` (ADR-0019: cero `@unchecked Sendable` sin justificar).
public final class InMemoryKeyValueStore: KeyValueStore, @unchecked Sendable {
    private var storage: [String: String] = [:]
    private let lock = NSLock()

    public init() {}

    public func string(forKey key: String) -> String? {
        lock.withLock { storage[key] }
    }

    public func set(_ value: String?, forKey key: String) {
        lock.withLock { storage[key] = value }
    }
}
