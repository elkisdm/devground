# ADR-0011: CI/CD — Xcode Cloud vs GitHub Actions + Fastlane Match (decisión abierta con recomendación)

- **Estado**: Propuesto <!-- decisión abierta: recomendación pendiente de confirmación del usuario -->
- **Fecha**: 2026-07-04
- **Decisor**: edaza
- **Aplica a**: El pipeline de CI/CD del monorepo `swift-foundation` y el app shell (build, test, firma, distribución a TestFlight). Se materializa en Fase 5 del roadmap.

## Contexto

El code signing y el toolchain pinneado son la fuente #1 de fricción en CI iOS (informe §2.3, §5.3). Hay dos caminos maduros, con un tradeoff claro entre fricción y portabilidad:

- **Xcode Cloud**: CI de Apple. Firma **automática**, TestFlight directo, SDK day-one (versiones nuevas de Xcode disponibles el día del release). Mínima fricción si el equipo está all-in en el ecosistema Apple. A cambio, ata el CI a la infraestructura de Apple.
- **GitHub Actions + Fastlane Match**: portable y controlable. **Match** cifra certificados/perfiles en un repo git (nunca `.p12` sueltos). Pero GitHub Actions **no soporta** el automatic code signing de Xcode, así que Match es obligatorio, y los runners de GitHub **retrasan** versiones nuevas de Xcode de **días a semanas según release**.

Regla dura compartida por ambos: **nunca firma manual con `.p12` sueltos.**

Esta es una **pregunta abierta** en las decisiones del usuario (`../../../research/ios-swift-engineering/DECISIONS.md`, §8.6): aún no se ha elegido. El equipo es de 1-2 devs, greenfield, presumiblemente all-in en Apple (usa Xcode 26, publica en App Store). No hay requisito conocido de portabilidad de CI a otra nube ni de integrar el build iOS en un pipeline multi-plataforma existente.

## Decisión

**Decisión abierta.** Se documentan las dos opciones y su tradeoff; la elección definitiva la confirma el usuario antes de Fase 5.

**Recomendación por defecto (no vinculante hasta confirmación): Xcode Cloud.** Para un equipo de 1-2 devs all-in en Apple, la mínima fricción (firma automática, TestFlight directo, SDK day-one) supera el valor de la portabilidad, que hoy no se necesita.

Invariantes que se cumplen **elija lo que elija** el usuario:

- **Cero firma manual** con `.p12` sueltos. Si es Xcode Cloud → firma automática de Apple; si es GitHub Actions → **Fastlane Match** (certificados cifrados en repo), obligatorio porque GitHub Actions no soporta automatic signing.
- **Matriz de simuladores** por versión de iOS soportada (mínimo iOS 17, ver [ADR-0001](0001-deployment-target-ios17-base-sdk-ios26.md)).
- **Toolchain pinneada** (Xcode 26). Con GitHub Actions, asumir el retraso de días-semanas en imágenes con Xcode nuevo.
- **Caché de compilación de Xcode 26** activada en CI ([ADR-0010](0010-build-system-swiftpm-tuist-bazel.md)).
- **Gates de calidad** en CI: SwiftFormat + SwiftLint, Swift Testing, `xccov` como señal ([ADR-0009](0009-swift-testing-default-xctest-acotado.md)).

Cuándo reconsiderar y elegir **GitHub Actions + Fastlane Match** en vez de la recomendación: si aparece necesidad de portabilidad (mover CI fuera de Apple), de integrar el build iOS en un pipeline multi-repo/multi-stack ya existente en GitHub, o de control fino que Xcode Cloud no da.

## Consecuencias

**Positivas**
- El tradeoff queda explícito y las invariantes (cero firma manual, matriz de simuladores, toolchain pinneada) se cumplen sea cual sea la rama elegida.
- La recomendación por defecto (Xcode Cloud) minimiza fricción para el perfil actual (1-2 devs, Apple-first).
- No se bloquea el trabajo previo a Fase 5: la decisión puede confirmarse tarde sin afectar Fases 1-4.

**Negativas / Trade-offs**
- Dejar la decisión abierta posterga trabajo de CI hasta Fase 5. Mitigación: aceptable — CI no es prerrequisito del esqueleto ni de las primeras features.
- **Xcode Cloud** ata el CI a Apple (menos portable, sin control fino). Mitigación: hoy no hay requisito de portabilidad; reconsiderable si aparece.
- **GitHub Actions** paga el retraso de Xcode nuevo (días-semanas) y obliga a mantener Match. Mitigación: solo se asume si se elige esa rama por una necesidad de portabilidad real.

## Alternativas consideradas

1. **Firma manual con `.p12` en el runner**: descartado en ambas ramas. Es la práctica prohibida; frágil e insegura.
2. **Xcode Cloud (recomendado)**: menor fricción para el perfil actual; el costo es el acoplamiento a Apple, hoy sin impacto.
3. **GitHub Actions + Fastlane Match**: portable y controlable; el costo es el retraso de Xcode y el mantenimiento de Match. Se elige solo si la portabilidad entra en scope.
4. **Otro CI (GitLab CI, Bitrise, CircleCI)**: no evaluado en profundidad; el informe acota la decisión a Xcode Cloud vs GitHub Actions. Se puede evaluar si hay una razón concreta, pero no es el eje de la decisión.

## Referencias

- Informe fundacional §2.3 (CI/CD), §8.6 (pregunta abierta CI/CD), §5.3 (`@devground/swift-ci`): `../../../research/ios-swift-engineering/informe-fundacion.md`
- Decisiones del usuario (CI/CD marcado como pregunta abierta; Xcode Cloud como apuesta de menor fricción por defecto): `../../../research/ios-swift-engineering/DECISIONS.md`
- [ADR-0001 — Deployment target iOS 17 (matriz de simuladores)](0001-deployment-target-ios17-base-sdk-ios26.md)
- [ADR-0009 — Swift Testing (gates de CI)](0009-swift-testing-default-xctest-acotado.md)
- [ADR-0010 — Caché de compilación de Xcode 26](0010-build-system-swiftpm-tuist-bazel.md)
