# ADR-0018: devground políglota — workspace TS + Swift

- **Estado**: Propuesto
- **Fecha**: 2026-07-04
- **Decisor**: edaza
- **Aplica a**: el monorepo (`packages/`, `packages/cli`)

## Contexto

devground es hoy un monorepo pnpm de estándares de desarrollo **TS-first**: configs compartidas (eslint, prettier, tsconfig, commitlint, husky, vitest), más un aparato de proceso de nivel superior (spec-flow, model-orchestrator, knowledge/adr, dev-metrics, deepcheck, agents-md). Surge la necesidad de soportar el desarrollo de apps iPhone en Swift con el mismo rigor.

La investigación fundacional ([`research/ios-swift-engineering/informe-fundacion.md`](../../research/ios-swift-engineering/informe-fundacion.md), §5) verificó que **~60-70% del valor de devground es proceso, y el proceso ya es agnóstico del stack**: spec-flow (intake de cambios), model-orchestrator (routing por complejidad), knowledge/adr (método de decisión) y dev-metrics (git + transcripts) aplican a Swift sin reescribir su núcleo. Lo que falta es el tooling: el equivalente Swift de `eslint-config`/`tsconfig`/`vitest-config`. La pregunta es *dónde* vive ese tooling.

## Decisión

**El monorepo se vuelve políglota: los paquetes `@devground/swift-*` conviven en `packages/` junto a los TS.** No se crea un repo separado.

- Los `swift-*` que son **configs de tooling** (`swift-format-config`, `swift-package-template`, `swift-test-harness`, `swift-design-tokens`, `swift-xcode-scaffold`, `swift-ci`) siguen siendo **paquetes npm** que contienen archivos de configuración Swift (`.swiftlint.yml`, `.swiftformat`, plantillas `Package.swift`, `.xcconfig`, `Fastfile`) que el CLI copia al repo destino. No exigen que el consumidor tenga Node más allá de correr `devground-init`.
- El aparato de proceso agnóstico (spec-flow, model-orchestrator, knowledge/adr, dev-metrics) **no se duplica**: se alimenta con contenido/parsers Swift, no se bifurca.

## Consecuencias

**Positivas**
- Reutiliza el 60-70% del aparato (proceso) sin reescribirlo; el salto a Swift es barato.
- Un solo lugar para los estándares multi-stack: una fuente de verdad, un flujo de changesets, un CI.
- La filosofía "estándares como paquetes, un comando" se mantiene intacta; solo se amplía el catálogo.

**Negativas / Trade-offs**
- El workspace mezcla dos toolchains (Node/pnpm + Swift/SPM); el CI debe correr ambos. Mitigación: los `swift-*` de config son npm puros; solo un eventual core Swift real necesitaría toolchain Swift en CI.
- La CLI debe ramificar por stack (ver [ADR-0021](0021-deteccion-stack-cli.md)).
- Riesgo de que el repo se perciba como "de dos cosas". Mitigación: documentar la frontera en el README y agrupar los `swift-*` por prefijo.

## Alternativas consideradas

1. **Repo separado `devground-swift` (descartada)**: duplicaría el aparato de proceso (spec-flow, model-orchestrator, dev-metrics) o lo dejaría desincronizado. El valor está justamente en reutilizar ese proceso, no en clonarlo.
2. **No soportar Swift (descartada)**: la iniciativa iOS/Swift lo requiere; sin tooling compartido, cada proyecto Swift reconfiguraría desde cero — el problema que devground existe para resolver.

## Referencias

- [`research/ios-swift-engineering/informe-fundacion.md`](../../research/ios-swift-engineering/informe-fundacion.md) §5 (mapeo capacidad → Swift) y §5.4 (devground políglota).
- [`research/ios-swift-engineering/DECISIONS.md`](../../research/ios-swift-engineering/DECISIONS.md).
- [ADR-0016](0016-spec-flow-como-paquete-sdd.md), [ADR-0017](0017-model-orchestrator-routing.md) (aparato de proceso reutilizado).
