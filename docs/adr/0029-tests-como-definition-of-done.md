# ADR-0029: Tests como parte de la Definition of Done en spec-flow

- **Estado**: Propuesto
- **Fecha**: 2026-07-24
- **Decisor**: edaza
- **Aplica a**: `@devground/sdd` (skill spec-flow + agentes de orquestación ejecutor/planner/planner-deep); cualquier proyecto que use spec-flow

## Contexto

spec-flow (v0.3) escala la ceremonia por tier (Step 2) pero no decía nada sobre cuándo un cambio está realmente **terminado**. "Done" quedaba implícito en "corre" — el Step 4 ("Implement and verify") mencionaba tests solo como traducción de acceptance criteria, sin exigirlos como condición de cierre. Eso deja abierta la brecha que [ADR-0012](0012-tests-rutas-criticas.md) documentó (rutas críticas sin red de seguridad) y que [ADR-0025](0025-coverage-ratchet.md) instrumentó (ratchet de cobertura + gate en CI): el estándar de tests existía, pero nada en el flujo que genera la mayoría de los cambios (spec-flow) lo hacía explícito por tier.

Con el ratchet de ADR-0025 ya mergeado (`CRITICAL_THRESHOLDS` en `@devground/vitest-config`, `autoUpdate` en el installer de `vitest`, gate `test:coverage` en CI), el enforcement mecánico existe. Falta la pieza de proceso: que el propio brief que produce spec-flow obligue a listar los tests del cambio, y que la telemetría registre si el Definition of Done de tests se cumplió o se difirió — igual que ya se hace con el diferido de preguntas (`assumption_reversed`, ADR-0014).

Piloto de referencia: **Capitalacademy** portó los umbrales críticos de ADR-0012/0025 **inline** en su propio `vitest.config`, en vez de consumir el preset `@devground/vitest-config` vía import. Motivo verificado, no elegido por comodidad: Capitalacademy vive fuera de este monorepo (no es un workspace de pnpm), su instalación usa `--frozen-lockfile` (no resuelve un paquete `@devground/*` que no está en su lockfile), y el patrón `mergeConfig` que un consumo del preset requeriría rompe el `autoUpdate` del ratchet (ADR-0025 ya documentó esta incompatibilidad — `autoUpdate` hace una transformación estática del archivo de config y falla si está envuelto en `mergeConfig`). El umbral inline es la única forma de que un repo externo al monorepo obtenga el mismo estándar sin romper el ratchet.

## Decisión

Spec-flow pasa a v0.4: **los tests son parte del Definition of Done, con el mismo principio de proporcionalidad por tier que ya rige la ceremonia (Step 2)**.

1. **Brief (Step 3)** — la plantilla gana una sección `### Tests` (REQUIRED desde Tier 1), entre "Files & routes to touch" y "Out of scope": cada archivo de test nuevo mapeado a un acceptance criterion; desde Tier 2, un test por escenario Given/When/Then; si el proyecto mide cobertura, se anota el impacto (rutas de dinero/leads/auth al umbral fijo de ADR-0012); si no aplica (docs/chore/style), se declara la razón en una línea.
2. **Implementación (Step 4)** — nuevo sub-bloque "Definition of Done (by tier)": Tier 0 exento (preserva "no artifacts"); Tier 1+ exige test para todo código nuevo (happy path + caso de error/borde); Tier 2+ exige mapeo 1:1 GWT↔test; donde exista medición de cobertura, `test:coverage` queda verde y nunca baja (ADR-0025); excepción explícita para docs/chore/style/config sin lógica ejecutable, declarada en una línea — nunca aplicable a lógica de dinero/leads/auth.
3. **Telemetría (Step 6)** — el evento `spec` gana el campo opcional `"tests":"added"|"updated"|"n/a"|"deferred"`. Registra **cumplimiento del DoD, no un conteo** (git ya cuenta los archivos de test tocados). `"deferred"` es el contrapeso honesto — lógica nueva que quedó sin test — leído junto a los demás gauges (`questions_asked`, `assumption_reversed`) del diseño de medición de [ADR-0014](0014-medicion-impacto-spec-flow.md), nunca aislado. Campo opcional y retrocompatible: un evento sin `tests` sigue parseando (dev-metrics trata el campo ausente como `undefined`).
4. **Agentes de orquestación** — `ejecutor.md` (Sonnet, ejecuta) y `planner.md`/`planner-deep.md` (Opus, planifican Tier 2/3) quedan endurecidos con las mismas reglas: el ejecutor no declara un paso hecho sin su test verde; los planificadores incluyen el test de cada paso con lógica nueva como criterio de verificación, no solo compila/typecheck.
5. **Umbrales portados inline fuera del monorepo** — cuando un proyecto no puede consumir `@devground/vitest-config` (repo fuera del workspace pnpm, `--frozen-lockfile`, o incompatibilidad con `autoUpdate` vía `mergeConfig` — ver ADR-0025), portar los umbrales de ADR-0012/0025 **inline** en su propio config es una implementación válida del estándar, no una desviación. Capitalacademy es el piloto de este patrón.

