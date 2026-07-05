# INFORME-FUNDACIÓN: App iOS de primer nivel en Swift (2026) y evolución políglota de devground

> Documento base verificado a julio de 2026. Sirve como fuente para derivar ADRs y código. Toda decisión aquí es punto de partida, no dogma: se ajusta por complejidad real de cada feature.

---

## 1. Resumen ejecutivo

La tesis es directa: construir la app sobre **Swift 6.3.x en modo de lenguaje Swift 6 con Approachable Concurrency (MainActor por defecto)**, **SwiftUI como capa de presentación**, **`@Observable` como sistema de estado**, y un **ecosistema de Swift Packages modularizado por feature** con dependencias unidireccionales e invertidas. El harness de ingeniería se ancla en **Swift Testing + `swift-dependencies` + `swift-clocks`** para reproducibilidad total, **SwiftPM** como build system (con Tuist en reserva para cuando el monorepo duela), y **Xcode 26** como piso obligatorio de submission. El deployment target recomendado es **iOS 17** (SwiftUI-first, `@Observable` sin fallbacks, cubre ~97% del parque), compilando siempre con **Base SDK iOS 26** (obligatorio desde el 28 de abril de 2026). El diseño adopta **Liquid Glass** —ya iterado hacia mayor legibilidad en iOS 26.1/27— con **tokens semánticos** como fuente única de verdad.

El principio rector que gobierna todas las capas es la **frontera de portabilidad**: mantener `Domain`, `Networking`, `Persistence` y `FoundationUtils` en Swift puro sobre `Foundation`, sin acoplamiento a UIKit/SwiftUI. Esto habilita compartir lógica con Android mañana (vía KMP o el SDK oficial de Swift para Android + Skip) y mejora la testabilidad hoy. Sobre este blueprint, **devground** aporta el 60-70% del valor como proceso ya políglota (spec-flow, model-orchestrator, knowledge/ADR, dev-metrics funcionan sin tocar su núcleo), y se extiende con un puñado de paquetes `@devground/swift-*` que hacen para Swift lo que `eslint-config`/`tsconfig` hacen para TypeScript.

---

## 2. Dimensiones: estado del arte, decisiones y riesgos

### 2.1 Swift moderno (lenguaje y concurrencia)

**Estado del arte 2026.** Swift es un lenguaje maduro y estable. La versión vigente en producción es **Swift 6.3.x** (6.3 salió el 24 de marzo de 2026: interop C flexible con `@c`, SDK oficial de Android, `@specialize`/`@inline(always)`, mejoras embedded; 6.3.3 como punto vigente a fin de junio 2026). **Swift 6.4** se anunció en WWDC 2026 y está en beta: `async` en bloques `defer` (SE-0493), parsing de URL hasta 4x más rápido, `UniqueArray`, yielding accessors (SE-0474). El giro de ciclo más relevante fue **Swift 6.2** (15-sep-2025) con **Approachable Concurrency**, que volvió usable la data-race safety al poner el código en el main actor por defecto.

**Decisiones recomendadas.**
- **Fija la toolchain en Swift 6.3.x** para producción y **activa el modo de lenguaje Swift 6**. Precisión crítica: activar el modo de lenguaje Swift 6 es un paso deliberado y **separado** de actualizar la toolchain. Subir a 6.3.x no impone concurrencia estricta hasta que cambias `SWIFT_VERSION` a 6; fuera de ese modo son warnings incrementales, no errores.
- **Approachable Concurrency activada desde el día 1**: `-default-isolation MainActor` + `nonisolated(nonsending)` por defecto. Trata `@MainActor` como el default mental; reserva actors dedicados y `@concurrent` (mutuamente excluyente con `@MainActor`) para trabajo genuinamente concurrente (I/O, cómputo pesado).
- **Macros para eliminar boilerplate** (observación, DI, mocks, Codable) en vez de codegen externo (Sourcery) o reflexión en runtime. Como consumidor, adóptalas libremente; como autor, solo cuando el patrón se repite lo suficiente para pagar el costo (compilación más lenta, dependencia de `swift-syntax`).
- **Typed throws** para APIs de error acotadas; **`~Copyable`/ownership** solo en rutas calientes o recursos de propiedad única (handles, buffers), nunca por defecto en todo el dominio. **Embedded Swift** solo si tocas firmware/accesorios.
- **Library Evolution (`BUILD_LIBRARY_FOR_DISTRIBUTION`)** solo si distribuyes `.xcframework` a terceros (requiere module stability + `.swiftinterface`); en frameworks compilados junto a la app añade costo y restringe la API sin beneficio.
- **Migración por capas** (si aplica): activar chequeos estrictos como warnings primero, migrar módulos hoja hacia la raíz, dejar el target de app al final, `@preconcurrency` como puente temporal (nunca estado final).

**Riesgos.** Cadencia de versiones rápida (6.0→6.4 en ~20 meses) obliga a mantener toolchains al día; abusar de features muy nuevas ata a un Xcode/Swift mínimo alto. Migración mal ejecutada sin Approachable Concurrency paraliza equipos con ruido de Sendable. `@unchecked Sendable` como atajo reintroduce data races silenciosas. Macros propias en exceso crean un lenguaje interno difícil de depurar.

---

### 2.2 Compatibilidad y deployment targets

**Estado del arte 2026.** A fin de junio 2026, **iOS 26 domina con ~84.5%** (TelemetryDeck) / 79% (métrica Apple), **iOS 18 ~10%**, e **iOS 27 ya asoma con ~2%** (adopción de betas; iOS 27 se anunció en WWDC el 8 de junio de 2026, release final esperado en septiembre). Dos versiones (la última y la anterior) cubren **~94.6%** del mercado. Matiz honesto: iOS 26 va ~3 puntos por debajo de donde estuvo iOS 18 en el mismo punto de ciclo; es una de las curvas más lentas desde 2015, así que no se trata de una concentración inusualmente rápida este año, aunque en absoluto sigue siendo alta.

