# ADR-0026: Declarar el núcleo soportado y entrar en fase de consolidación

- **Estado**: Propuesto
- **Fecha**: 2026-07-13
- **Decisor**: edaza
- **Aplica a**: todo el monorepo (alcance de paquetes, versionado, criterio de entrada de trabajo nuevo)

## Contexto

En 9 semanas el repo pasó de presets de configuración a 23 paquetes, y el 40% de la
historia (43 de 110 commits) se concentró en la última semana abriendo cinco frentes a la
vez: deepcheck, dreaming, design-taste, ui-conventions y soporte Astro. Mientras tanto, un
equipo interno reducido empezó a adoptar el toolkit con buenos resultados — y eso cambia el
costo de romper algo: ya no es un laboratorio personal, hay gente que depende de esto.

El estado actual no acompaña esa dependencia:

- **Solo 6 de 23 paquetes tienen tests**, y los dos con más lógica y uso real
  (`@devground/dev-metrics`, `@devground/sdd`) siguen en `0.x`, que en semver significa
  "puede romperse sin aviso".
- **La documentación ya derivó**: el README afirmaba que ningún experimental se publicaba
  a npm mientras `@devground/dreaming` 0.1.0 estaba en el registro, y la tabla de paquetes
  listaba 19 de 23. (Corregido junto a este ADR, pero la deriva es el síntoma: la
  documentación va un paso detrás del código cuando cada semana abre un frente nuevo.)
- **Los experimentales se acumulan sin veredicto**: deepcheck, dreaming,
  model-orchestrator, ui-conventions, design-taste y la familia Swift conviven sin criterio
  explícito de cuándo graduar, mantener o congelar cada uno.

Sin una regla, la semana de 43 commits se repite: la superficie de mantenimiento crece más
rápido que su validación, con un solo mantenedor (85 de 91 commits humanos) como único
punto de falla.

## Decisión

Entrar en **fase de consolidación**: el trabajo se dirige a estabilizar lo que existe, no a
ampliarlo. En concreto:

1. **Núcleo soportado.** Lo forman los 7 presets de config (`prettier-config`,
   `eslint-config`, `tsconfig`, `commitlint-config`, `lint-staged-config`, `husky-config`,
   `agents-md`), el agregador `@devground/devground`, el CLI `devground-init`,
   `@devground/dev-metrics` y `@devground/sdd`. Compromisos del núcleo: **semver estricto**
   (breaking change ⇒ major), tests para todo cambio de comportamiento, y ningún paquete
   del núcleo por debajo de `1.0`. `dev-metrics` y `sdd` se promueven a `1.0.0` vía
   changesets junto a este ADR — el bump declara la API estable tal como está.

2. **Criterio de graduación para experimentales.** Cada experimental (deepcheck, dreaming,
   model-orchestrator, ui-conventions, design-taste, familia `swift-*`) tiene un ciclo de
   **8 semanas** para acumular evidencia de uso interno — corridas registradas, fricción
   capturada como issues, o señal en dev-metrics. Al cierre del ciclo, un veredicto por
   paquete: **gradúa** (entra a la tabla de soportados con tests y semver) o **se congela**
   (estado "Congelado" visible en su README, sin mantenimiento activo; reactivable con un
   ADR nuevo, nunca se borra). No entra ningún experimental nuevo mientras haya
   experimentales sin veredicto.

3. **Vara de entrada.** Durante esta fase, un cambio entra solo si **arregla, testea,
   documenta o gradúa algo que ya existe**. El roadmap de expansión (github-actions,
   vscode-settings, presets nuevos) queda congelado en el README.

4. **Bus factor.** Al menos una persona del equipo además del mantenedor ejecuta el ritual
   completo de release (changeset → PR "Version Packages" → merge → publish) de principio a
   fin, y cada paquete del núcleo declara un segundo owner nominal.

La fase termina cuando los experimentales tienen veredicto y el ritual de release lo ha
ejecutado más de una persona; salir de ella (reabrir expansión) se decide en un ADR nuevo.

## Consecuencias

**Positivas**
- El equipo que adopta puede depender del núcleo sin sorpresas: `1.0` + semver estricto
  convierte "no debería romperse" en un contrato verificable en cada release.
- Los experimentales dejan de acumularse: cada uno tiene fecha y veredicto, y el costo de
  mantenimiento queda acotado a lo que demostró uso.
- La documentación vuelve a ser confiable como interfaz: menos frentes simultáneos, menos
  deriva.

**Negativas / Trade-offs**
- La velocidad de capacidades nuevas cae deliberadamente. Es el punto — pero si aparece una
  necesidad real del equipo, compite como graduación o espera a la salida de la fase.
- `1.0` compromete APIs que pueden resultar mal diseñadas. Mitigación: con changesets un
  major es barato (ADR-0002); comprometerse tarde tiene el costo opuesto y mayor — el
  equipo construyendo sobre arena.
- Congelar puede matar momentum de un experimento prometedor. Mitigación: congelado no es
  borrado; el código y su ADR quedan, y reactivar cuesta un ADR, no una reescritura.

## Alternativas consideradas

1. **No hacer nada (seguir expandiendo)**: descartada — la superficie ya crece más rápido
   que su validación, y ahora hay un equipo dependiendo de paquetes `0.x` sin contrato.
2. **Separar el repo en `core` + `lab`**: descartada — duplica infra (CI, changesets,
   releases) para un equipo de este tamaño; la separación lógica (tabla de soportados vs
   sección Experimental + este criterio) compra lo mismo sin el costo.
3. **Congelar todos los experimentales ya**: descartada — hay uso interno activo (deepcheck
   nació auditando el propio CLI y cazó bugs reales); merecen el ciclo de evidencia antes
   del veredicto, no una congelación a ciegas.

## Referencias

- [ADR-0002 — Changesets para versionado y publicación](0002-changesets-versioning.md) (hace barato el compromiso semver)
- [ADR-0006 — dev-metrics](0006-dev-metrics.md) y [ADR-0014 — Medición de impacto de spec-flow](0014-medicion-impacto-spec-flow.md) (la evidencia de uso se mide con herramientas propias)
- [ADR-0013 — deepcheck](0013-sistema-de-agentes-de-auditoria.md), [ADR-0016 — sdd](0016-spec-flow-como-paquete-sdd.md), [ADR-0022 — Jerarquía de orquestación](0022-jerarquia-de-orquestacion.md) (los experimentales y su dominio)
- [ADR-0018 — devground políglota](0018-devground-poliglota-ts-swift.md) (la familia Swift entra al ciclo de evidencia como el resto)
