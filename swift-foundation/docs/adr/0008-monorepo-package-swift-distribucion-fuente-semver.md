# ADR-0008: Monorepo con un Package.swift, distribución por fuente y SemVer estricto

- **Estado**: Propuesto
- **Fecha**: 2026-07-04
- **Decisor**: edaza
- **Aplica a**: La estructura de distribución del monorepo `swift-foundation` (el `Package.swift` raíz, la forma de consumir las capas y el contrato de versionado).

## Contexto

El estándar de facto para una "librería de librerías" Swift en 2026 es un **monorepo con un solo `Package.swift`** que declara un product-library por capa (referencias a imitar: `swift-collections`/`swift-algorithms` de Apple, `swift-dependencies`/`swift-navigation` de Point-Free). El SwiftPM impone dos límites que hay que **aceptar desde el día 1**:

1. No puedes anidar paquetes versionados dentro de otro paquete.
2. Todos los products del paquete comparten el **mismo número de versión**.

Para código propietario existe la vía binaria (`binaryTarget`/XCFramework + Library Evolution), pero tiene costos: DocC sobre un `binaryTarget` genera un `.doccarchive` vacío, se pierde debugging de fuente, y `BUILD_LIBRARY_FOR_DISTRIBUTION` restringe la evolución de la API. Esos costos solo se pagan si distribuyes a terceros con código cerrado.

Esta es una librería base **interna**, greenfield, de 1-2 devs, que compila junto a la app. No hay terceros consumiendo binarios (`../../../research/ios-swift-engineering/DECISIONS.md`). El esqueleto de Fase 1 ya es exactamente esto: un `Package.swift` con siete products (`FoundationUtils`, `Domain`, `Networking`, `Persistence`, `DesignSystem`, `FeatureInterfaces`, `AppFeature`).

## Decisión

**Un monorepo, un `Package.swift`, un product-library por capa, distribución por fuente, SemVer estricto.**

- **Un solo `Package.swift`** en la raíz (ya presente), con un `.library` por capa. Se acepta desde el día 1: no se anidan paquetes versionados y todos los products comparten versión.
- **Distribución por fuente** por defecto: mejor DocC, mejor debugging, evolución más libre. Nada de `binaryTarget`/XCFramework mientras todo compile junto.
- **NO Library Evolution** (`BUILD_LIBRARY_FOR_DISTRIBUTION`): solo aplica al distribuir `.xcframework` a terceros; en packages compilados junto a la app añade costo y restringe la API sin beneficio (coherente con [ADR-0002](0002-modo-lenguaje-swift6-approachable-concurrency.md)).
- **SemVer estricto** como contrato: MAJOR **solo** para cambios source-breaking. Deprecación en **2 pasos**: MINOR con `@available(*, deprecated, message:)` apuntando al reemplazo → MAJOR que elimina. **API-diff en CI antes de taggear**.
- **Terceros aislados** detrás de protocolos propios + `swift-dependencies` ([ADR-0006](0006-swift-dependencies-di-testabilidad.md)), para cambiarlos sin romper consumidores.
- **DocC + `swift-docc-plugin`** con catálogos `.docc` (tutoriales, no solo referencia); opt-in al hospedaje versionado gratuito del Swift Package Index. Un target Example/Demo con Previews como documentación viva (Fase 7 del roadmap).
- **Deuda diferida explícita**: migrar a **git subtrees (patrón Apollo)** SOLO si algún día se necesita versionar capas de forma independiente. Hoy no se necesita; se documenta como camino conocido, no como trabajo pendiente.

## Consecuencias

**Positivas**
- Simplicidad máxima: un manifiesto, un grafo, un tag. Óptimo para 1-2 devs.
- Mejor DocC, debugging y evolución al distribuir por fuente.
- SemVer estricto + deprecación en 2 pasos + API-diff da un contrato de compatibilidad claro y verificable en CI.
- El aislamiento de terceros tras protocolos protege a los consumidores de cambios de dependencias externas.

**Negativas / Trade-offs**
- **Todos los products comparten versión**: bumpear una capa bumpea el número de todas. Mitigación: aceptado desde el día 1; el versionado independiente es la deuda diferida de subtrees, que solo se paga si aparece la necesidad real.
- El consumidor descarga todo el repo aunque use un solo product. Mitigación: irrelevante para una librería interna consumida por la propia app; sería un problema solo con distribución pública amplia.
- API-diff y deprecación en 2 pasos añaden disciplina de release. Mitigación: se automatiza en CI (Fase 7); el costo es un gate, no trabajo manual recurrente.

## Alternativas consideradas

1. **Múltiples paquetes versionados independientes (multi-repo o subtrees) desde el inicio**: descartado ahora. Es la solución al versionado independiente, pero introduce complejidad de coordinación que 1-2 devs no necesitan; queda como deuda diferida documentada.
2. **Distribución binaria (`binaryTarget`/XCFramework + Library Evolution)**: descartado. Solo aplica a código cerrado distribuido a terceros; rompe DocC (`.doccarchive` vacío), pierde debugging y restringe la API. Aquí todo compila junto.
3. **Swift Package Registry privado (Artifactory/JFrog)**: descartado por ahora. Es la respuesta para una librería interna de **empresa** con muchos consumidores; para una app de 1-2 devs es sobre-ingeniería. (Pregunta abierta §8.11 del informe: interno vs OSS público — hoy interno/mono.)

## Referencias

- Informe fundacional §2.5 y §4.7 (arquitectura de la librería de librerías), §4.9 (tabla de decisiones): `../../../research/ios-swift-engineering/informe-fundacion.md`
- Decisiones del usuario (monorepo, un Package.swift, fuente, SemVer estricto): `../../../research/ios-swift-engineering/DECISIONS.md`
- `Package.swift` del monorepo (esqueleto Fase 1)
- [ADR-0005 — Modularización por feature en SPM](0005-modularizacion-por-feature-spm-interfaces.md)
- [ADR-0006 — swift-dependencies (aislamiento de terceros)](0006-swift-dependencies-di-testabilidad.md)