## Consecuencias

**Positivas**
- Cierra la brecha entre "el estándar de tests existe" (ADR-0012/0025) y "el flujo que genera la mayoría de los cambios lo exige" (spec-flow).
- La señal `tests` da visibilidad temprana de deuda de tests por cambio, sin esperar a que `test:coverage` la detecte en agregado.
- Mismo principio de proporcionalidad que ya gobierna toda la skill (Step 2): no agrega ceremonia a Tier 0, escala con el riesgo real.
- Backward-compatible: eventos viejos sin `tests` siguen parseando; el campo es aditivo.

**Negativas / Trade-offs**
- Un campo más en el brief y en el evento — fricción marginal, mitigada por ser opcional/declarativo (una línea basta para `n/a`).
- `"deferred"` depende de que el agente lo reporte honestamente; no hay enforcement mecánico de ese campo específico (el enforcement mecánico real sigue siendo el gate de CI de ADR-0025, que no puede mentir).
- El patrón de umbral inline (Capitalacademy) duplica configuración que en el monorepo vive centralizada — aceptado porque la alternativa (romper `--frozen-lockfile` o el ratchet) es peor.

## Alternativas consideradas

1. **Solo confiar en el gate de CI (ADR-0025) sin tocar spec-flow**: descartado — el gate mide cobertura agregada al final, no da señal por-cambio ni educa al flujo que genera el código a pensar en tests desde el brief.
2. **Umbral de cobertura obligatorio en el brief mismo (número fijo)**: descartado — repite el error que ADR-0012 ya evitó (umbral global alto → tests de relleno). La sección `### Tests` pide tests con propósito (mapeados a acceptance criteria/GWT), no un porcentaje.
3. **Exigir tests también en Tier 0**: descartado — rompe la promesa "no artifacts" de Tier 0, que es el ancla anti-fricción de toda la skill.
4. **Forzar que Capitalacademy consuma el preset vía workaround (vendoring, symlink)**: descartado — más fragilidad que beneficio; el umbral inline es simple, verificable y no depende de resolver un paquete fuera del lockfile.

## Referencias

- [ADR-0012 — Tests obligatorios en rutas críticas](0012-tests-rutas-criticas.md) (define qué es una ruta crítica y el requisito base).
- [ADR-0025 — Ratchet de cobertura global + gate en CI](0025-coverage-ratchet.md) (implementa el enforcement mecánico que esta ADR asume; documenta la incompatibilidad `autoUpdate`/`mergeConfig` que motiva el patrón inline).
- [ADR-0014 — Medición de impacto de spec-flow](0014-medicion-impacto-spec-flow.md) (diseño de medición donde se lee `tests` junto a `questions_asked`/`assumption_reversed`).
- [ADR-0016 — spec-flow se distribuye como `@devground/sdd`](0016-spec-flow-como-paquete-sdd.md) (empaquetado que este cambio versiona a 0.4).
- `~/.claude/skills/spec-flow/SKILL.md` (Step 3, Step 4, Step 6) y `~/.claude/skills/spec-flow/references/measurement-design.md` §4 — fuente editada por esta decisión.
