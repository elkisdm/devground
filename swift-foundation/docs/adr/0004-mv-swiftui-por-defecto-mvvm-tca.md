# ADR-0004: MV/vanilla SwiftUI por defecto; MVVM caso a caso; TCA solo para estado complejo

- **Estado**: Propuesto
- **Fecha**: 2026-07-04
- **Decisor**: edaza
- **Aplica a**: La capa de presentación de cada feature (los `FeatureKits` y el app shell). No aplica a `Domain` (que no tiene patrón de UI).

## Contexto

Hay tres posturas legítimas para organizar la presentación en SwiftUI 2026, y elegir una por dogma es un error frecuente:

- **MV / vanilla SwiftUI**: las vistas son expresiones puras de estado; la lógica vive en modelos y servicios `@Observable` inyectados por `@Environment`. En vez de crear un `ViewModel` por reflejo, se parte la vista en subvistas. Menos ceremonia.
- **MVVM (opcionalmente con Coordinator, MVVM-C)**: un `ViewModel` por vista con lógica de presentación aislable. Sigue siendo defendible en apps con muchas pantallas y varios deep links.
- **TCA (`@Reducer` / `@ObservableState`)**: flujo unidireccional estricto con trazabilidad de cada mutación. Potente pero con alto costo de ceremonia.

El equipo es de **1-2 devs** en un greenfield (`../../../research/ios-swift-engineering/DECISIONS.md`). Imponer MVVM sistemático o TCA app-wide es ceremonia que no paga su costo a esa escala. Pero elegir "MV para todo, siempre" tampoco: hay features cuya complejidad genuina justifica más estructura.

El objetivo del patrón es el mismo que resuelve cualquier arquitectura de UI: **lógica fuera de las vistas**. MV lo logra con composición de subvistas + modelos `@Observable`; el riesgo es que sin la disciplina de partir en subvistas, la lógica se filtre a la vista.

Nota de vigencia sobre TCA: la macro pública **estable** actual es **`@Reducer` + `@ObservableState`**, no `@Feature` (los nombres de API de TCA 2.0 son roadmap anunciado, no API estable). El ecosistema Point-Free está en reescritura hacia TCA 2.0.

## Decisión

**Patrón por defecto: MV / vanilla SwiftUI.** Escalar por complejidad real, feature por feature, no app-wide:

1. **MV / vanilla SwiftUI (default)**: lógica en modelos/servicios `@Observable` ([ADR-0003](0003-observable-sobre-observableobject-combine.md)) inyectados por `@Environment` ([ADR-0006](0006-swift-dependencies-di-testabilidad.md)). La vista se descompone en subvistas; no se crea un `ViewModel` por reflejo.
2. **Subir a MVVM** solo cuando aparece **lógica de presentación real y aislable** en una feature concreta. Es una decisión local a esa feature, reversible, no una política global.
3. **TCA (`@Reducer` / `@ObservableState`)** solo para módulos con **máquinas de estado complejas** donde la trazabilidad de cada mutación es requisito de producto. Nunca app-wide, nunca con equipos sin base funcional previa. Hoy: no se adopta en ninguna feature; es una puerta que queda abierta.

Criterio de escalado (la señal es la complejidad, no el dogma): si la vista descompuesta en subvistas + modelo `@Observable` sigue mezclando lógica de presentación difícil de testear, sube a MVVM en esa feature. Si además la lógica es una máquina de estados con muchas transiciones que exige trazabilidad, evalúa TCA solo ahí.

## Consecuencias

**Positivas**
- Menos boilerplate y ceremonia: la composición de vistas resuelve el "Massive View Controller" sin una capa `ViewModel` obligatoria.
- La cantidad de estructura se ajusta a la complejidad de cada feature, no a una regla uniforme; óptimo para 1-2 devs.
- La puerta a MVVM y TCA queda abierta sin comprometer todo el código a ese costo desde el día 1.

**Negativas / Trade-offs**
- Sin la disciplina de partir en subvistas, la lógica puede filtrarse a la vista (el fallo clásico de MV). Mitigación: regla de revisión — "lógica fuera de las vistas"; si una vista crece, se descompone o sube a MVVM.
- El criterio "cuándo escalar" es de juicio, no automático; dos personas pueden discrepar. Mitigación: el escalado es local y reversible, así que el costo de equivocarse es bajo.
- MVVM-C sistemático también sería defendible en apps con muchos deep links; renunciamos a esa consistencia a cambio de menos ceremonia. Mitigación: la navegación tipada centralizada ([ADR-0007](0007-navegacion-por-valores-enum-approuter.md)) cubre el caso de deep links sin necesitar Coordinators por vista.

## Alternativas consideradas

1. **MVVM sistemático (un ViewModel por vista)**: descartado como default. Añade una capa obligatoria de ceremonia que 1-2 devs no necesitan en la mayoría de pantallas; se adopta caso a caso donde la lógica lo pide.
2. **TCA app-wide**: descartado. Alto costo de ceremonia y curva de aprendizaje; su valor (trazabilidad total) solo se paga en máquinas de estado complejas, no en toda la app. Además TCA 2.0 está en reescritura.
3. **MV puro sin posibilidad de escalar**: descartado. Ignorar que algunas features justifican más estructura llevaría a vistas gigantes con lógica filtrada.

## Referencias

- Informe fundacional §4.1 (capas — presentación), §4.9 (tabla de decisiones), §2.5 (nota sobre `@Reducer` estable vs `@Feature` roadmap): `../../../research/ios-swift-engineering/informe-fundacion.md`
- Decisiones del usuario (equipo 1-2 devs, MV/vanilla, TCA descartado): `../../../research/ios-swift-engineering/DECISIONS.md`
- [ADR-0003 — @Observable para modelos](0003-observable-sobre-observableobject-combine.md)
- [ADR-0006 — swift-dependencies como DI](0006-swift-dependencies-di-testabilidad.md)
- [ADR-0007 — Navegación tipada con AppRouter](0007-navegacion-por-valores-enum-approuter.md)
