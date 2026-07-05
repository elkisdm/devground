# ADR-0009: Swift Testing como default; XCTest solo para XCUITest y measure{}

- **Estado**: Propuesto
- **Fecha**: 2026-07-04
- **Decisor**: edaza
- **Aplica a**: Todos los test targets del monorepo `swift-foundation`. El harness completo (dependencias inyectadas, snapshots) llega en Fase 2; el esqueleto ya trae `DomainTests` con Swift Testing.

## Contexto

En 2026 hay dos frameworks de test en el ecosistema Apple:

- **Swift Testing** (`@Test`/`#expect`, macro-based): el default para tests nuevos. Corre en paralelo **in-process**.
- **XCTest**: framework histórico. Aísla cada test en procesos separados. Sigue siendo el único camino para **XCUITest** (UI end-to-end) y para benchmarks con **`measure {}`**.

Ambos coexisten en el mismo target. La diferencia operativa clave: Swift Testing corre en paralelo **in-process**, lo que exige **higiene de estado global** (el estado compartido se filtra entre tests); se puede serializar con el trait `.serialized` en un `@Suite` cuando haga falta.

Matices verificados que condicionan el diseño:

- **Exit Tests NO compila para iOS** (solo macOS/Linux/Windows), aunque Swift 6.2 los sumó junto con Attachments. No sirven para validar crashes en la app iOS.
- **`swift-snapshot-testing` 1.17+** ya soporta Swift Testing, pero `isRecording`/`diffTool` globales quedaron **deprecados** por el paralelismo in-process; se usa `withSnapshotTesting(...)` con scope.

El objetivo del harness (informe §2.3) son tres principios: **reproducibilidad** (cero no-determinismo), **velocidad** (paralelismo) y **señal confiable** (un test flaky se cuarentena o arregla en el mismo PR, nunca se re-corre "a ver si pasa"). La reproducibilidad se apoya en la DI de [ADR-0006](0006-swift-dependencies-di-testabilidad.md).

## Decisión

**Swift Testing (`@Test`/`#expect`) como default** para unit/integration/async. **XCTest confinado a XCUITest y `measure {}`.**

- Tests nuevos de lógica → Swift Testing. Archivos separados de los XCTest; ambos frameworks coexisten en el target.
- **XCTest solo** para XCUITest (UI end-to-end) y performance con `measure {}`. No se escriben unit tests nuevos en XCTest.
- **Reproducibilidad como cimiento**: inyectar tiempo/red/UUID con `swift-dependencies` + **`swift-clocks`** — `TestClock` para lógica temporal (debounce/retry/polling), `ImmediateClock` cuando el tiempo es irrelevante. Nunca `Date()`/`UUID()`/`URLSession` directo en lógica de negocio (regla compartida con ADR-0006).
- **Higiene de estado global**: como Swift Testing corre in-process en paralelo, cero estado global mutable compartido entre tests; usar `.serialized` en un `@Suite` solo cuando la serialización sea genuinamente necesaria.
- **Regresión visual**: `swift-snapshot-testing` 1.17+ con `withSnapshotTesting(...)` con scope (no los globales deprecados). Fijar tamaño y traits para que los snapshots no sean frágiles a cambios de OS/dispositivo.
- **Exit Tests**: no se usan para validar crashes en iOS (no compilan ahí).
- **Coverage** vía `xccov` como **señal, no meta**. **Muter** (mutation testing) solo sobre módulos core y **tras estabilizar la suite** (los flaky envenenan el score); opcional, Fase 6.
- **Migración de XCTest existente oportunista**, nunca masiva. (En greenfield casi no aplica: no hay XCTest legado.)

Orden de construcción del harness (informe §2.3): DI primero → Swift Testing + snapshot → firma sin dolor → caché + selective testing (cuando CI supere ~10 min) → mutation testing al final.

## Consecuencias

**Positivas**
- Sintaxis moderna (`@Test`/`#expect`), paralelismo in-process → suites más rápidas.
- Con la DI inyectada, los tests de tiempo (debounce/retry) son deterministas vía `TestClock`: cero flakiness.
- Un solo default claro para tests nuevos evita la ambigüedad "¿XCTest o Swift Testing?" en cada archivo.
- XCUITest y `measure {}` siguen disponibles donde Swift Testing no llega.

**Negativas / Trade-offs**
- El paralelismo in-process **filtra estado global** si no hay higiene: fuente de flakiness al escribir tests descuidados. Mitigación: regla de cero estado global mutable + `.serialized` puntual.
- Exit Tests no valida crashes en iOS: hay un hueco de cobertura para escenarios de aborto. Mitigación: se asume; no se depende de Exit Tests en la plataforma iOS.
- Snapshot tests frágiles a cambios de OS/dispositivo. Mitigación: fijar tamaño y traits; `withSnapshotTesting` con scope.
- Coexistencia de dos frameworks en el target añade algo de superficie mental. Mitigación: regla clara de cuándo usar cada uno (XCTest solo XCUITest + `measure`).

## Alternativas consideradas

1. **XCTest para todo (incluidos unit tests nuevos)**: descartado. Swift Testing es el default 2026, con mejor sintaxis y paralelismo; XCTest queda para lo que Swift Testing aún no cubre.
2. **Migrar todo el XCTest existente de golpe a Swift Testing**: no aplica (greenfield sin legado); en general se prefiere migración oportunista, no big-bang.
3. **Coverage como meta de release (p. ej. "80% obligatorio")**: descartado. `xccov` es señal, no meta; perseguir un número incentiva tests de baja calidad. Muter da mejor señal de calidad, pero solo tras estabilizar la suite.
4. **Exit Tests para validar crashes en iOS**: imposible; no compilan para iOS.

## Referencias

- Informe fundacional §2.3 (harness: testing, CI/CD, build) y sus principios rectores, §3 (tabla de stack): `../../../research/ios-swift-engineering/informe-fundacion.md`
- Decisiones del usuario (Swift Testing + swift-dependencies + swift-clocks + snapshot): `../../../research/ios-swift-engineering/DECISIONS.md`
- `Tests/DomainTests/` del esqueleto (prueba de humo con Swift Testing)
- [ADR-0006 — swift-dependencies + swift-clocks (reproducibilidad)](0006-swift-dependencies-di-testabilidad.md)
- Swift Testing (`@Test`/`#expect`, `.serialized`), `swift-snapshot-testing` 1.17+ (`withSnapshotTesting`), `xccov`, Muter
