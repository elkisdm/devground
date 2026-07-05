# @devground/swift-ci

## 0.1.0

### Minor Changes

- 01762b2: Fase 5 de la iniciativa iOS/Swift: añade `@devground/swift-ci` (plantillas GitHub Actions + Fastlane Match) y detección de stack Swift en `devground-init` — `detectStack` ahora marca `hasSwift` cuando encuentra `Package.swift`/`.xcodeproj`/`.xcworkspace` y tolera repos Swift sin `package.json` sin fallar (ADR-0021).
