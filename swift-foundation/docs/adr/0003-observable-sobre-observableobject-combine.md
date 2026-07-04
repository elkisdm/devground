# ADR-0003: Usar @Observable en lugar de ObservableObject/Combine para todo modelo nuevo

- **Estado**: Propuesto
- **Fecha**: 2026-07-04
- **Decisor**: edaza
- **Aplica a**: Todos los modelos de estado y servicios de la app (capa de presentación y modelos observables inyectados). El core `Domain` no observa: son value types puros.

## Contexto

SwiftUI ofrece dos sistemas de estado para reference types:

- La familia **`ObservableObject` / `@Published` / `@StateObject` / Combine**, disponible desde iOS 13. Invalida la vista completa ante cualquier cambio publicado, aunque la vista no lea la propiedad que cambió.
- **Observation (`@Observable`)**, desde iOS 17 (macro que genera el tracking). Hace seguimiento **a nivel de propiedad**: SwiftUI re-renderiza solo las vistas que leen la propiedad concreta que cambió.

El deployment target es iOS 17 ([ADR-0001](0001-deployment-target-ios17-base-sdk-ios26.md)), así que `@Observable` está disponible sin fallbacks. La app es greenfield: no hay código Combine que migrar. Elegir el sistema de estado ahora evita mezclar dos paradigmas en el mismo código.

Hay un antipatrón concreto a prohibir: guardar en `@State` una clase que NO está correctamente marcada `@Observable` recrea la instancia en cada update y filtra suscripciones/requests.

## Decisión

**Usar `@Observable` para todo modelo y servicio nuevo.** Abandonar `ObservableObject`/`@Published`/Combine para modelos nuevos.

Roles de los property wrappers (un puñado, no más):

- **`@State`** — fuente de verdad y ownership de un modelo. En Xcode 27/iOS 26 `@State` evalúa su valor inicial de forma perezosa, por lo que un `@Observable` almacenado en `@State` se inicializa una sola vez. La única regla que queda: **no** asignar el observable dentro del `init` de la vista.
- **`@Binding`** — acceso de escritura a una fuente de verdad de value types más arriba en la jerarquía.
- **`@Bindable`** — binding bidireccional sobre reference types `@Observable`.
- **`@Environment(Type.self)`** — dependencias y modelos compartidos a lo largo de la jerarquía.

**Flujo unidireccional como disciplina**, incluso sin TCA: el estado de alto nivel baja hacia las vistas; los cambios suben solo por bindings o mutando objetos observados.

**Anti-patrón prohibido**: `@State` con una clase sin `@Observable` correcto (recrea la instancia en cada update, filtra suscripciones).

Combine se permite solo de forma puntual y aislada donde una API del sistema aún lo exige (p. ej. algún publisher de framework), nunca como sistema de estado de la app.

## Consecuencias

**Positivas**
- Tracking por propiedad → mejor rendimiento por defecto (menos invalidaciones de vista) sin trabajo manual.
- Menos código y menos ceremonia que `ObservableObject`/`@Published`; el macro genera el boilerplate.
- Un solo paradigma de estado en todo el código; sin mezcla de Combine y Observation.
- Se integra directamente con la DI por `@Environment` ([ADR-0006](0006-swift-dependencies-di-testabilidad.md)) y con MV/vanilla SwiftUI ([ADR-0004](0004-mv-swiftui-por-defecto-mvvm-tca.md)).

**Negativas / Trade-offs**
- Requiere iOS 17+ (ya asumido en ADR-0001). No es un costo real aquí porque el mínimo ya es 17.
- El antipatrón de `@State` + clase mal marcada es sutil y compila; se atrapa en revisión, no en el compilador. Mitigación: regla explícita en la rúbrica de revisión.
- Combine sigue existiendo en APIs del sistema; hay que saber cuándo tolerarlo puntualmente sin dejarlo filtrar al modelo de estado.

## Alternativas consideradas

1. **`ObservableObject` + `@Published` + Combine**: descartado para modelos nuevos. Invalida vistas de más (peor rendimiento por defecto), más boilerplate, y en greenfield no hay razón de compatibilidad para arrastrarlo.
2. **TCA (`@ObservableState`) como sistema de estado por defecto**: descartado como default. TCA se reserva para módulos con máquinas de estado complejas ([ADR-0004](0004-mv-swiftui-por-defecto-mvvm-tca.md)); su `@ObservableState` de hecho se apoya en Observation. Adoptarlo app-wide es ceremonia innecesaria para 1-2 devs.
3. **Redux/otras librerías de estado externas**: descartado. `@Observable` cubre el caso con soporte nativo; añadir una dependencia de estado sería sobre-ingeniería.

## Referencias

- Informe fundacional §4.2 (gestión de estado y flujo de datos), §3 (tabla de stack), §4.9: `../../../research/ios-swift-engineering/informe-fundacion.md`
- [ADR-0001 — Deployment target iOS 17](0001-deployment-target-ios17-base-sdk-ios26.md) (habilita `@Observable` sin fallback)
- [ADR-0004 — MV/vanilla SwiftUI por defecto](0004-mv-swiftui-por-defecto-mvvm-tca.md)
- [ADR-0006 — swift-dependencies como DI](0006-swift-dependencies-di-testabilidad.md)
