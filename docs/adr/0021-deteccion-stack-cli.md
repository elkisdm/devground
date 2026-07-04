# ADR-0021: Detección de stack en @devground/cli

- **Estado**: Propuesto
- **Fecha**: 2026-07-04
- **Decisor**: edaza
- **Aplica a**: `packages/cli` (`devground-init`)

## Contexto

`devground-init` hoy asume un stack Node/TypeScript/Next.js: detecta Next, instala eslint/prettier/tsconfig/commitlint/husky y escribe `AGENTS.md`. Con la decisión de volver el monorepo políglota ([ADR-0018](0018-devground-poliglota-ts-swift.md)), el CLI debe poder scaffoldear también repos Swift, instalando el set `@devground/swift-*` en vez del set TS.

El motor de scaffolding interactivo ya existe y es reutilizable; lo que falta es que el CLI **sepa qué stack tiene enfrente** para ofrecer el preset correcto sin obligar al usuario a declararlo.

## Decisión

**`devground-init` gana una fase de detección de stack al inicio:**

- Encuentra `Package.swift` o `*.xcodeproj`/`*.xcworkspace` → ofrece el **preset Swift** (`swift-format-config`, `swift-package-template`, `swift-test-harness`, `swift-ci`, …).
- Encuentra `package.json` (con Next u otro) → ofrece el **preset TS** (comportamiento actual).
- Encuentra ambos → ofrece **ambos** presets.
- Ninguno (repo vacío) → pregunta qué stack inicializar.

La detección es una heurística con **override manual** (flag `--stack swift|ts`) para casos híbridos raros. El scaffolding interactivo existente se ramifica por el stack detectado; no se reescribe.

## Consecuencias

**Positivas**
- Un solo comando (`devground-init`) sirve a repos TS y Swift; la UX no se fragmenta.
- Autodetección = menos fricción; el usuario no declara lo que el CLI puede inferir.
- El override por flag cubre los casos donde la heurística no basta.

**Negativas / Trade-offs**
- Más superficie de CLI que mantener y testear (dos ramas de presets). Mitigación: los presets comparten el motor de scaffolding; solo difieren en el catálogo de archivos a copiar.
- La heurística puede confundirse en monorepos híbridos (TS + Swift en subcarpetas). Mitigación: el flag `--stack` y la opción "ambos" cubren el caso.

## Alternativas consideradas

1. **CLI separado `devground-swift-init` (descartada)**: fragmenta la experiencia y duplica el motor de scaffolding. La marca es "un comando", no "un comando por lenguaje".
2. **Flag `--stack` obligatorio sin autodetección (descartada)**: peor DX; el CLI tiene la señal (`Package.swift`/`package.json`) para inferir y solo pedir confirmación.

## Referencias

- [`research/ios-swift-engineering/informe-fundacion.md`](../../research/ios-swift-engineering/informe-fundacion.md) §5.1, §5.4.
- [ADR-0018](0018-devground-poliglota-ts-swift.md) (monorepo políglota), [ADR-0019](0019-isolation-por-capa-swift.md), [ADR-0020](0020-swift-testing-harness-estandar.md) (presets Swift que el CLI instala).
