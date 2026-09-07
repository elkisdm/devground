# @devground/swift-ci

## 0.1.1

### Patch Changes

- 8a1907e: Cierra el ciclo de 8 semanas del ADR-0026 con veredicto para los 11 experimentales (ADR-0032).

  **Graduan** `@devground/logger` (lo consumen cli, dev-metrics y dreaming), `@devground/ui-conventions` (el installer del CLI ya lo instala en proyectos React/Next) y `@devground/deepcheck` (interno, sigue sin publicarse). Los dos primeros llegan con los tests que la graduacion exige: 7 casos para los niveles y las secuencias ANSI del logger, y 6 para el guard de copiado de ui-conventions — cuyo invariante ("nunca sobreescribe tu edicion local") no estaba cubierto y es la promesa central del paquete. Para poder testearlo, ese guard se extrajo de `setup.js` a `lib/copy-guarded.js`: el script corre su trabajo al importarse, asi que nada definido ahi era testeable.

  **Se congelan** chile-formats, dreaming, design-taste, model-orchestrator y los 4 `swift-*`: sin consumidores verificados. Congelar no borra ni despublica — el README de cada uno lo declara, `package.json` lo marca con `devground.status: "frozen"`, y basta con que un proyecto lo consuma para reactivarlo con un ADR nuevo.

  La superficie con mantenimiento activo baja de 23 a 15 paquetes.

## 0.1.0

### Minor Changes

- 01762b2: Fase 5 de la iniciativa iOS/Swift: añade `@devground/swift-ci` (plantillas GitHub Actions + Fastlane Match) y detección de stack Swift en `devground-init` — `detectStack` ahora marca `hasSwift` cuando encuentra `Package.swift`/`.xcodeproj`/`.xcworkspace` y tolera repos Swift sin `package.json` sin fallar (ADR-0021).
