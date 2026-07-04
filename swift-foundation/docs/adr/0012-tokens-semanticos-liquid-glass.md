# ADR-0012: Tokens semánticos como fuente única de verdad + adopción de Liquid Glass

- **Estado**: Propuesto
- **Fecha**: 2026-07-04
- **Decisor**: edaza
- **Aplica a**: La capa `DesignSystem` del monorepo (tokens, componentes, glass). La UI Liquid Glass del app shell se materializa en Fase 4. El esqueleto ya trae `DesignSystem/DesignTokens.swift`.

## Contexto

Dos decisiones de diseño van juntas porque se refuerzan:

**1. Tokens semánticos.** Sin una fuente única de verdad, los colores se dispersan como valores hex crudos por las vistas. Los hex crudos **rompen dark mode y vibrancy** (no se resuelven por apariencia ni se adaptan al material). La alternativa es nombrar los colores por **rol** (`.text(.primary)`, no `#1A1A1A`), resolver light/dark en una sola definición, e inyectar el tema por `Environment`.

**2. Liquid Glass.** WWDC 2025 (iOS 26) introdujo el mayor rediseño desde iOS 7: material translúcido, refractivo y con movimiento, reservado a la **capa de navegación** que flota sobre el contenido. Punto de vigencia crítico: el material ya se **iteró dos veces hacia mayor legibilidad** — iOS 26.1 sumó toggle de transparencia; iOS 27 redujo la transparencia por defecto, añadió bordes oscurecidos, specular highlights y un slider de transparencia. El retrato maximalista-translúcido de junio 2025 **ya no es el estado del arte**: hoy es un glass deliberadamente más opaco y legible.

Recompilar con Base SDK 26 ([ADR-0001](0001-deployment-target-ios17-base-sdk-ios26.md)) aplica Liquid Glass por defecto a los componentes nativos, así que la adopción es "casi gratis" pero **obliga a auditar** el look.

La accesibilidad es un **gate de release**, no pulido final. Piso legal exigible por la EAA hoy: **WCAG 2.1 AA** (vía EN 301 549 v3.2.1); WCAG 2.2 AA es best practice. La EAA ya generó litigios (Francia, nov-2025). El nivel de rigor formal es pregunta abierta del usuario (§8.10), pero WCAG 2.1 AA es el piso técnico que la decisión asume.

`DesignSystem` es una de las dos capas con `defaultIsolation(MainActor.self)` ([ADR-0002](0002-modo-lenguaje-swift6-approachable-concurrency.md)); es intencional (es UI) y **no** cruza a la frontera de portabilidad ([ADR-0013](0013-core-swift-puro-frontera-portabilidad.md)).

## Decisión

**Tokens semánticos como fuente única de verdad, con hex crudos prohibidos; Liquid Glass adoptado solo en la capa de navegación.**

**Tokens (`DesignSystem`)**:
- Colores nombrados por **rol** (`.text(.primary)`, `.background(.secondary)`), light/dark resueltos en **una** definición. Escala de espaciado **4/8pt**. Tipografía ligada a los **text styles del sistema** (Dynamic Type). Tema inyectado por `Environment`.
- **Prohibido hex crudo** en las vistas (rompe dark mode y vibrancy). Es la regla de enforcement de esta capa.

**Liquid Glass**:
- **Separar la app en dos capas**: contenido (scroll, media, texto) vs funcional/navegación (nav bars, tab bars, toolbars, botones). Aplicar glass **solo** a la funcional. **Nunca glass-on-glass ni vidrio sobre contenido.**
- Adopción: recompilar con Xcode 26 (SDK objetivo **26.2+**) y **auditar el default ya refinado** antes de tocar nada. Escape hatch temporal: `UIDesignRequiresCompatibility` en `Info.plist` (opt-out reversible).
- Refinar con `glassEffect(_:in:)`, agrupar con **`GlassEffectContainer`** (rendimiento + morphing), `glassEffectID` + `@Namespace` para transiciones. Botones: `buttonStyle(.glass)`/`.glassProminent` (evitar `glassEffect(.interactive())` con formas custom; aplicar `clipShape` **después** de `.glassProminent`).
- **Motion**: `matchedGeometryEffect` para transiciones hero (lista→detalle), `PhaseAnimator`/`KeyframeAnimator` (iOS 17+) para micro-interacciones, morphing glass con `withAnimation(.bouncy)`. Todo respeta **Reduce Motion**.

