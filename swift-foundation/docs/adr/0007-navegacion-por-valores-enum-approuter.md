# ADR-0007: Navegar por valores con enum tipado + AppRouter inyectado

- **Estado**: Propuesto
- **Fecha**: 2026-07-04
- **Decisor**: edaza
- **Aplica a**: La navegación de toda la app y el manejo de deep links. El `AppRouter` vive en `AppFeature` (raíz de composición) y se inyecta por `@Environment`.

## Contexto

SwiftUI ofrece navegación basada en pila desde iOS 16: **`NavigationStack` + `NavigationPath`** (`NavigationView` está deprecado desde iOS 16). El principio moderno es empujar **valores**, no vistas: la pila almacena valores de ruta y el destino se resuelve con `navigationDestination(for:)`.

Sin una convención, la navegación degenera en dos antipatrones opuestos:

- **Navegación dispersa**: cada vista decide su propia navegación con strings o `NavigationLink` ad-hoc. Imposible de testear, deep links inconsistentes.
- **Router-dios**: un objeto central que además acumula estado que no le corresponde.

Además, el **deep linking** (abrir la app en una pantalla concreta desde un enlace externo) necesita construir la misma navegación que el flujo in-app. Si son dos modelos distintos, se duplica lógica y divergen.

El esqueleto ya expone `AuthFeatureInterface` en `FeatureInterfaces`, la base sobre la que las features declaran sus rutas sin acoplarse entre sí ([ADR-0005](0005-modularizacion-por-feature-spm-interfaces.md)).

## Decisión

**Navegación por valores con rutas modeladas como `enum` tipado (o `Identifiable`), centralizadas en un `AppRouter` inyectado por `@Environment`.**

- **`NavigationStack` + `NavigationPath`**; se empujan **valores**, no vistas. Las rutas son un `enum` tipado (nunca strings).
- Un **`AppRouter`** posee el `NavigationPath`. Las vistas **no navegan por su cuenta**: piden al router (`router.push(.detail(id:))`). El router se inyecta por `@Environment`.
- El **deep linking** construye rutas del **mismo `enum`**: existe un solo modelo de navegación, testeable, compartido entre enlaces externos y navegación in-app. Un deep link es solo una secuencia de valores de ruta empujados al mismo path.
- Se evitan ambos antipatrones: ni router-dios (el `AppRouter` posee navegación, **no** estado de negocio) ni navegación dispersa (las vistas no tienen lógica de routing).
- El routing es **data-driven**: la ruta es dato; el destino se resuelve declarativamente.

## Consecuencias

**Positivas**
- Un solo modelo tipado y testeable de navegación para in-app y deep links; se prueba sin UI (empujar valores y verificar el path).
- El compilador verifica las rutas (enum exhaustivo) en vez de strings frágiles.
- Deep links y navegación in-app no divergen porque comparten el `enum`.
- Encaja con MV/vanilla SwiftUI ([ADR-0004](0004-mv-swiftui-por-defecto-mvvm-tca.md)): las vistas quedan como expresiones de estado sin lógica de navegación.

**Negativas / Trade-offs**
- Centralización que hay que mantener: el `AppRouter` y el `enum` de rutas crecen con la app. Mitigación: cada feature aporta su fragmento de rutas por su módulo de interfaz; no todo vive en un archivo.
- Riesgo de router-dios si se le mete estado que no le corresponde. Mitigación: regla explícita — el router posee navegación, no estado de negocio; ese estado vive en modelos `@Observable`.
- En apps con muchísimas pantallas, MVVM-C (Coordinators) sería una alternativa igual de defendible. Mitigación: el `AppRouter` centralizado cubre el caso de deep links sin necesitar un Coordinator por feature.

## Alternativas consideradas

1. **`NavigationLink` disperso / navegación por strings**: descartado. No testeable, deep links inconsistentes, sin verificación del compilador. Es el antipatrón que la decisión previene.
2. **Cada vista navega por su cuenta (sin router)**: descartado. Duplica la lógica de deep link y hace imposible un modelo único de navegación.
3. **MVVM-C con un Coordinator por feature**: alternativa legítima, descartada para 1-2 devs. Añade una capa de Coordinators; el `AppRouter` único da el mismo control con menos ceremonia. Reconsiderable si la app crece mucho.
4. **`NavigationView` (API vieja)**: descartado. Deprecado desde iOS 16; `NavigationStack` es el reemplazo con navegación por valores.

## Referencias

- Informe fundacional §4.4 (navegación tipada), §4.9 (tabla de decisiones): `../../../research/ios-swift-engineering/informe-fundacion.md`
- [ADR-0004 — MV/vanilla SwiftUI por defecto](0004-mv-swiftui-por-defecto-mvvm-tca.md)
- [ADR-0005 — Modularización por feature + módulos de interfaz](0005-modularizacion-por-feature-spm-interfaces.md)
- [ADR-0006 — swift-dependencies (inyección del router por Environment)](0006-swift-dependencies-di-testabilidad.md)
