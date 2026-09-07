# ADR-0032: Veredicto de los 11 experimentales al cierre del ciclo de 8 semanas

- **Estado**: Aceptado
- **Fecha**: 2026-09-07
- **Decisor**: edaza
- **Aplica a**: `packages/{logger,ui-conventions,deepcheck,chile-formats,dreaming,design-taste,swift-ci,swift-design-tokens,swift-format-config,swift-package-template}/`, `tools/model-orchestrator/`

## Contexto

[ADR-0026](0026-declarar-nucleo-soportado.md) §2 le dio a cada paquete experimental un ciclo de
**8 semanas** para acumular evidencia de uso, con un veredicto obligatorio al cierre: **gradúa**
(entra al núcleo soportado, con tests y semver estricto) o **se congela** (estado visible en su
README, sin mantenimiento activo, reactivable con un ADR nuevo — nunca se borra).

El ciclo abrió el 2026-07-13 y **vence el 2026-09-07**. Ningún paquete recibió veredicto en el
plazo, y mientras tanto la regla "no entra ningún experimental nuevo mientras haya experimentales
sin veredicto" bloqueó de hecho toda expansión del repo durante ocho semanas.

La evidencia se midió el 2026-09-07 con tres señales independientes: descargas npm del último mes,
días desde el último commit al paquete, y consumidores reales dentro y fuera del monorepo.

**Calibración obligatoria de la señal de descargas**: el piso de ruido de npm (mirrors y bots) es
**22-28 descargas/mes** — lo confirman cuatro paquetes sin ningún consumidor conocido
(`ui-conventions` 22, `logger` 24, `design-taste` 25, `swift-package-template` 23). Una cifra en ese
rango significa "sin señal", no "sin uso": un paquete que entra como **dependencia transitiva** de
otro no genera descargas propias atribuibles. Por eso la señal decisoria es **quién lo consume**,
verificado en el código, y las descargas solo desempatan.

## Decisión

Emitir los 11 veredictos. **Gradúan 3, se congelan 8.** La superficie mantenida baja de 23 a 15
paquetes.

### Gradúan

| Paquete | Razón verificada |
| --- | --- |
| `@devground/logger` | Consumido por `packages/cli`, `packages/dev-metrics` y `packages/dreaming`. Sus 24 descargas son ruido porque entra como dependencia transitiva: es infraestructura del núcleo, no un experimental. |
| `@devground/ui-conventions` | Cableado al núcleo: `packages/cli/src/installers/ui-conventions.ts` lo instala en proyectos React/Next, con caso cubierto en `installers.test.ts`. Un experimental que el CLI ya instala no es un experimental. |
| `@devground/deepcheck` | Uso real verificado: la auditoría del monorepo de julio 2026 (38 hallazgos confirmados, 7 workstreams remediados). Gradúa **como paquete interno** — `private: true` se mantiene, no se publica a npm. |

Graduar implica el compromiso del núcleo (ADR-0026 §1): tests para todo cambio de comportamiento y
semver estricto. `logger` y `ui-conventions` tienen **0 tests** hoy; la graduación no se considera
efectiva hasta que los tengan, y ese trabajo entra con este ADR.

### Se congelan

| Paquete | Descargas | Días sin tocar | Consumidores |
| --- | --- | --- | --- |
| `@devground/chile-formats` | 63 | 57 | ninguno (solo referenciado en prosa por `ui-conventions` §6) |
| `@devground/dreaming` | 46 | 54 | ninguno |
| `@devground/design-taste` | 25 | 54 | ninguno; además es un vendorizado de terceros (`Leonxlnx/taste-skill`) |
| `model-orchestrator` | n/a | — | **0 invocaciones medidas** en telemetría real de spec-flow |
| `@devground/swift-ci` | 27 | 64 | ninguno |
| `@devground/swift-design-tokens` | 28 | 64 | ninguno |
| `@devground/swift-format-config` | 27 | 64 | ninguno |
| `@devground/swift-package-template` | 23 | 64 | ninguno |

`chile-formats` es el congelado más incómodo: tiene 3 tests y resuelve un problema real (RUT,
teléfono y UF chilenos, que aplican a casi todos los proyectos del autor). Se congela igual porque
**ningún repo lo consume**, y el criterio del ADR-0026 es evidencia de uso, no utilidad potencial.
Es el primer candidato a reactivar en cuanto un proyecto lo importe.

La familia `swift-*` se congela **en bloque**: los cuatro paquetes comparten fecha (2026-07-05),
tienen 0 tests y ningún consumidor. El monorepo `swift-foundation/` y su investigación en
`research/ios-swift-engineering/` **no se congelan** — no son paquetes npm, son un consumidor.

### Convención de estado "Congelado"

Un paquete congelado lleva, como primer bloque de su `README.md` justo debajo del título:

```markdown
> [!WARNING]
> **Estado: Congelado** (ADR-0032, 2026-09-07). Sin mantenimiento activo: no recibe
> features ni actualizaciones de dependencias. Lo publicado sigue funcionando y nada se
> borra. Reactivable con un ADR nuevo — basta con que un proyecto lo consuma.
```

Y `"devground": { "status": "frozen" }` en su `package.json`, para que la convención sea legible
por herramientas y no solo por humanos.

## Consecuencias

**Positivas**

- Se cumple el compromiso del ADR-0026 en su fecha, en vez de dejar el ciclo vencer en silencio.
- La superficie que exige mantenimiento activo baja **de 23 a 15 paquetes** (−35%), con un único
  mantenedor. Es el objetivo declarado de la fase de consolidación.
- Desbloquea la expansión: con los 11 veredictos emitidos, la cláusula "no entra ningún experimental
  nuevo" deja de aplicar (ver [ADR-0033](0033-salida-de-consolidacion.md)).
- El estado queda legible por máquina (`devground.status`), no solo en prosa.

**Negativas / Trade-offs**

- Congelar `chile-formats` deja sin mantenimiento un paquete con tests y valor real. Aceptado: el
  criterio es uso medido, y aplicarlo con excepciones lo vuelve inútil.
- La familia `swift-*` se congela con `swift-foundation` todavía activo como investigación. Si el
  trabajo iOS se retoma, hay que descongelar cuatro paquetes con un ADR — fricción deliberada.
- Graduar `logger` y `ui-conventions` obliga a escribir los tests que hoy no tienen: trabajo real que
  no existiría si se hubieran congelado.

## Alternativas consideradas

1. **Congelar los 11 y dejar el núcleo en 12 paquetes**: descartado — `logger` y `ui-conventions`
   tienen consumidores dentro del propio monorepo; congelar algo que el CLI instala en cada proyecto
   React sería declarar sin mantenimiento a un componente del camino crítico.
2. **Graduar todo lo que tenga tests** (`dreaming` 5, `chile-formats` 3): descartado — tener tests es
   condición para graduar, no razón. El criterio del ADR-0026 es evidencia de **uso**.
3. **Extender el ciclo otras 8 semanas**: descartado — es exactamente la deriva que el ADR-0026 vino
   a frenar. Un plazo que se extiende cuando vence no es un plazo.
4. **Borrar los congelados**: descartado y prohibido por el ADR-0026 §2 — congelar nunca es borrar.
