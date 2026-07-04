# ADR-0020: Swift Testing + swift-dependencies como harness estándar

- **Estado**: Propuesto
- **Fecha**: 2026-07-04
- **Decisor**: edaza
- **Aplica a**: `@devground/swift-test-harness` y todo repo Swift scaffoldeado por devground

## Contexto

En 2026, **Swift Testing** (`@Test`/`#expect`, macro-based, corre en paralelo in-process) es el framework por defecto para tests nuevos; XCTest queda confinado a UI testing (XCUITest) y performance (`measure {}`). Pero un framework de tests no basta para un harness de primer nivel: la diferencia entre una suite confiable y una flaky es la **reproducibilidad** — eliminar el no-determinismo de tiempo, red y UUID.

La investigación ([informe §2.3](../../research/ios-swift-engineering/informe-fundacion.md)) fijó el conjunto verificado: `swift-dependencies` (DI task-local con valores `live`/`preview`/`test`), `swift-clocks` (`TestClock` para lógica temporal, `ImmediateClock` cuando el tiempo es irrelevante) y `swift-snapshot-testing` (regresión visual, 1.17+ con soporte Swift Testing). Sin esto, cada repo Swift reinventa (mal) la inyección de tiempo/red y hereda flakiness.

## Decisión

**`@devground/swift-test-harness` estandariza el harness de testing reproducible:**

- **Swift Testing** (`@Test`/`#expect`) como default para unit/integration/async. XCTest **solo** para XCUITest y `measure {}`.
- **`swift-dependencies` + `swift-clocks`** para inyectar tiempo/red/UUID. Regla dura: **nunca** llamar `Date()`, `UUID()` ni `URLSession` directamente en lógica de negocio; se inyectan para poder sustituirlos por `TestClock`/`ImmediateClock` y fixtures.
- **`swift-snapshot-testing`** (`withSnapshotTesting(...)` con scope; `isRecording`/`diffTool` globales están deprecados por el paralelismo in-process) para regresión visual.
- **Coverage vía `xccov`** como señal, no como meta.

## Consecuencias

**Positivas**
- Reproducibilidad total: cero no-determinismo, tests que no dependen del reloj de pared.
- Un solo harness consistente entre repos Swift; la disciplina de DI viene por defecto.
- Alinea testabilidad con arquitectura: inyectar tras protocolos ([ADR-0019](0019-isolation-por-capa-swift.md) y el core portable) es lo mismo que hace los tests deterministas.

**Negativas / Trade-offs**
- El paralelismo in-process de Swift Testing filtra estado global; exige higiene (o el trait `.serialized`). Mitigación: documentado en la plantilla.
- Dependencia de packages del ecosistema Point-Free (`swift-dependencies`, `swift-clocks`), que está en evolución. Mitigación: `swift-dependencies` es la pieza más estable y desacoplada de TCA; se adopta sola, sin TCA.
- Snapshot tests frágiles a cambios de OS/dispositivo. Mitigación: fijar tamaño y traits en la plantilla.

## Alternativas consideradas

1. **XCTest puro (descartada)**: es el camino legacy para tests nuevos; sin macros ni el modelo de paralelismo de Swift Testing.
2. **Sin inyección de tiempo/red (descartada)**: garantiza flakiness. El no-determinismo es la causa raíz #1 de suites poco confiables.
3. **DI casera por inicializador para todo (descartada como default)**: válida en apps pequeñas, pero `swift-dependencies` da overrides triviales en tests/previews sin boilerplate por cada dependencia.

## Referencias

- [`research/ios-swift-engineering/informe-fundacion.md`](../../research/ios-swift-engineering/informe-fundacion.md) §2.3, §4.5.
- [ADR-0018](0018-devground-poliglota-ts-swift.md), [ADR-0019](0019-isolation-por-capa-swift.md).