**Accesibilidad (gate de release)**:
- Trío `.accessibilityLabel`/`.Hint`/`.Value`; probar con **VoiceOver real**; activar Reduce Transparency/Motion + Increase Contrast; verificar contraste sobre fondos ocupados (añadir gradiente/dimming bajo glass `.clear`). Automatizar ~30% con `performAccessibilityAudit()` + Accessibility Inspector. Piso: **WCAG 2.1 AA**.
- **SF Symbols 7** con rendering hierarchical/palette heredando colores semánticos y vibrancy; materiales del sistema (`.ultraThinMaterial`) para profundidad legible. El sello Apple-grade = **Clarity, Deference, Depth** con consistencia.

## Consecuencias

**Positivas**
- Theming manejable: un solo lugar define colores/espaciado/tipografía; dark mode y Dynamic Type "gratis".
- Liquid Glass alineado con el look nativo ya refinado, adoptado casi sin código al recompilar.
- Accesibilidad como gate atrapa problemas de contraste/VoiceOver antes del release, no después.
- La capa `DesignSystem` encapsula todo el diseño; el resto de la app consume tokens, no valores crudos.

**Negativas / Trade-offs**
- **Batería**: Liquid Glass reportó ~13% más consumo vs iOS 18 en el reporte inicial (ya mitigado por las iteraciones). Mitigación: perfilar con Instruments y usar `GlassEffectContainer`.
- Contraste sobre fondos ocupados degrada legibilidad con glass `.clear`. Mitigación: gradiente/dimming bajo el glass; verificación de contraste en el gate.
- Prohibir hex crudos añade fricción al escribir UI rápida. Mitigación: los tokens semánticos cubren los casos; el costo se paga una vez al definir la paleta.
- El rigor formal de accesibilidad (WCAG 2.1 AA vs solo buenas prácticas) es pregunta abierta del usuario (§8.10); la decisión asume 2.1 AA como piso, ajustable al alza.

## Alternativas consideradas

1. **Colores hex crudos en las vistas**: descartado. Rompe dark mode y vibrancy; vuelve el theming inmanejable (fragmentación). Es justo lo que la decisión prohíbe.
2. **Liquid Glass sobre contenido / glass-on-glass**: descartado. Se ve amateur y degrada legibilidad; el material es solo para la capa de navegación.
3. **Posponer Liquid Glass con `UIDesignRequiresCompatibility` de forma permanente**: descartado como estado final. Es un escape hatch temporal/reversible, no una política; recompilar con SDK 26 ya trae el look y conviene adoptar el refinado.
4. **Accesibilidad como pulido final**: descartado. Es gate de release; el piso EAA/WCAG 2.1 AA ya tiene peso legal con litigios.

## Referencias

- Informe fundacional §2.4 (diseño de primer nivel), §5.3 (`@devground/swift-design-tokens`), §4.9: `../../../research/ios-swift-engineering/informe-fundacion.md`
- Decisiones del usuario (Liquid Glass solo en navegación + tokens semánticos); pregunta abierta §8.10 (rigor de accesibilidad): `../../../research/ios-swift-engineering/DECISIONS.md`
- `DesignSystem/DesignTokens.swift` del esqueleto (Fase 1)
- [ADR-0001 — Base SDK iOS 26 (aplica Liquid Glass al recompilar)](0001-deployment-target-ios17-base-sdk-ios26.md)
- [ADR-0002 — DesignSystem con defaultIsolation(MainActor)](0002-modo-lenguaje-swift6-approachable-concurrency.md)
- SF Symbols 7; `glassEffect`, `GlassEffectContainer`, `performAccessibilityAudit()`; WCAG 2.1 AA / EN 301 549 v3.2.1 (EAA)
