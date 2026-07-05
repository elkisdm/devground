---
"@devground/swift-ci": minor
"devground-init": minor
---

Fase 5 de la iniciativa iOS/Swift: añade `@devground/swift-ci` (plantillas GitHub Actions + Fastlane Match) y detección de stack Swift en `devground-init` — `detectStack` ahora marca `hasSwift` cuando encuentra `Package.swift`/`.xcodeproj`/`.xcworkspace` y tolera repos Swift sin `package.json` sin fallar (ADR-0021).
