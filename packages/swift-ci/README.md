# @devground/swift-ci

Plantillas de CI/CD para proyectos Swift/iOS: **GitHub Actions** (build + test en runner
macOS) y **Fastlane Match** (firma sin certificados sueltos). Materializa
[ADR-0011 de dominio](https://github.com/elkisdm/devground/blob/main/swift-foundation/docs/adr/0011-cicd-xcode-cloud-vs-github-actions-fastlane.md).

## Qué trae

| Origen | Destino | Rol |
| --- | --- | --- |
| `templates/ci.yml` | `.github/workflows/ci.yml` | `swift build` + `swift test` en cada push/PR |
| `templates/Fastfile` | `fastlane/Fastfile` | Lanes `certificates` y `beta` (TestFlight) |
| `templates/Matchfile` | `fastlane/Matchfile` | Config de Match (certificados cifrados en git) |

## Decisión: GitHub Actions + Match vs Xcode Cloud

Esta plantilla cubre la ruta **portable** (GitHub Actions + Fastlane Match). **Xcode Cloud**
es la alternativa de **menor fricción** (firma automática, TestFlight directo, SDK day-one)
pero se configura en la UI de App Store Connect, no como archivo de repo — por eso no viene
como plantilla. Elige según [ADR-0011](https://github.com/elkisdm/devground/blob/main/swift-foundation/docs/adr/0011-cicd-xcode-cloud-vs-github-actions-fastlane.md).

## Notas

- Los runners de GitHub **retrasan** versiones nuevas de Xcode; fija la versión disponible
  en la imagen del runner (`Xcode_26.app` es un ejemplo — verifica cuál existe).
- Las lanes de Fastlane requieren un app shell iOS con scheme; el `ci.yml` de `swift build`/
  `swift test` funciona ya sobre el paquete SPM.
- Nunca comitees `.p12` sueltos: Match los cifra en un repo git privado (`MATCH_GIT_URL`).

## Estado

Pre-estable (`0.0.0`) — sigue a los ADRs, aún en estado *Propuesto*.
