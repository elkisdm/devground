# ADR-0001: Fijar deployment target iOS 17 y Base SDK iOS 26

- **Estado**: Propuesto
- **Fecha**: 2026-07-04
- **Decisor**: edaza
- **Aplica a**: El app shell iOS de `swift-foundation` (llega en Fase 3) y el `platforms:` del `Package.swift` del monorepo.

## Contexto

Antes de escribir la primera vista hay que fijar dos ejes que en Xcode son **independientes** y que se confunden con frecuencia:

- **Base SDK**: el SDK contra el que compilas. Desde el **28 de abril de 2026**, App Store Connect exige compilar con **Base SDK iOS 26 (Xcode 26)** para poder publicar o actualizar una app. No es negociable si quieres estar en la tienda.
- **Deployment target**: la versión mínima de iOS en la que la app corre. Esto sí es una decisión de producto, y determina qué APIs puedes usar sin fallback y qué porción del parque dejas fuera.

Distribución real del parque a fin de junio de 2026: iOS 26 domina con ~84.5% (TelemetryDeck) / ~79% (métrica Apple), iOS 18 ~10%, iOS 27 asomando con ~2%. El corte pre-iOS 17 deja fuera solo ~3% del mercado. iOS 17 es la primera versión que trae Observation (`@Observable`) de forma nativa: fijar el mínimo ahí desbloquea el sistema de estado que adoptamos (ver [ADR-0003](0003-observable-sobre-observableobject-combine.md)) sin ninguna capa de compatibilidad.

Esta es una app greenfield, sin legado, de un equipo de 1-2 devs (ver `../../../research/ios-swift-engineering/DECISIONS.md`). No hay audiencia instalada previa que obligue a un mínimo conservador.

Hay un efecto secundario crítico de subir el Base SDK a 26: **recompilar con SDK 26 aplica Liquid Glass por defecto** a todos los componentes nativos (nav bars, tab bars, toolbars, botones), aunque no toques una sola línea de UI. El look cambia solo por recompilar.

## Decisión

Fijar **Deployment Target: iOS 17** y **Base SDK: iOS 26 (Xcode 26)**.

- En el `Package.swift` del monorepo: `platforms: [.iOS(.v17), .macOS(.v14)]` (ya presente en Fase 1).
- En el `.xcconfig` del app shell (Fase 3): `IPHONEOS_DEPLOYMENT_TARGET = 17.0`; el Base SDK lo impone Xcode 26.
- **Auditoría obligatoria de Liquid Glass tras la primera recompilación con SDK 26**: revisar el look ya refinado (iOS 26.1/27 iteraron el material hacia mayor legibilidad) antes de tocar nada. Escape hatch temporal si el timing no cuadra: `UIDesignRequiresCompatibility` en `Info.plist` pospone el look nuevo (opt-out reversible), nunca como estado final.
- **Degradación por versión encapsulada**: cualquier API exclusiva de iOS 18+/26+ se envuelve tras `#available`/`#unavailable` dentro de un `ViewModifier` o función con nombre de intención, **nunca** dispersa por las vistas. `#unavailable` (SE-0290, Swift 5.6) sirve para early-return pero **no admite el comodín `*`**: solo evalúa las plataformas que listas explícitamente.
- **Ignorar `@backDeployed`** (SE-0376) en esta app end-user: aplica a autores de SDK y jamás debe back-deployear APIs del sistema de Apple.
- La decisión del mínimo definitivo se revisa contra la distribución real de **TU** app (App Store Connect > Métricas de versión de OS) una vez publicada, no contra promedios globales.

Nota de fase: en Fase 1 el monorepo es solo esqueleto SPM (sin app target iOS). El `platforms:` ya declara iOS 17 para que las capas base compilen contra ese mínimo; el app shell con la UI llega en Fase 3.

## Consecuencias

**Positivas**
- `@Observable` disponible sin fallbacks ni ramas de compatibilidad, lo que simplifica todo el sistema de estado (ADR-0003).
- Cobertura de ~97% del parque con un solo camino de código; el 3% excluido es marginal para una app nueva.
- Cumples el requisito de publicación (SDK 26) sin acoplar el mínimo de ejecución a iOS 26, que sería un recorte innecesario de mercado.
- Adopción de Liquid Glass "casi gratis" al recompilar, alineada con [ADR-0012](0012-tokens-semanticos-liquid-glass.md).

**Negativas / Trade-offs**
- Dejas fuera el ~3% del parque pre-iOS 17. Mitigación: es una app greenfield sin base instalada que proteger; el costo de soportar iOS 16 (fallbacks de Observation con `ObservableObject`) supera el beneficio.
- Recompilar con SDK 26 cambia el look por defecto (Liquid Glass) sin que lo pidas. Mitigación: auditoría obligatoria post-recompilación y `UIDesignRequiresCompatibility` como freno temporal reversible.
- Xcode 26 como piso obligatorio ata el equipo a mantener la toolchain al día para poder publicar.

## Alternativas consideradas

1. **Deployment target iOS 16 (baseline conservador)**: descartado. Solo se justifica con legado existente o una audiencia amplia ya medida; ninguno aplica a un greenfield. Forzaría fallbacks de Observation y ganaría ~1-2% de parque a cambio de complejidad permanente.
2. **Deployment target iOS 26 (usar APIs nuevas sin fallback)**: descartado. Recortaría el mercado a ~84% para ganar acceso directo a Live Activities avanzadas / Foundation Models on-device que esta app aún no necesita. El SDK obligatorio no obliga a subir el mínimo; confundirlos rompe soporte sin razón.
3. **Posponer la decisión del Base SDK**: imposible. Compilar con SDK 26 es requisito de la tienda desde el 28-abr-2026.

## Referencias

- Informe fundacional §2.2 (compatibilidad y deployment targets) y §4.9 (tabla de decisiones): `../../../research/ios-swift-engineering/informe-fundacion.md`
- Decisiones del usuario: `../../../research/ios-swift-engineering/DECISIONS.md`
- [ADR-0003 — @Observable sobre ObservableObject/Combine](0003-observable-sobre-observableobject-combine.md) (motiva el mínimo iOS 17)
- [ADR-0012 — Tokens semánticos + Liquid Glass](0012-tokens-semanticos-liquid-glass.md) (consumidor del efecto de recompilar con SDK 26)
- SE-0290 (`#unavailable`), SE-0376 (`@backDeployed`)
