# ADR-0047: Retiro de paquetes sin consumidores

- **Estado**: Aceptado
- **Fecha**: 2026-11-05
- **Decisor**: edaza
- **Aplica a**: `@devground/chile-formats`, `@devground/design-taste`, `@devground/swift-ci`, `@devground/swift-design-tokens`, `@devground/swift-format-config`, `@devground/swift-package-template`
- **Reemplaza**: [ADR-0018](0018-devground-poliglota-ts-swift.md), [ADR-0019](0019-isolation-por-capa-swift.md), [ADR-0020](0020-swift-testing-harness-estandar.md) en lo que toca a los paquetes Swift
- **Extiende**: [ADR-0032](0032-veredictos-experimentales.md) (veredictos experimentales)

## Contexto

ADR-0032 congeló estos seis paquetes el 2026-09-07 por no tener consumidores. Dos meses
después siguen igual: ningún paquete, el CLI, los workflows ni un proyecto conocido los usa,
y no tuvieron cambios reales desde el congelamiento. Seguir en el monorepo cuesta
mantenimiento (actualizaciones de dependencias, CI, conteos en el README que ya no
cuadraban) y confunde sobre qué es el estándar.

Los ADR de Swift (0018–0020) describían además dos paquetes que nunca existieron
(`swift-test-harness`, `swift-xcode-scaffold`).

## Decisión

**Retirar los seis paquetes del monorepo y marcarlos como obsoletos en npm.**

1. Se borran sus carpetas de `packages/` y toda referencia viva (workspace, CI, Dependabot,
   docs de uso). Los documentos históricos (`docs/releases/`, `docs/deepcheck/`, `research/`)
   no se editan.
2. Después del merge, se corre `npm deprecate` sobre cada paquete publicado con el mensaje
   «Retirado: sin consumidores (ADR-0047)». Las versiones publicadas siguen instalables.
3. Los ADR 0018–0020 pasan a «Reemplazado por ADR-0047». La investigación de
   `research/ios-swift-engineering/` y `swift-foundation/` quedan como registro; si un
   proyecto Swift real aparece, se vuelve a decidir desde ahí.
4. **Regla a futuro**: un paquete congelado que cumple 60 días sin consumidores se retira con
   este mismo procedimiento, sin esperar otra revisión.

## Consecuencias

**Positivas**

- Menos superficie que mantener y actualizar (ADR-0045).
- El README y el índice de paquetes dicen la verdad.

**Negativas / Trade-offs**

- Si alguien externo usaba un paquete, verá el aviso de obsoleto. Mitigación: la versión
  publicada sigue disponible y el código queda en el historial de git.

## Alternativas consideradas

1. **Mantenerlos congelados**: costo de mantenimiento sin beneficio medible.
2. **Moverlos a otro repositorio**: mismo costo, en otro lugar.

## Referencias

- [ADR-0032](0032-veredictos-experimentales.md), [ADR-0033](0033-salida-de-consolidacion.md)
