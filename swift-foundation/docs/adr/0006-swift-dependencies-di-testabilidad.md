# ADR-0006: Adoptar swift-dependencies como columna de DI y testabilidad

- **Estado**: Propuesto
- **Fecha**: 2026-07-04
- **Decisor**: edaza
- **Aplica a**: Todo efecto secundario e inyección de dependencias de la app (capas de datos, servicios y presentación). El registro de valores `live`/`preview`/`test` vive en la raíz de composición `AppFeature`.

## Contexto

La reproducibilidad de los tests exige que ningún efecto secundario no-determinista (tiempo, red, UUID, almacenamiento) se invoque directamente en la lógica de negocio. Llamar `Date()`, `UUID()` o `URLSession` en un `UseCase` hace el código imposible de testear de forma determinista.

La solución es inyectar esos efectos detrás de protocolos, con implementaciones intercambiables por contexto. Las opciones idiomáticas en 2026:

- **`swift-dependencies`** (Point-Free, v1.14.x): estilo Environment de SwiftUI sobre task-local, con valores `live`/`preview`/`test` por dependencia. Idiomático y **desacoplado de TCA** (no obliga a adoptar TCA).
- **Factory**: container compile-time safe con registro explícito. Válido para equipos que prefieren registro explícito.
- **DI manual por inicializador**: suficiente en apps pequeñas.

`swift-dependencies` encaja con `@Observable`/`@Environment` ([ADR-0003](0003-observable-sobre-observableobject-combine.md)) y con MV/vanilla SwiftUI ([ADR-0004](0004-mv-swiftui-por-defecto-mvvm-tca.md)) sin arrastrar TCA, y es la pieza sobre la que se apoya el harness de testing ([ADR-0009](0009-swift-testing-default-xctest-acotado.md)) junto con `swift-clocks`.

## Decisión

**Adoptar `swift-dependencies` como columna vertebral de DI y testabilidad**, inyectando siempre **detrás de protocolos**.

- Cada efecto secundario (cliente de red, store de persistencia, reloj, generador de UUID) se expone como una dependencia con tres valores: **`live`** (producción), **`preview`** (para Xcode Previews), **`test`** (fixtures deterministas).
- **Regla dura**: nunca llamar `Date()`, `UUID()` ni `URLSession` directamente en lógica de negocio. Se pasan como dependencias para poder sustituirlas por `TestClock`/`ImmediateClock` (`swift-clocks`) y fixtures en los tests.
- El **cableado de la DI** ocurre en un solo lugar: la raíz de composición `AppFeature` (ver [ADR-0005](0005-modularizacion-por-feature-spm-interfaces.md)). Las capas base declaran protocolos; las implementaciones concretas se registran arriba.
- **Terceros aislados** detrás de protocolos propios + `swift-dependencies`, para poder cambiarlos sin romper consumidores (ADR-0008 lo aplica a la librería).
- Override en tests: sustituir el valor de una dependencia es trivial (`withDependencies { ... }`), lo que hace cada `UseCase` testeable aislado sin UI ni red real.

Nota de fase: en Fase 1 el esqueleto usa un `StubUserRepository` como placeholder; `swift-dependencies` + `swift-clocks` se integran completos en Fase 2 (harness) según el roadmap del informe §6.

## Consecuencias

**Positivas**
- Overrides triviales en tests y previews: cada dependencia se sustituye por su versión `test`/`preview` sin tocar la lógica.
- Idiomático (estilo Environment de SwiftUI) y **desacoplado de TCA**: adoptamos la pieza sin comprometernos con todo el ecosistema Point-Free.
- Habilita la disciplina de reproducibilidad del harness (cero no-determinismo) que separa un harness de primer nivel de uno promedio.
- Encaja con la inyección por `@Environment` que ya usa `@Observable`.

**Negativas / Trade-offs**
- Dependencia de un package externo (Point-Free). Mitigación: es la apuesta más estable y desacoplada del ecosistema; se aísla su superficie tras nuestros protocolos.
- Requiere disciplina de inyectar tras protocolos incluso cuando llamar directo sería más corto. Mitigación: es la regla explícita de revisión; el beneficio (tests deterministas) lo justifica.
- Registrar `live`/`preview`/`test` por cada dependencia añade boilerplate. Mitigación: las macros de `swift-dependencies` reducen ese costo; solo se paga por efecto secundario real.

## Alternativas consideradas

1. **DI manual por inicializador**: válido en apps muy pequeñas, descartado como estándar. No escala a overrides de previews/tests con la ergonomía de task-local; obliga a pasar dependencias por toda la jerarquía de inicializadores.
2. **Factory (container compile-time safe)**: alternativa razonable con registro explícito. Descartada por preferencia hacia el estilo Environment task-local, que integra mejor con SwiftUI y con `swift-clocks`.
3. **Adoptar TCA completo para obtener su DI**: descartado. `swift-dependencies` da la DI sin el costo de ceremonia de TCA ([ADR-0004](0004-mv-swiftui-por-defecto-mvvm-tca.md)); TCA se reserva para estado complejo puntual.
4. **Llamar efectos directamente y mockear con protocolos ad-hoc**: descartado. Reintroduce no-determinismo y multiplica los mecanismos de sustitución; la task-local unificada es más limpia.

## Referencias

- Informe fundacional §4.5 (inyección de dependencias), §2.3 (reproducibilidad como cimiento), §3 (tabla de stack): `../../../research/ios-swift-engineering/informe-fundacion.md`
- [ADR-0003 — @Observable + @Environment](0003-observable-sobre-observableobject-combine.md)
- [ADR-0009 — Swift Testing + reproducibilidad](0009-swift-testing-default-xctest-acotado.md)
- [ADR-0005 — Raíz de composición única (AppFeature)](0005-modularizacion-por-feature-spm-interfaces.md)
- `swift-dependencies` 1.14.x, `swift-clocks` (`TestClock`/`ImmediateClock`) — Point-Free