**Decisiones recomendadas.**
- **Base SDK: iOS 26 (obligatorio para publicar desde el 28 de abril de 2026, con Xcode 26).** Es requisito del SDK de build, **no** del deployment target: son ejes independientes en Xcode. Nota: compilar con SDK 26 aplica **Liquid Glass por defecto** a los componentes nativos, así que audita el look tras recompilar aunque no toques el mínimo.
- **Deployment Target: iOS 17** para app nueva SwiftUI-first (desbloquea `@Observable` sin fallbacks, cubre ~97%; el corte pre-17 deja fuera solo ~3%). iOS 16 solo como baseline conservador si hay legado o audiencia amplia. **Decide por la distribución real de TU app** (App Store Connect > Métricas de versión de OS), no por promedios globales.
- **Degradación con `#available`/`#unavailable`** encapsulados en wrappers semánticos (un `ViewModifier` o función con nombre de intención), nunca dispersos por las vistas. `#unavailable` (Swift 5.6, SE-0290) sirve para early-return, pero **no admite el comodín `*`**: solo evalúa las plataformas que listas.
- **`@backDeployed` (Swift 5.8, SE-0376): ignóralo en una app end-user**; usa `#available`. Solo aplica si eres autor de SDK, y **nunca** back-deployea APIs del sistema (SwiftUI/UIKit de Apple), solo tu propio código.
- **Fragmentación real = dispositivos, no versiones.** Diseña con **size classes** y layout adaptativo, no con checks de modelo. Live Activities con `ActivityConfiguration` para Dynamic Island (con fallback en Lock Screen). Prueba en el extremo inferior (iPhone 16e de 6.1" sin Island es el más chico a la venta; el SE 4.7" sigue relevante solo por base instalada), un modelo estándar, un Pro Max (iPhone 17 Pro Max: 6.9", 2868×1320, 460 ppi, 120 Hz) y iPad.

**Riesgos.** Confundir "SDK obligatorio iOS 26" con "subir el deployment target" y romper soporte innecesariamente. Fijar el mínimo por promedios globales en vez de la base real. Adoptar APIs exclusivas de iOS 26 sin fallback y recortar mercado. Dispersar checks `#available` como deuda técnica. Distribuir XCFramework sin Library Evolution atando al consumidor a tu versión de compilador.

---

### 2.3 Harness: testing, CI/CD y build

**Estado del arte 2026.** Se construye sobre **Xcode 26.x** (26.4/26.5; Xcode 27 emergiendo desde WWDC 2026 con code-completion on-device y coding agents) y **Swift 6.3.x**. Señal clara: **Swift Testing** (`@Test`/`#expect`, macro-based) es el default para tests nuevos; XCTest queda confinado a UI (XCUITest) y performance (`measure {}`).

**Decisiones recomendadas.**
- **Swift Testing por defecto** para unit/integration/async. Corre en paralelo **in-process** (XCTest aísla en procesos separados), lo que exige higiene de estado global; se puede serializar con el trait `.serialized` en un `@Suite`. Swift 6.2 sumó Attachments y Exit Tests, pero **Exit Tests NO compila para iOS** (solo macOS/Linux/Windows). Migra XCTest existente de forma **oportunista**, no masiva; ambos coexisten en el mismo target. Mantén archivos separados.
- **Reproducibilidad como cimiento**: inyecta tiempo/red/UUID con **`swift-dependencies`** (DI task-local, valores `live`/`preview`/`test`) + **`swift-clocks`** (`TestClock` para lógica temporal —debounce/retry/polling—, `ImmediateClock` cuando el tiempo es irrelevante). **Nunca** llames `Date()`/`UUID()`/`URLSession` directo en lógica de negocio. Regresión visual con **`swift-snapshot-testing` 1.17+** (soporte Swift Testing; `withSnapshotTesting(...)` con scope, ya que `isRecording`/`diffTool` globales quedaron deprecados por el paralelismo in-process).
- **Build/modularización**: **SwiftPM por defecto** con modularización por feature. **Tuist** cuando los build times o el `.xcodeproj` duelan (te quedas en Xcode, ganas caché remoto + selective testing; Mastodon reportó ~69% de mejora con caché remoto vs ~30% con SwiftPM puro). **Bazel solo a escala extrema** (Grab: 200+ ingenieros, 2.5M LOC, 700+ targets; Spotify: CI de 80→20 min; casos iOS bien documentados: Lyft, Tinder). Activa la **caché de compilación nativa de Xcode 26** (`COMPILATION_CACHE_ENABLE_CACHING=YES`, sobre LLVM CAS; `COMPILATION_CACHE_REMOTE_SERVICE_PATH` para remoto).
- **CI/CD**: **Xcode Cloud** si el equipo está all-in en Apple y quiere mínima fricción (firma automática, TestFlight directo, SDK day-one). **GitHub Actions + Fastlane Match** si necesitas portabilidad/control (GitHub Actions no soporta el automatic code signing de Xcode; Match cifra certificados/perfiles en repo). Los runners de GitHub retrasan versiones nuevas de Xcode **días a semanas según release**. Nunca firma manual con `.p12` sueltos.
- **Calidad**: **SwiftFormat** (o `swift-format` del toolchain) + **SwiftLint** como gates de CI (opcional Danger Swift para PRs). Coverage nativo (`xccov`) como **señal, no meta**. **Muter** para mutation testing solo sobre módulos core **tras estabilizar la suite** (los tests flaky envenenan el score ~4 puntos). Precisión sobre Muter: maneja bien mutantes que no compilan, pero errores de tooling/config (scheme no encontrado) aún pueden reportarse como éxito espurio.

**Principios rectores del harness excepcional**: (1) **Reproducibilidad** (cero no-determinismo, firma versionada, toolchain pinneado), (2) **Velocidad** (caché + selective testing + modularización), (3) **Señal confiable** (un test flaky se cuarentena o arregla en el mismo PR, nunca se re-corre "a ver si pasa"). Orden de construcción: DI primero → Swift Testing + snapshot → firma sin dolor → caché + selective testing (cuando CI supere ~10 min) → mutation testing al final.

**Riesgos.** Paralelismo in-process filtra estado global (flakiness al migrar). Exit Tests no valida crashes en iOS. Bazel sin escala real = sobre-ingeniería. Snapshot tests frágiles a cambios de OS/dispositivo: fija tamaño y traits.

---

### 2.4 Diseño de primer nivel

**Estado del arte 2026.** **Liquid Glass** (WWDC 2025, iOS 26) es el mayor rediseño desde iOS 7: material translúcido, refractivo y con movimiento, reservado a la capa de navegación que flota sobre el contenido. Punto crítico de vigencia: el material ya se **iteró dos veces hacia mayor legibilidad** (iOS 26.1 sumó toggle de transparencia; iOS 27 redujo transparencia por defecto, añadió bordes oscurecidos y specular highlights, slider de transparencia). El retrato maximalista-translúcido de junio 2025 ya no es el estado del arte: hoy es un Liquid Glass deliberadamente más opaco y legible.

**Decisiones recomendadas.**
- **Separa la app en dos capas**: contenido (scroll, media, texto) vs funcional/navegación (nav bars, tab bars, toolbars, botones). Aplica glass **solo** a la funcional. Nunca glass-on-glass ni vidrio sobre contenido.
- **Adopción casi gratis**: recompila con Xcode 26 (SDK objetivo **26.2+**) y **audita el default ya refinado** antes de tocar nada. Escape hatch temporal: `UIDesignRequiresCompatibility` en Info.plist para posponer el look nuevo (opt-out, reversible). Refina con `glassEffect(_:in:)`, agrupa con **`GlassEffectContainer`** (rendimiento + morphing), `glassEffectID` + `@Namespace` para transiciones. Botones: `buttonStyle(.glass)`/`.glassProminent` (evita `glassEffect(.interactive())` con formas custom; aplica `clipShape` **después** de `.glassProminent`).
- **Design system con tokens semánticos** como fuente única de verdad: nombra colores por rol (`.text(.primary)`), resuelve light/dark en una definición, escala de espaciado 4/8pt, tipografía ligada a text styles del sistema (Dynamic Type). Inyecta el tema por `Environment`. **Prohíbe hex crudos** (rompen dark mode y vibrancy).
- **Motion**: `matchedGeometryEffect` para transiciones hero (lista→detalle), `PhaseAnimator`/`KeyframeAnimator` (iOS 17+) para micro-interacciones. Morphing glass con `withAnimation(.bouncy)`. Todo respeta **Reduce Motion**.
- **Accesibilidad como gate de release**, no pulido final: trío `.accessibilityLabel`/`.Hint`/`.Value`, prueba con VoiceOver real, activa Reduce Transparency/Motion + Increase Contrast, verifica contraste sobre fondos ocupados (añade gradiente/dimming bajo glass `.clear`). Automatiza ~30% con `performAccessibilityAudit()` + Accessibility Inspector. **Piso legal exigible por la EAA hoy: WCAG 2.1 AA** (vía EN 301 549 v3.2.1); WCAG 2.2 AA es best practice / próxima versión del estándar. La EAA ya generó litigios (Francia, nov-2025).
- **SF Symbols 7** con rendering hierarchical/palette heredando colores semánticos y vibrancy (mejor que iconos custom de color plano). Distingue "Draw" (animación de trazo) de "Variable Draw" (progreso). Materiales del sistema (`.ultraThinMaterial`) para profundidad legible. El sello Apple-grade viene de **Clarity, Deference, Depth** aplicados con consistencia, no de efectos extra.

**Riesgos.** Batería (~13% más vs iOS 18 en el reporte inicial, ya mitigado por las iteraciones); perfila con Instruments y usa `GlassEffectContainer`. Contraste sobre fondos ocupados degrada legibilidad. Glass-on-glass se ve amateur. Fragmentación de tokens (hex dispersos) vuelve el theming inmanejable.

---

### 2.5 Librería de librerías (ecosistema de packages reutilizables)

**Estado del arte 2026.** El estándar de facto es un **monorepo con un solo `Package.swift`** que declara un product-library por capa, Swift 6.3.x (approachable concurrency nacida en 6.2), SemVer estricto, DocC auto-hospedado en **Swift Package Index** (que se unió a Apple el 23 de junio de 2026, co-firmado por Ted Kremenek; sigue open source; **más de 10.000 paquetes**; matriz ampliada a visionOS/WebAssembly/Android). Referencias a imitar: Apple (`swift-collections`/`swift-algorithms`/`swift-async-algorithms`) y Point-Free (`swift-dependencies` v1.14.1, `swift-navigation`, TCA).

**Decisiones recomendadas.**
- **Un monorepo, un `Package.swift`, un product library por capa.** Acepta desde el día 1 dos límites de SPM: no puedes anidar paquetes versionados dentro de otro, y todos los products comparten el mismo número de versión. Migra a git subtrees (patrón Apollo) **solo** si necesitas versionar capas de forma independiente.
- **Isolation por capa, no global** (declarada en cada target, tools-version ≥ 6.2): UI/DesignSystem pueden optar a `.defaultIsolation(MainActor.self)` (SE-0466); Networking/Persistence **deben** ser `nonisolated` + `Sendable`. Aplicar MainActor-by-default a las capas base es un antipatrón (hops de actor, rompe Sendable).
- **Terceros aislados** detrás de protocolos propios + `swift-dependencies`. **SemVer estricto** (MAJOR solo source-breaking), deprecación en 2 pasos (MINOR con `@available(*, deprecated, message:)` → MAJOR que elimina), API-diff en CI antes de taggear.
- **Distribución por fuente por defecto** (mejor DocC, debugging, evolución). `binaryTarget`/XCFramework solo para código cerrado, con un target fuente-thin como wrapper (DocC sobre `binaryTarget` genera `.doccarchive` vacío). Para empresa, monta un Swift Package Registry (Artifactory/JFrog) en vez de hacks con `.netrc`.
- **DocC + `swift-docc-plugin`** con catálogos `.docc` (tutoriales, no solo referencia), opt-in al hospedaje versionado gratuito del SPI. Target Example/Demo con Previews como documentación viva.
- Rasgos de excelencia: superficie de API pequeña y ortogonal, cero dependencias transitivas pesadas, testabilidad diseñada (todo efecto secundario tras un cliente inyectable), APIs que se leen como frases (API Design Guidelines: `sort()`/`sorted()`, prefijo `make` para factories).

**Riesgos.** Todos los products comparten versión y se descarga todo el repo. MainActor-by-default en capas base = antipatrón. DocC sobre binario = vacío. El ecosistema Point-Free está en reescritura (TCA 2.0); **la macro pública actual de TCA es `@Reducer` + `@ObservableState`, no `@Feature`** (los nombres de API de TCA 2.0 son roadmap anunciado, no API estable). `swift-dependencies` es la apuesta más estable y desacoplada de TCA.

---

### 2.6 Impacto en desarrollo Android

**Estado del arte 2026.** El patrón dominante y de menor riesgo es **shared core + native UI**: se comparte lógica de dominio/datos/red/presentación y se mantiene la UI nativa (SwiftUI en iOS, Jetpack Compose en Android). **SwiftUI no corre en Android: es un límite duro.** Dos rutas maduras:
- **KMP** (Kotlin-first): estable desde nov-2023, soporte oficial de Google desde **I/O 2024**, Compose Multiplatform para iOS estable en 1.8.0 (6-may-2025). Adopción 7% (2024) → 18% (2025). Producción en Netflix, McDonald's, Quizlet, Cash App, Forbes (>80% de lógica en su caso de estudio). Se extiende a web/desktop/server. Room 3.0 (mar-2026) es la versión mayor KMP-first.
- **SDK oficial de Swift para Android (Swift 6.3, mar-2026) + Skip** (Swift-first): mantenido por el Android Workgroup; `swift-java`/JNI para interoperar con Kotlin/Java; >25% de los paquetes del SPI ya compilan para Android. Skip (OSS completo desde ene-2026, v1.7) tiene dos modos: **Fuse** (compila Swift nativo, produce Jetpack Compose real) y **Lite** (transpila Swift→Kotlin). Mobile-only, más joven.

**Decisiones recomendadas.**
- **Comparte siempre la lógica** (core), decide caso por caso la UI. La frontera coincide con el corte de capas: `Domain`, `Networking`, `Persistence`, `FoundationUtils` (Swift puro sobre `Foundation`, sin UIKit/SwiftUI) es lo compartible; `DesignSystem` + Feature UIs es lo nativo no portable.
- **Parte desde donde vive el equipo**: Kotlin-first → KMP; Swift-first → SDK oficial Swift-Android + Skip Fuse. Son combinables (puedes consumir un módulo KMP desde ambos lados).
- **Evita Compose Multiplatform para la UI iOS**: renderiza sobre canvas Skia/Metal (estrategia tipo Flutter), degrada feel/rendimiento/accesibilidad nativos. Úsalo solo para pantallas internas/utilitarias.
- **Disciplina clave**: aunque hoy no portes, diseña el core sin acoplamiento a UIKit/SwiftUI. Reduce el costo de compartir mañana y mejora la testabilidad de inmediato.

**Riesgos.** Compose MP en iOS (Skia) degrada la experiencia si es la UI principal. Skip Lite no cubre el 100% del lenguaje Swift. La ruta Swift→Android es real pero más joven que KMP (menos batalla en producción). Acoplar lógica a UIKit/SwiftUI mata la portabilidad. Overhead de interop (bridging Swift↔Kotlin/Java vía JNI). Nota: las cifras de "85% de presentación / 60% de reutilización / 30-45% de ahorro" son estimaciones de industria, altamente dependientes del proyecto, no métricas duras. El Swift Export de KMP (interop directa sin capa Objective-C) está en **Alpha** (Kotlin 2.4), con objetivo de estable durante 2026.

---

## 3. Stack recomendado consolidado

| Área | Herramienta / decisión concreta | Versión / nota (2026) |
|---|---|---|
| Lenguaje | Swift, modo de lenguaje Swift 6 | **6.3.x** (6.4 en beta, no bloquear trabajo en ella) |
| Concurrencia | Approachable Concurrency, `-default-isolation MainActor`, `nonisolated(nonsending)`, `@concurrent` | Swift 6.2+ |
| IDE / toolchain | Xcode | **26.x** (26.2+ para diseño; 27 emergiendo) |
| UI | SwiftUI (UIKit vía `UIViewRepresentable`/`UIHostingSceneDelegate` solo puntual) | — |
| Estado | `@Observable` (`@State`/`@Binding`/`@Bindable`/`@Environment`) | iOS 17+ (también en UIKit desde iOS 26) |
| Base SDK | iOS 26 (obligatorio para publicar) | Desde 28-abr-2026 |
| Deployment target | iOS 17 (app nueva) / iOS 16 (conservador) | — |
| Testing | Swift Testing (`@Test`/`#expect`); XCTest solo XCUITest + `measure{}` | — |
| DI / reproducibilidad | `swift-dependencies` + `swift-clocks` (`TestClock`/`ImmediateClock`) | swift-dependencies 1.14.x |
| Regresión visual | `swift-snapshot-testing` (`withSnapshotTesting`) | 1.17+ |
| Build system | SwiftPM (Tuist al escalar; Bazel solo escala extrema) | Caché nativa Xcode 26 (`COMPILATION_CACHE_ENABLE_CACHING`) |
| CI/CD | Xcode Cloud **o** GitHub Actions + Fastlane Match | — |
| Lint/format | SwiftFormat (o `swift-format`) + SwiftLint; Danger opcional | — |
| Coverage / mutación | `xccov` (señal); Muter (core, tras estabilizar) | — |
| Packages | Monorepo, un `Package.swift`, product por capa, distribución por fuente | SemVer estricto |
| Docs | DocC + `swift-docc-plugin`, hospedaje en Swift Package Index | SPI (Apple, jun-2026) |
| Diseño | Liquid Glass (`glassEffect`, `GlassEffectContainer`) + tokens semánticos + SF Symbols 7 | iOS 26/27 |
| Android (opcional) | Shared core Swift puro → KMP **o** SDK Swift-Android + Skip Fuse | Swift 6.3 SDK Android |

---

## 4. Arquitectura

Esta sección define un blueprint técnico único y coherente para una app iOS de primer nivel en 2026, construida sobre Swift 6.3.x (modo de lenguaje Swift 6) con Approachable Concurrency, SwiftUI como capa de presentación, `@Observable` como sistema de estado y un ecosistema de Swift Packages modularizado por feature. Todas las decisiones apuntan a tres invariantes: **lógica fuera de las vistas**, **límites de módulo con dependencias unidireccionales e invertidas**, y **dependencias inyectadas y testeables**. Ningún patrón es dogma; la elección se hace por complejidad real de cada feature.

### 4.1 Capas de la aplicación

La app se organiza en tres capas lógicas con una regla de flujo estricta: la presentación depende del dominio, el dominio no depende de nadie hacia arriba, y los datos implementan protocolos que el dominio define.

**Presentación (SwiftUI).** Las vistas son expresiones puras de estado. El patrón por defecto es **MV / vanilla SwiftUI**: la lógica vive en modelos y servicios `@Observable` inyectados por `@Environment`, y en vez de crear un `ViewModel` por reflejo, se parte la vista en subvistas. Se sube a **MVVM** feature por feature solo cuando aparece lógica de presentación real y aislable. Se reserva un enfoque unidireccional estricto tipo **TCA (`@Reducer` / `@ObservableState`)** únicamente para módulos con máquinas de estado complejas donde la trazabilidad de cada mutación es requisito de producto —nunca app-wide ni con equipos sin base funcional. MV-por-defecto y MVVM-C son ambas posturas legítimas: para apps con muchas pantallas y varios deep-links, MVVM-C sigue siendo defendible.

**Dominio (Swift puro, sin UIKit/SwiftUI).** Entidades, casos de uso (`UseCase`), reglas de negocio y protocolos de repositorio. Esta capa importa solo `Foundation`. Es la frontera de portabilidad (ver §4.8) y el núcleo de la testabilidad: se prueba de forma aislada sin UI ni red real. El acoplamiento del dominio a UIKit/SwiftUI es el bloqueador #1 de portabilidad y se prohíbe por construcción.

**Datos.** Implementaciones concretas de los protocolos del dominio: clientes de red que transforman `DTO → DomainModel`, y persistencia (SwiftData, Keychain, `UserDefaults`, FileStorage) detrás de protocolos unificados. Los DTO nunca cruzan hacia presentación; el mapeo a modelo de dominio aísla el detalle de transporte.

### 4.2 Gestión de estado y flujo de datos

El sistema de estado se apoya en **Observation (`@Observable`, iOS 17+)**, que hace tracking a nivel de propiedad: SwiftUI re-renderiza solo las vistas que leen la propiedad que cambió. Se abandona la familia `ObservableObject`/`@Published`/Combine para modelos nuevos.

Roles de los property wrappers (un puñado, no más):

- `@State` — fuente de verdad y ownership de un modelo. En Xcode 27/iOS 26 el macro `@State` evalúa su valor inicial de forma perezosa, por lo que un `@Observable` almacenado en `@State` se inicializa una sola vez; la única regla que queda es **no** asignar el observable dentro del `init` de la vista.
- `@Binding` — acceso de escritura a una fuente de verdad de value types más arriba.
- `@Bindable` — binding bidireccional sobre reference types `@Observable`.
- `@Environment(Type.self)` — dependencias y modelos compartidos a lo largo de la jerarquía.

**Flujo unidireccional** como disciplina de diseño incluso sin TCA: el estado de alto nivel baja hacia las vistas; los cambios suben solo por bindings o mutando objetos observados. Anti-patrón prohibido: `@State` con clases sin `@Observable` correcto (recrea la instancia en cada update y filtra suscripciones/requests).

### 4.3 Concurrencia como parte de la arquitectura

El baseline 2026 es **Swift 6.2+ con Approachable Concurrency y Default Actor Isolation = `MainActor`**. El diseño es single-threaded/MainActor por defecto, con concurrencia opt-in —la dirección opuesta al estilo "annotation-heavy" de Swift 6.0.

Dominios de aislamiento explícitos y documentados:

- `@MainActor` — capa UI y modelos observables (default mental).
- **Actors dedicados** para estado mutable compartido real: p. ej. un actor de red y un actor de persistencia, con acceso serializado.
- `Sendable` en las fronteras entre módulos; `@concurrent` solo donde hay paralelismo genuino (I/O, cómputo pesado).

Regla de revisión: cero `@unchecked Sendable` sin justificación escrita. Si un diff necesita anotaciones defensivas para compilar, el modelo de concurrencia está mal diseñado. **Matiz de librería:** habilitar `defaultIsolation(MainActor.self)` conviene al target de app, pero **no** a los packages base reutilizables (Networking/Persistence deben ser `nonisolated` + `Sendable`).

### 4.4 Navegación tipada

**NavigationStack + NavigationPath** (NavigationView está deprecado desde iOS 16). Principio: se empujan **valores**, no vistas. Rutas modeladas como `enum` tipado o `Identifiable`, nunca strings. La navegación se centraliza en un **`AppRouter`** inyectado por `@Environment` que posee el `NavigationPath`; las vistas no navegan por su cuenta. El **deep linking** construye rutas del mismo `enum`, de modo que existe un solo modelo de navegación testeable compartido entre enlaces externos y navegación in-app. Se evitan tanto los "routers-dios" (centralizar navegación sin datos) como la navegación dispersa; el routing es data-driven.

### 4.5 Inyección de dependencias

**`swift-dependencies` (Point-Free)** como columna vertebral de DI y testabilidad —estilo Environment de SwiftUI, sobre task-local, con valores `live`/`preview`/`test`. Es la elección idiomática 2026 y no ata a TCA. Alternativa válida: **Factory** (container compile-time safe) para equipos que prefieren registro explícito; DI manual por inicializador basta en apps pequeñas. En todos los casos: **inyectar detrás de protocolos**. Nunca llamar `Date()`, `UUID()` ni `URLSession` directamente en lógica de negocio; se pasan como dependencias para poder sustituirlas por `TestClock`/`ImmediateClock` (`swift-clocks`) y fixtures en tests.

### 4.6 Grafo de módulos

Modularización **por FEATURE, no por capa**, en Swift Package Manager. Estructurar por `Views/`/`ViewModels/`/`Services/` escala mal; se compone por features autocontenidas y removibles. SPM aplica los límites gratis. Cuando dos features deben comunicarse, se define un **módulo de interfaz** (solo protocolos) y se invierte la dependencia; jamás se acopla implementación con implementación.

```
                         ┌──────────────┐
                         │   AppTarget   │  (composición raíz, DI wiring,
                         └──────┬───────┘   AppRouter, deep-link entry)
                                │
             ┌──────────────────┼──────────────────┐
             ▼                  ▼                  ▼
      ┌────────────┐     ┌────────────┐     ┌────────────┐
      │ FeatureHome │     │ FeatureAuth │     │ FeatureX…  │   ← Feature kits
      └──────┬─────┘     └──────┬─────┘     └──────┬─────┘
             │                  │                  │
             │        ┌─────────┴──────────┐       │
             ▼        ▼                    ▼        ▼
      ┌───────────────────┐        ┌──────────────────────┐
      │ FeatureInterfaces │        │     DesignSystem      │  ← @MainActor OK
      │ (protocolos entre │        │ (tokens + UI-Kit SwiftUI)
      │  features, DI)    │        └───────────┬──────────┘
      └─────────┬─────────┘                    │
                ▼                               ▼
      ┌───────────────────────────────────────────────────┐
      │                     Domain                         │  ← Swift puro
      │  (entidades, UseCases, protocolos de repositorio)  │     (Foundation)
      └───────────────┬───────────────────┬───────────────┘
                      ▼                   ▼
             ┌────────────────┐   ┌────────────────┐
             │   Networking    │   │  Persistence   │        ← nonisolated
             │ (Client, DTO→   │   │ (Keychain/     │           + Sendable
             │  Domain, Ktor-  │   │  UserDefaults/ │
             │  free, Sendable)│   │  SwiftData)    │
             └────────┬───────┘   └───────┬────────┘
                      ▼                   ▼
             ┌───────────────────────────────────────┐
             │           FoundationUtils              │  ← cero dependencias
             │  (extensiones, value types, helpers)   │     de terceros
             └───────────────────────────────────────┘
```

Dependencias estrictamente **hacia abajo**, sin ciclos: `FoundationUtils` no conoce a nadie; `Domain` no importa SwiftUI; los Feature kits componen las capas inferiores; `AppTarget` es la única raíz de composición que cablea la DI. Beneficios verificados: builds incrementales, previews de SwiftUI más rápidas y estables, y trabajo en paralelo por equipo.

### 4.7 Arquitectura de la "librería de librerías"

La base reutilizable es un **monorepo con un solo `Package.swift`** que declara un `product`-library por capa. Se diseña desde el día 1 aceptando dos límites de SPM: no se pueden anidar packages versionados dentro de otro, y todos los products comparten el mismo número de versión. Se migra a git subtrees (patrón Apollo) **solo** si se necesita versionar capas de forma independiente.

Capas concretas y reglas de composición:

1. **`FoundationUtils`** — extensiones, tipos de valor, cero deps de terceros. `nonisolated`.
2. **`Networking`** — cliente + `DTO → Domain`, `Sendable`, `nonisolated`. No importa SwiftUI.
3. **`Persistence`** — protocolos unificados sobre Keychain/`UserDefaults`/FileStorage/SwiftData. `nonisolated`.
4. **`DesignSystem`** — tokens semánticos + componentes SwiftUI. Puede optar a `MainActor`.
5. **`FeatureKits`** — componen todas las anteriores.

Reglas transversales:

- **Isolation por capa, no global** (declarada en cada target de `Package.swift`, tools-version ≥ 6.2).
- **Terceros aislados** detrás de protocolos propios + DI (`swift-dependencies`), para poder cambiarlos sin romper consumidores.
- **SemVer estricto** como contrato: MAJOR solo para cambios source-breaking. Deprecación en 2 pasos: MINOR con `@available(*, deprecated, message:)` que apunta al reemplazo → MAJOR que elimina. API-diff en CI antes de taggear.
- **Distribución por fuente** por defecto (mejor DocC, debugging, evolución). `binaryTarget`/XCFramework solo para código cerrado, y en ese caso con un target fuente-thin como wrapper para que DocC y las dependencias funcionen.
- **Library Evolution (`BUILD_LIBRARY_FOR_DISTRIBUTION`)** SOLO si se distribuye `.xcframework` a terceros; en packages compilados junto a la app añade costo y restringe la API sin beneficio.
- **DocC + `swift-docc-plugin`** con catálogos `.docc` (tutoriales, no solo referencia); hospedaje versionado gratuito en Swift Package Index. Un target `Example`/Demo con Previews como documentación viva.

Rasgos de excelencia a imitar de `swift-collections`/`swift-async-algorithms` y Point-Free: superficie de API pequeña y ortogonal, cero dependencias transitivas pesadas, testabilidad diseñada (todo efecto secundario detrás de un cliente inyectable) y APIs que se leen como frases en el punto de uso (API Design Guidelines: `sort()` imperativo vs `sorted()` con sufijo, `make*` para factories).

### 4.8 Frontera de portabilidad (compartir con Android)

El patrón de menor riesgo es **shared core + native UI**: se comparte lógica de dominio/datos/red/presentación y se mantiene la UI nativa (SwiftUI en iOS, Jetpack Compose en Android). SwiftUI **no** corre en Android; es un límite duro.

La frontera coincide exactamente con el corte de capas de §4.1: todo lo que vive en **`Domain`, `Networking`, `Persistence` y `FoundationUtils`** —Swift puro sobre `Foundation`, sin imports de UIKit/SwiftUI— es lo que compila con el **SDK oficial de Swift para Android (Swift 6.3, marzo 2026)** y lo que **Skip (modo Fuse, nativo)** puede llevar a Android. La capa `DesignSystem` + Feature UIs es lo nativo no portable.

| Agnóstico de UI (compartible) | Nativo SwiftUI (no portable) |
|---|---|
| `FoundationUtils` | `DesignSystem` (tokens + componentes glass) |
| `Domain` (UseCases, entidades, reglas) | Vistas y navegación SwiftUI |
| `Networking` (Client, DTO→Domain) | `AppRouter` / integración `@Environment` |
| `Persistence` (protocolos) | Live Activities, Liquid Glass, deep-link presentation |

Dos rutas maduras según dónde vive el equipo: **KMP** (Kotlin-first, se extiende también a web/desktop/server) o **SDK Swift-Android + Skip Fuse** (Swift-first, mobile-only, más joven). Son combinables. Se evita **Compose Multiplatform para la UI iOS** (renderiza sobre canvas Skia, degrada feel/rendimiento/accesibilidad nativos) salvo pantallas internas. Disciplina clave: aunque hoy no se porte, diseñar el core sin acoplamiento a UIKit/SwiftUI reduce el costo de compartir mañana y mejora la testabilidad de inmediato.

### 4.9 Decisiones arquitectónicas clave (con tradeoff)

| Decisión | Justificación | Tradeoff aceptado |
|---|---|---|
| **Deployment target iOS 17** (Base SDK iOS 26, obligatorio para publicar) | Desbloquea `@Observable`/Observation con mínimo fallback; cubre ~97% del parque. El SDK obligatorio ≠ target. | Deja fuera pre-iOS 17 (~3%). Recompilar con SDK 26 aplica Liquid Glass por defecto; requiere auditar el look. |
| **MV / vanilla SwiftUI por defecto**, MVVM caso a caso, TCA solo para estado complejo | Menos ceremonia y boilerplate; la composición de vistas resuelve el "Massive View Controller". | Sin la disciplina de partir en subvistas, la lógica puede filtrarse a la vista. MVVM-C también es defendible en apps grandes. |
| **`@Observable` sobre `ObservableObject`/Combine** | Tracking por propiedad → mejor rendimiento por defecto; menos código. | Requiere iOS 17+; migración gradual del código Combine existente. |
| **Modularización por feature en SPM + módulos de interfaz** | Builds incrementales, previews estables, trabajo paralelo, features removibles; SPM aplica límites gratis. | Overhead inicial de definir packages e interfaces; grafo que mantener sin ciclos. |
| **MainActor por defecto (Approachable Concurrency)** en el app; `nonisolated`+`Sendable` en capas base | Elimina el ruido de errores de Sendable; single-threaded por defecto es más simple. | Aplicar MainActor-by-default a Networking/Persistence sería antipatrón (hops de actor, rompe Sendable): decisión por capa consciente. |
| **`swift-dependencies` como DI** | Overrides triviales en tests/previews; idiomático; desacoplado de TCA. | Dependencia de un package externo; requiere disciplina de inyectar tras protocolos. |
| **Navegación por valores con `enum` + `AppRouter` inyectado** | Un solo modelo tipado y testeable para navegación in-app y deep links. | Centralización que hay que mantener; riesgo de router-dios si se le mete estado que no le corresponde. |
| **Monorepo un `Package.swift`, distribución por fuente, SemVer estricto** | Simplicidad, mejor DocC/debugging, contrato de compatibilidad claro. | Todos los products comparten versión y se descarga todo el repo; versionado independiente exige migrar a subtrees (deuda diferida). |
| **Core Swift puro como frontera de portabilidad** | Habilita KMP/Skip sin reescritura; testabilidad inmediata sin UI. | Aislar terceros y mantener el dominio libre de UIKit/SwiftUI añade boilerplate y requiere disciplina sostenida. |

---

## 5. Cómo devground apoya este desarrollo

devground ya es, en filosofía, "estándares de desarrollo como paquetes, un solo comando". Esa filosofía es agnóstica del stack; lo que hoy es TS-first es la *implementación*, no el diseño. Para una app iPhone en Swift no partes de cero: reutilizas todo el aparato de proceso (intake, routing, knowledge, métricas, auditoría) tal cual, adaptas los envoltorios de tooling y creas un puñado de paquetes `@devground/swift-*` que hacen para Swift lo que `eslint-config`/`tsconfig` hacen para TS.

### 5.1 Tabla de mapeo: capacidad devground → aplicación en Swift

| Capacidad devground (actual) | Equivalente / aplicación en Swift | Clasificación |
| --- | --- | --- |
| `@devground/sdd` (spec-flow: clasificar → tier → brief → routing) | Mismo intake para "agrega login con Face ID", "migra a Swift 6 concurrency", "haz el scroll 60fps". El brief solo cambia de vocabulario de archivos (rutas `.swift`, `Package.swift`, `.xcodeproj`). | **REUSABLE tal cual** |
| `tools/model-orchestrator` (routing Opus/Sonnet/Haiku por complejidad, ADR-0017) | Una migración de actor isolation o un diseño de arquitectura modular → Opus; un `@Test` nuevo o un `#expect` → Haiku/Sonnet. La complejidad es la señal, no el lenguaje. | **REUSABLE tal cual** |
| `@devground/architecture-guide` (knowledge base + ADR 0001-0011) | La knowledge base de bases de datos/patrones/systems-design aplica a la capa de dominio Swift. Se **extiende** con ADRs iOS-específicos (concurrencia, deployment target, SwiftUI vs UIKit, KMP vs Skip). | **REUSABLE + extender contenido** |
| `@devground/dev-metrics` (serie temporal desde git + transcripts) | Git y los transcripts de Claude Code son agnósticos del lenguaje. El *reader* de "volumen/calidad/velocidad" funciona; solo hay que enseñarle a contar tests de `Swift Testing` (`@Test`) además de `vitest`, y a leer coverage de `xccov`. | **ADAPTAR (parsers de señal)** |
| `@devground/deepcheck` (QA + Validation + Audit multi-agente) | El harness multi-agente es reutilizable; la *skill de auditoría por-flow* aprende el dominio. Para Swift la rúbrica cambia: cero `@unchecked Sendable` sin justificar, estados inválidos irrepresentables por tipos, aislamiento de actor explícito, APIs legibles según las API Design Guidelines. | **ADAPTAR (rúbrica + comandos de verificación)** |
| `@devground/cli` (`devground-init`, scaffolding interactivo) | El motor de scaffolding sirve; hay que enseñarle a **detectar stack Swift** (presencia de `Package.swift`/`*.xcodeproj`) y a instalar el set `@devground/swift-*` en vez del set TS. | **ADAPTAR (detección de stack + presets)** |
| `@devground/agents-md` (AGENTS.md + symlinks Claude/Cursor/Copilot/Gemini) | El mecanismo de reglas para agentes es idéntico; el **contenido** de las reglas cambia (convenciones Swift, prohibiciones de concurrencia, SwiftUI-first). | **ADAPTAR (contenido de reglas)** |
| `@devground/commitlint-config`, `husky-config`, `lint-staged-config` | Conventional commits y git hooks son agnósticos. `lint-staged` corre `swiftformat`/`swiftlint` en vez de `prettier`/`eslint`. `husky` gestiona hooks igual. | **ADAPTAR (comandos que ejecutan)** |
| `@devground/eslint-config` + `prettier-config` | Sin equivalente directo: en Swift el linter y el formateador son otras herramientas. Se sustituyen por paquetes nuevos (abajo). | **NUEVO paquete** |
| `@devground/tsconfig` | El "config de compilador compartido" en Swift vive en `Package.swift` (tools-version, `swiftSettings`, `defaultIsolation`) y en `*.xcconfig`. Se crea un paquete de plantillas. | **NUEVO paquete** |
| `@devground/vitest-config` | Config de test runner: en Swift es `Swift Testing` + XCTest + esquema de `xcodebuild`. Paquete nuevo con harness completo. | **NUEVO paquete** |
| `@devground/logger` | Un logger TS no cruza a Swift. En Swift ya existe `swift-log`/`OSLog`; se documenta como referencia, no se reempaqueta salvo que quieras estandarizar un wrapper propio. | **NUEVO (opcional) / referencia externa** |

### 5.2 Qué es agnóstico ya (no se reescribe el core)

Cuatro piezas soportan Swift **sin tocar su núcleo**, solo alimentándolas con contenido/parsers:

- **spec-flow** — el intake de cambios razona sobre "qué tipo de cambio, qué tan grande, qué tan riesgoso". Eso es independiente del lenguaje. Un tier 3 riesgoso (migración a strict concurrency) se clasifica igual que una migración de esquema SQL.
- **model-orchestrator** — el routing por complejidad opera sobre la señal de la tarea, no sobre su sintaxis. Un diseño de arquitectura modular en SPM pesa lo mismo que uno en Next.js.
- **knowledge/adr** — el *método* (decisión → ADR con status → citarlo) es el mismo. Solo agregas ADRs de dominio iOS. La regla "nunca inventes un ADR" y "cita el específico" se mantiene.
- **dev-metrics** — trabaja sobre git + transcripts de Claude Code, ambos agnósticos. La evolución del desarrollador se mide igual; solo hay que enseñarle a reconocer los artefactos Swift como señal.

Esto es lo que hace barato el salto: el 60-70% del valor de devground es proceso, y el proceso ya es políglota.

### 5.3 Nuevos paquetes `@devground/swift-*` a crear

Cada uno replica un rol que hoy cubre un paquete TS, pero con el tooling nativo de Swift verificado para 2026 (Swift 6.3.x, Xcode 26, `Swift Testing`).

1. **`@devground/swift-format-config`** — configuración compartida de **SwiftFormat** (autocorrección) y **SwiftLint** (reglas, complejidad ciclomática, `file_length`). Son complementarios, no sustitutos: SwiftFormat formatea, SwiftLint valida. Es el análogo directo de `eslint-config` + `prettier-config`. Justificación: sin config compartida, cada repo Swift diverge en estilo; este paquete es el gate de consistencia.

2. **`@devground/swift-package-template`** — plantillas de `Package.swift` con `swift-tools-version: 6.2`+ y, sobre todo, **isolation por capa**: `defaultIsolation(MainActor.self)` para targets de UI/DesignSystem, pero `nonisolated` + `Sendable` para Networking/Persistence. Justificación: la decisión de aislamiento NO es trivial y aplicar `MainActor` por comodidad a las capas base es un antipatrón documentado (hops de actor, rompe `Sendable`). Codificar la plantilla correcta evita el error más caro de la migración a Swift 6.

3. **`@devground/swift-xcode-scaffold`** — scaffolding de proyecto: estructura **modular por feature** en paquetes SPM (no por capa/tipo de archivo), `.xcconfig` con Base SDK iOS 26 y Deployment Target iOS 17 como default (SwiftUI-first, `@Observable` sin fallbacks), y separación estricta capa de contenido / capa de navegación. Justificación: fija desde el día 1 los límites de módulo unidireccionales que definen si la arquitectura escala o colapsa.

4. **`@devground/swift-test-harness`** — el harness de testing completo: `Swift Testing` (`@Test`/`#expect`) como default, XCTest solo para XCUITest y `measure{}`, `swift-dependencies` + `swift-clocks` (`TestClock`/`ImmediateClock`) para inyectar tiempo/red/UUID, `swift-snapshot-testing` para regresión visual, y coverage vía `xccov`. Justificación: es el equivalente de `vitest-config`, pero con la disciplina de reproducibilidad (cero no-determinismo) que separa un harness de primer nivel de uno promedio.

5. **`@devground/swift-design-tokens`** — sistema de **tokens semánticos** (colores por rol light/dark en una definición, escala de espaciado 4/8pt, tipografía ligada a text styles del sistema para Dynamic Type) inyectados por `Environment`, listos para **Liquid Glass** (iOS 26) y vibrancy. Justificación: prohíbe hex crudos dispersos, que rompen dark mode y accesibilidad; es el análogo iOS de un design system con fuente única de verdad.

6. **`@devground/swift-ci`** — plantillas de CI/CD: GitHub Actions + **Fastlane Match** (firma sin dolor, certificados cifrados) o Xcode Cloud, matriz de simuladores por versión soportada, y activación de la **caché de compilación nativa de Xcode 26** (`COMPILATION_CACHE_ENABLE_CACHING`). Justificación: el code signing y el toolchain pinneado son la fuente #1 de fricción; estandarizarlos es el mayor ahorro de horas por repo.

> Opcional a futuro, si el objetivo se amplía a Android desde Swift: un `@devground/swift-portable-core` que imponga Clean Architecture con dominio/datos en Swift puro (Foundation, sin `UIKit`/`SwiftUI`), prerrequisito para el SDK oficial de Swift para Android + Skip. No es necesario para la app iOS; solo si compartir lógica con Android entra en scope.

### 5.4 devground políglota: cómo evoluciona el monorepo

El monorepo pasa de "pnpm de configs TS" a "workspace de estándares multi-stack", conviviendo TS y Swift lado a lado:

- **Workspace** — los paquetes `@devground/swift-*` viven en el mismo `packages/` que los TS. Los que son configs de tooling siguen siendo paquetes npm (contienen archivos de config `.swiftlint.yml`, `.swiftformat`, plantillas `Package.swift`, `.xcconfig`, `Fastfile`) que el CLI copia al repo destino; no requieren que el consumidor tenga Node más que para correr `devground-init`. Los que quieras versionar como Swift real (un core reutilizable) pueden vivir en su propio `Package.swift` dentro del monorepo.
- **CLI que detecta stack** — `devground-init` gana una fase de detección: si encuentra `Package.swift` o `*.xcodeproj`, ofrece el preset Swift; si encuentra `package.json` con Next, el preset TS; si ambos, ambos. El scaffolding interactivo ya existe; solo se ramifica por stack detectado.
- **ADRs nuevos** — se agregan al `docs/adr/` del propio devground (que va en 0017) para documentar las decisiones de la extensión: p.ej. ADR-0018 "devground políglota: workspace TS + Swift", ADR-0019 "isolation por capa como default de las plantillas Swift", ADR-0020 "Swift Testing + swift-dependencies como harness estándar". Y al `architecture-guide` se le suman ADRs de dominio iOS reutilizables por los proyectos consumidores.
- **agents-md** — las reglas para agentes se vuelven condicionales por stack: el `AGENTS.md` de un repo Swift hereda las reglas de proceso (spec-flow, conventional commits) y suma las de dominio (SwiftUI-first, prohibiciones de concurrencia, rúbrica de revisión Swift).

### 5.5 Plan por fases (devground)

Cada fase tiene un criterio de verificación objetivo antes de avanzar.

**Fase 0 — Validar que el core agnóstico ya sirve (sin escribir paquetes).**
Corres spec-flow y model-orchestrator sobre una petición Swift real ("agrega pantalla de login SwiftUI") en un repo iOS de prueba.
→ *Verificación:* spec-flow produce un brief con rutas `.swift` correctas y tier asignado; el orquestador rutea la tarea a un modelo por complejidad. Si el brief es coherente sin tocar el core, el 0 pasa.

**Fase 1 — Paquetes de tooling base (`swift-format-config` + `swift-package-template`).**
Publicas los dos paquetes y los instalas manualmente en el repo de prueba.
→ *Verificación:* `swiftlint` y `swiftformat` corren en el repo con la config compartida y reportan issues; un `Package.swift` generado desde la plantilla compila con isolation por capa correcta (UI en `MainActor`, Networking `nonisolated`+`Sendable`) sin warnings de concurrencia.

**Fase 2 — Harness de testing (`swift-test-harness`).**
Añades el paquete y escribes un test de ejemplo con `@Test`/`#expect` y una dependencia inyectada con `TestClock`.
→ *Verificación:* la suite corre en CI local, `xccov` reporta coverage, y un test con tiempo (debounce/retry) pasa de forma determinista con `TestClock`. Cero flakiness en 10 corridas.

**Fase 3 — Scaffolding y CLI políglota (`swift-xcode-scaffold` + detección de stack en `@devground/cli`).**
`devground-init` detecta el stack Swift y scaffoldеa un proyecto modular por feature con los paquetes de las fases 1-2 preinstalados.
→ *Verificación:* en un directorio con `Package.swift`, `devground-init` ofrece el preset Swift (no el TS), genera la estructura modular y el proyecto compila + testea con un solo comando.

**Fase 4 — Adaptación de deepcheck y dev-metrics.**
Actualizas la rúbrica de deepcheck para Swift (concurrencia, tipos, API guidelines) y enseñas a dev-metrics a leer señal Swift (tests `@Test`, coverage `xccov`).
→ *Verificación:* deepcheck audita un PR Swift y levanta un hallazgo real de la rúbrica (p.ej. un `@unchecked Sendable` sin justificar); dev-metrics grafica la evolución de un repo Swift con volumen/calidad no vacíos.

**Fase 5 — Diseño y CI (`swift-design-tokens` + `swift-ci`) + ADRs.**
Publicas los tokens y las plantillas de CI, y escribes los ADRs 0018-0020 en el `docs/adr/` de devground.
→ *Verificación:* un componente SwiftUI consume tokens semánticos y responde a dark mode + Dynamic Type sin hex crudos; el pipeline de CI firma y sube a TestFlight con Fastlane Match sin firma manual; los ADRs están en status `proposed` y citables por el CLI.

Al cerrar la Fase 5, `devground-init` en un repo iOS entrega el mismo "un solo comando" que hoy entrega en un repo Next.js: proceso (spec-flow, orquestador, deepcheck, métricas) reutilizado tal cual, y estándares Swift instalados desde los paquetes `@devground/swift-*`.

---

## 6. Roadmap accionable unificado

Combina la construcción de la app/librería con la evolución de devground. Cada fase declara su criterio de verificación. Las fases de devground (§5.5) corren **en paralelo** con las de app: la Fase A de app se apoya en la Fase 0-1 de devground, y así sucesivamente.

**Fase 1 — Cimientos del repositorio y proceso (semana 1-2).**
Crear el monorepo con un solo `Package.swift`, tools-version 6.3, product-library por capa (`FoundationUtils`, `Networking`, `Persistence`, `DesignSystem`, `FeatureInterfaces`), `AppTarget` como raíz de composición. Isolation por capa desde el inicio. Correr spec-flow + model-orchestrator sobre una petición Swift real (devground Fase 0).
→ *Verificación:* el grafo de módulos compila sin ciclos ni warnings de concurrencia; `Domain` no importa SwiftUI; Networking/Persistence son `nonisolated`+`Sendable`; spec-flow produce un brief coherente con rutas `.swift`.

**Fase 2 — Tooling y harness base (semana 2-4).**
Publicar e instalar `@devground/swift-format-config` y `@devground/swift-package-template` (devground Fase 1). Montar el harness: Swift Testing + `swift-dependencies` + `swift-clocks` + `swift-snapshot-testing` (devground Fase 2). Configurar `SWIFT_VERSION = 6` deliberadamente.
→ *Verificación:* `swiftlint`/`swiftformat` corren con config compartida; un test con `TestClock` (debounce) pasa determinista, cero flakiness en 10 corridas; `xccov` reporta coverage; el modo de lenguaje Swift 6 compila sin `@unchecked Sendable`.

**Fase 3 — Primera feature vertical end-to-end (semana 4-7).**
Implementar una feature completa (p. ej. Auth con Face ID) atravesando las tres capas: `Domain` (UseCase + protocolo de repositorio), `Networking` (DTO→Domain), presentación MV/vanilla SwiftUI con `@Observable`, navegación tipada vía `AppRouter` + `enum`. DI con `swift-dependencies`. Deep link mapeado al mismo `enum`.
→ *Verificación:* la feature es removible sin romper la app; el UseCase se testea aislado sin UI ni red real; el deep link y la navegación in-app comparten el modelo tipado; sube a MVVM solo si aparece lógica de presentación aislable.

**Fase 4 — Design system y Liquid Glass (semana 6-9, solapa con Fase 3).**
Publicar `@devground/swift-design-tokens` (devground Fase 5 parcial): colores por rol light/dark, escala 4/8pt, tipografía Dynamic Type, inyección por `Environment`. Adoptar Liquid Glass recompilando con Xcode 26 (SDK 26.2+), auditar el default ya refinado, aplicar glass solo a la capa de navegación con `GlassEffectContainer`.
→ *Verificación:* un componente responde a dark mode + Dynamic Type sin hex crudos; VoiceOver + Reduce Transparency/Motion + Increase Contrast funcionan; contraste OK sobre fondos ocupados (WCAG 2.1 AA); cero glass-on-glass.

**Fase 5 — CI/CD y scaffolding políglota (semana 8-11).**
Publicar `@devground/swift-ci` (Xcode Cloud o GitHub Actions + Fastlane Match) y `@devground/swift-xcode-scaffold`; añadir detección de stack a `@devground/cli` (devground Fase 3). Activar caché nativa de Xcode 26 en CI.
→ *Verificación:* el pipeline firma y sube a TestFlight sin firma manual; `devground-init` en un dir con `Package.swift` ofrece el preset Swift y genera un proyecto que compila+testea con un comando; matriz de simuladores por versión soportada.

**Fase 6 — Auditoría y métricas adaptadas (semana 10-13).**
Adaptar deepcheck (rúbrica Swift: concurrencia, tipos, API guidelines) y dev-metrics (parsers `@Test`/`xccov`) — devground Fase 4. Estabilizar la suite; opcionalmente introducir Muter sobre módulos core.
→ *Verificación:* deepcheck levanta un hallazgo real (`@unchecked Sendable` sin justificar); dev-metrics grafica volumen/calidad no vacíos de un repo Swift; si se usa Muter, el score es estable (suite no-flaky).

**Fase 7 — Endurecimiento de la librería y documentación (semana 12-15).**
DocC + `swift-docc-plugin` con tutoriales, opt-in al hospedaje del Swift Package Index, API-diff en CI, SemVer + deprecación en 2 pasos. Escribir ADRs 0018-0020 en devground.
→ *Verificación:* DocC se genera y hospeda; API-diff detecta rupturas antes de taggear; los ADRs están en status `proposed` y son citables por el CLI.

**Fase 8 (condicional) — Preparación de portabilidad Android.**
Solo si compartir con Android entra en scope. Auditar que `Domain`/`Networking`/`Persistence`/`FoundationUtils` no importen UIKit/SwiftUI; crear `@devground/swift-portable-core`; piloto con SDK oficial Swift-Android + Skip Fuse **o** exponer el core a un módulo KMP.
→ *Verificación:* el core compila con el SDK oficial de Swift para Android; un piloto de una pantalla corre en Android (Compose real vía Skip Fuse) sin reescribir la lógica.

---

## 7. Decisiones que merecen un ADR

Cada una es una decisión de arquitectura o de proceso que un dev nuevo necesita entender. Van al `knowledge/adr/` del proyecto app (dominio iOS) o al `docs/adr/` de devground (extensión políglota), según corresponda.

**ADRs de la app iOS / librería (dominio):**
1. **Deployment target iOS 17 + Base SDK iOS 26** — con el tradeoff de recorte de mercado (~3%) y la auditoría de Liquid Glass tras recompilar.
2. **Modo de lenguaje Swift 6 con Approachable Concurrency (MainActor por defecto)** — activación deliberada de `SWIFT_VERSION = 6`, isolation por capa, cero `@unchecked Sendable` sin justificar.
3. **`@Observable` sobre `ObservableObject`/Combine** para todo modelo nuevo.
4. **MV/vanilla SwiftUI por defecto; MVVM caso a caso; TCA solo para estado complejo** — criterio de escalado por complejidad, no por dogma.
5. **Modularización por feature en SPM con módulos de interfaz** — límites unidireccionales, inversión de dependencias.
6. **`swift-dependencies` como columna de DI y testabilidad** — inyección tras protocolos, `live`/`preview`/`test`.
7. **Navegación por valores con `enum` tipado + `AppRouter` inyectado** — un solo modelo para in-app y deep links.
8. **Monorepo con un `Package.swift`, distribución por fuente, SemVer estricto** — con la deuda diferida de subtrees para versionado independiente.
9. **Swift Testing como default; XCTest solo para XCUITest y `measure{}`** — con la disciplina de reproducibilidad (dependencias inyectadas).
10. **Build system: SwiftPM ahora, Tuist al escalar, Bazel solo escala extrema** — con umbrales de decisión (build times, tamaño de equipo).
11. **CI/CD: Xcode Cloud vs GitHub Actions + Fastlane Match** — decisión por portabilidad vs fricción.
12. **Tokens semánticos como fuente única de verdad + adopción de Liquid Glass** — prohibición de hex crudos, glass solo en navegación.
13. **Core Swift puro como frontera de portabilidad** — prerrequisito de KMP/Skip; regla de no acoplar dominio a UIKit/SwiftUI.

**ADRs de devground (extensión políglota):**
14. **ADR-0018 — devground políglota: workspace TS + Swift** conviviendo en el mismo `packages/`.
15. **ADR-0019 — isolation por capa como default de las plantillas Swift** (`defaultIsolation(MainActor.self)` en UI, `nonisolated`+`Sendable` en capas base).
16. **ADR-0020 — Swift Testing + `swift-dependencies` como harness estándar** de los repos Swift consumidores.
17. **Detección de stack en `@devground/cli`** — cómo ramifica el scaffolding por presencia de `Package.swift`/`*.xcodeproj`.
18. **(Condicional) Ruta de portabilidad Android: KMP vs SDK Swift-Android + Skip** — decisión por dónde vive el equipo.

---

## 8. Preguntas abiertas (requieren input del usuario)

1. **¿Cuál es la distribución real de versiones de iOS en la base instalada objetivo?** Decide el deployment target definitivo (iOS 17 vs 16). Sin data propia, iOS 17 es la apuesta por defecto.
2. **¿Greenfield o migración de una base Swift 5 existente?** Cambia por completo la estrategia de adopción de strict concurrency (big-bang prohibido; migración por capas si hay legado).
3. **¿Tamaño y experiencia del equipo, y horizonte de mantenimiento?** Es el factor que decide MV vs MVVM vs TCA y SwiftPM vs Tuist más que cualquier benchmark.
4. **¿La app distribuye SDKs binarios a terceros o todo se compila junto?** Determina si se necesita Library Evolution + module stability + XCFramework.
5. **¿Se necesitan APIs exclusivas de iOS 26 (Live Activities avanzadas, Liquid Glass nativo, Foundation Models on-device)?** Si sí, evaluar costo de fallback vs subir el mínimo.
6. **¿El equipo está all-in en el ecosistema Apple (favorece Xcode Cloud) o necesita CI portable (favorece GitHub Actions + Fastlane)?**
7. **¿iPad es target de primera clase?** Cambia el enfoque de size classes, multitarea y layout.
8. **¿Compartir con Android entra en scope, y en qué horizonte?** Define si se activa la Fase 8 y la ruta (KMP Kotlin-first vs SDK Swift-Android + Skip). Si el equipo/código ya es Swift-first, la ruta Skip es la natural, pero es más joven que KMP.
9. **¿Se adopta TCA en algún módulo, o solo `swift-dependencies`/`swift-navigation` como piezas sueltas?** Afecta el acoplamiento de la librería base (TCA 2.0 está en reescritura; la macro estable actual es `@Reducer`).
10. **¿Nivel de rigor de accesibilidad: cumplimiento formal EAA/WCAG 2.1 AA (obligación legal en la UE, ya con litigios) o solo buenas prácticas?** Cambia el testing requerido.
11. **¿La librería base es interna de empresa (favorece registry privado + monorepo) o OSS público (favorece fuente en GitHub + Swift Package Index)?**

---

*Fin del informe-fundación. Verificado a julio de 2026. Los porcentajes de reutilización/ahorro citados en la dimensión Android son estimaciones de industria, no métricas duras; los nombres de API de TCA 2.0 son roadmap anunciado, no estable (la macro vigente es `@Reducer`/`@ObservableState`).*