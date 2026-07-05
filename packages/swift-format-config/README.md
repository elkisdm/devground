# @devground/swift-format-config

Configuración compartida de **SwiftFormat** (formateo) + **SwiftLint** (validación) para
proyectos Swift/iOS. Es el análogo Swift de `@devground/eslint-config` +
`@devground/prettier-config`. Materializa [ADR-0020](https://github.com/elkisdm/devground/blob/main/docs/adr/0020-swift-testing-harness-estandar.md)
y la política de tamaño de módulo/función del repo.

SwiftFormat y SwiftLint son **complementarios**, no sustitutos: SwiftFormat formatea,
SwiftLint valida (complejidad, tamaño, reglas de estilo).

## Uso

Los artefactos viven en `config/` y se copian a la raíz de tu repo Swift:

| Origen (en el paquete) | Destino (tu repo) |
| --- | --- |
| `config/swiftformat` | `.swiftformat` |
| `config/swiftlint.yml` | `.swiftlint.yml` |

El manifest `index.json` declara ese mapeo para que el instalador del CLI de devground
lo copie automáticamente (ver [ADR-0021](https://github.com/elkisdm/devground/blob/main/docs/adr/0021-deteccion-stack-cli.md)).
Copia manual mientras tanto:

```bash
cp node_modules/@devground/swift-format-config/config/swiftformat  .swiftformat
cp node_modules/@devground/swift-format-config/config/swiftlint.yml .swiftlint.yml
```

Requiere tener instalados `swiftformat` y `swiftlint` (p. ej. vía Homebrew).

## Estado

Pre-estable (`0.0.0`) — sigue a los ADRs de devground políglota, aún en estado *Propuesto*.
