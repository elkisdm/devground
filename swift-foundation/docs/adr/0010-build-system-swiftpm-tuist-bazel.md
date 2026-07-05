# ADR-0010: Build system SwiftPM ahora, Tuist al escalar, Bazel solo a escala extrema

- **Estado**: Propuesto
- **Fecha**: 2026-07-04
- **Decisor**: edaza
- **Aplica a**: El build system del monorepo `swift-foundation` y la decisión de cuándo (no) migrar a otra herramienta.

## Contexto

Hay tres build systems viables para un proyecto iOS modular en 2026, en orden creciente de potencia y costo:

- **SwiftPM**: nativo, cero configuración extra, modulariza por feature gratis. Xcode 26 sumó **caché de compilación nativa** sobre LLVM CAS (`COMPILATION_CACHE_ENABLE_CACHING=YES`, remoto vía `COMPILATION_CACHE_REMOTE_SERVICE_PATH`).
- **Tuist**: te quedas en Xcode pero ganas **caché remoto + selective testing**. Mastodon reportó ~69% de mejora con caché remoto vs ~30% con SwiftPM puro. Su valor aparece cuando los build times o el `.xcodeproj` duelen.
- **Bazel**: caché hermético y selective testing a escala masiva. Casos iOS documentados: Grab (200+ ingenieros, 2.5M LOC, 700+ targets), Spotify (CI de 80→20 min), Lyft, Tinder. Alto costo de setup y mantenimiento.

El proyecto es greenfield, 1-2 devs, sin build times que duelan ni equipo grande (`../../../research/ios-swift-engineering/DECISIONS.md`). Adoptar Tuist o Bazel ahora sería resolver un problema que no existe: sobre-ingeniería. Pero la decisión debe declarar los **umbrales** que dispararían el cambio, para no quedar atrapados en SwiftPM si el proyecto crece.

## Decisión

**SwiftPM como build system, con caché nativa de Xcode 26 activada. Tuist y Bazel quedan como escalones futuros con umbrales explícitos.**

- **Ahora: SwiftPM puro.** Un `Package.swift`, modularización por feature ([ADR-0005](0005-modularizacion-por-feature-spm-interfaces.md)). Activar la caché de compilación nativa de Xcode 26 (`COMPILATION_CACHE_ENABLE_CACHING=YES`; remoto con `COMPILATION_CACHE_REMOTE_SERVICE_PATH` cuando haya CI que lo aproveche).
- **Umbral → Tuist**: cuando los **build times** o la gestión del `.xcodeproj` **duelan** de forma medible (p. ej. CI supera ~10 min de forma sostenida y la caché nativa no basta, o el manejo de esquemas/targets se vuelve fricción). Tuist mantiene Xcode y suma caché remoto + selective testing.
- **Umbral → Bazel**: **solo escala extrema** (equipos de decenas/cientos de ingenieros, millones de LOC, cientos de targets, CI que necesita hermeticidad). Para 1-2 devs nunca; es la definición de sobre-ingeniería fuera de esa escala.
- La decisión se **revisa por señal medida** (tiempo de build/CI, tamaño de equipo), no por anticipación.

## Consecuencias

**Positivas**
- Cero configuración de build extra: SwiftPM es nativo y modulariza por feature sin herramienta añadida.
- La caché nativa de Xcode 26 da una mejora de build sin adoptar Tuist.
- Umbrales explícitos evitan tanto la sobre-ingeniería (Bazel prematuro) como quedar atrapados (saber cuándo subir a Tuist).

**Negativas / Trade-offs**
- SwiftPM puro rinde menos en caché que Tuist (~30% vs ~69% en el caso Mastodon). Mitigación: irrelevante a esta escala; la caché nativa de Xcode 26 cubre el hueco hasta que el umbral se cruce.
- Migrar a Tuist más tarde tiene un costo de adopción (introducir manifiestos Tuist). Mitigación: es un costo diferido y solo se paga si el proyecto realmente crece; la modularización por feature ya existente facilita esa migración.
- Los umbrales ("duelan", "~10 min") son parcialmente subjetivos. Mitigación: se anclan a métricas observables (tiempo de CI, fricción de esquemas), revisables en un ADR nuevo cuando se crucen.

## Alternativas consideradas

1. **Tuist desde el día 1**: descartado. No hay build times ni tamaño de `.xcodeproj` que lo justifiquen para 1-2 devs; añade manifiestos y mantenimiento sin retorno hoy.
2. **Bazel desde el día 1**: descartado con contundencia. Es sobre-ingeniería sin escala real (los casos de éxito son Grab/Spotify/Lyft/Tinder, no proyectos de 1-2 devs).
3. **SwiftPM sin activar la caché nativa**: descartado. Dejar la caché de Xcode 26 apagada renuncia a una mejora gratis de build.

## Referencias

- Informe fundacional §2.3 (build/modularización, con datos de Mastodon/Grab/Spotify), §3 (tabla de stack), §4.9: `../../../research/ios-swift-engineering/informe-fundacion.md`
- Decisiones del usuario (SwiftPM puro + caché nativa; Tuist/Bazel descartados): `../../../research/ios-swift-engineering/DECISIONS.md`
- [ADR-0005 — Modularización por feature en SPM](0005-modularizacion-por-feature-spm-interfaces.md)
- [ADR-0008 — Monorepo, un Package.swift](0008-monorepo-package-swift-distribucion-fuente-semver.md)
- Xcode 26 compilation cache (`COMPILATION_CACHE_ENABLE_CACHING`, LLVM CAS)
