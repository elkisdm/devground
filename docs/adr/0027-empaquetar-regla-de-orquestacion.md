# ADR-0027: Empaquetar la regla de orquestación en `@devground/sdd`

- **Estado**: Propuesto
- **Fecha**: 2026-07-13
- **Decisor**: edaza
- **Aplica a**: `@devground/sdd`, flujo de trabajo con agentes en Claude Code (regla dura de orquestación)

## Contexto

[ADR-0022](0022-jerarquia-de-orquestacion.md) documentó la jerarquía de orquestación
(hooks de Claude Code + subagentes planner/ejecutor vs. `model-orchestrator`), pero
describía solo planner + ejecutor. Desde entonces la regla se amplió en la práctica a
5 artefactos vivos y un modelo de tiers completo:

- **2 hooks**: `orchestrator-gate.sh` (`PreToolUse`, enforcement — deniega Edit/Write/
  NotebookEdit y Bash/MCP mutante en el main loop cuando el modelo de sesión es
  Fable/Mythos/Opus) y `orchestrator-context.sh` (`UserPromptSubmit`, activación —
  inyecta el contexto de la regla en cada turno orquestador).
- **3 agentes**: `planner` (Opus, esfuerzo high, Tier 2), `planner-deep` (Opus, esfuerzo
  xhigh, Tier 3/riesgo alto) y `ejecutor` (Sonnet, implementa el plan o brief).
- **Modelo de tiers 0-3**: Tier 0 directo a ejecutor sin ceremonia; Tier 1 sin planner
  con brief autocontenido del orquestador; Tier 2 vía `planner`; Tier 3/riesgo alto vía
  `planner-deep`.

Todo esto vive únicamente en `~/.claude` de una sola máquina, sin versionar en git. Es
bus factor 1: si esa máquina se pierde o cambia, la regla dura desaparece sin dejar
rastro reproducible. Un equipo interno reducido ya está adoptando el toolkit
([ADR-0026](0026-fase-de-consolidacion-nucleo-soportado.md) §4 declara explícitamente
que "al menos una persona del equipo además del mantenedor ejecuta el ritual completo" y
que "cada paquete del núcleo declara un segundo owner nominal" — la regla de
orquestación necesita el mismo tratamiento de reproducibilidad).

## Decisión

Versionar los 5 artefactos vivos más sus dos extractos de merge (registro de hooks de
`settings.json` y el párrafo de `CLAUDE.md`) como una **capa instalable dentro de
`@devground/sdd`** (no un paquete nuevo — ver Alternativas), en `packages/sdd/orchestration/`:

- `scripts/orchestrator-gate.sh`, `scripts/orchestrator-context.sh` — copia verbatim.
- `agents/planner.md`, `agents/planner-deep.md`, `agents/ejecutor.md` — copia verbatim.
- `settings.hooks.json` — el bloque `"hooks"` para `PreToolUse`/`UserPromptSubmit`.
- `CLAUDE.rule.md` — el párrafo de la regla para la sección `## Rules`.
- `test/gate.test.sh` — pipe-tests herméticos de los dos hooks.

**Fuente de verdad = los archivos vivos en `~/.claude`.** El directorio `orchestration/`
es su mirror versionado, actualizado con `pnpm --filter @devground/sdd sync:orchestration`
(gemelo de `sync-spec-flow.mjs`, mismo patrón que ADR-0016).

**Instalación**: `npx -p @devground/sdd devground-orchestration` copia los archivos
standalone (`scripts/`, `agents/`) de forma guarded (nunca sobrescribe) y **imprime**
los snippets de `settings.hooks.json`/`CLAUDE.rule.md` para merge manual — `settings.json`
y `CLAUDE.md` son archivos de merge del usuario, no se pueden sobrescribir a ciegas.

Se publica como **minor** (1.0.0 → 1.1.0) vía changeset: es aditivo, no rompe el API
existente de `@devground/sdd` (`devground-sdd`, `skill/`).

## Consecuencias

**Positivas**
- Elimina el bus factor 1 de la regla dura de orquestación — ejecuta el compromiso de
  [ADR-0026](0026-fase-de-consolidacion-nucleo-soportado.md) §4.
- Instalación reproducible en cualquier máquina/miembro del equipo: `npx -p
  @devground/sdd devground-orchestration`.
- El modelo de tiers completo (0-3) queda documentado en un solo lugar versionado, no
  solo en la memoria del mantenedor.

**Negativas / Trade-offs**
- Doble fuente: los archivos vivos en `~/.claude` y el mirror en el repo pueden divergir
  entre sincronizaciones. Mitigación: `sync-orchestration.mjs` hace la sincronización un
  acto explícito y barato (mismo patrón ya validado por `sync-spec-flow.mjs`).
- `settings.hooks.json` y `CLAUDE.rule.md` no se pueden instalar automáticamente (son
  archivos de merge del usuario) — la instalación completa requiere un paso manual.
  Mitigación: el installer imprime exactamente qué pegar y dónde.

## Alternativas consideradas

1. **Paquete experimental nuevo** (`@devground/orchestration`): descartada.
   [ADR-0026](0026-fase-de-consolidacion-nucleo-soportado.md) §2-§3 congela la entrada de
   experimentales nuevos durante la fase de consolidación; la regla de orquestación es
   dominio natural de `@devground/sdd` ([ADR-0016](0016-spec-flow-como-paquete-sdd.md)),
   no justifica un paquete separado.
2. **Solo documentación, sin installer**: descartada. No reproduce la instalación real
   (hooks + agentes en las rutas exactas que Claude Code espera); un equipo nuevo tendría
   que copiar archivos a mano sin garantía de no pisar su propia configuración.
3. **Editar ADR-0022 en vez de suceder**: descartada. Los ADR de este repo son inmutables
   una vez Aceptados (ver convención en `docs/adr/README.md`); un cambio de decisión
   requiere un ADR nuevo que lo suceda explícitamente.

## Referencias

- [ADR-0022 — Jerarquía de orquestación de agentes en sesiones interactivas](0022-jerarquia-de-orquestacion.md) (sucedido por este ADR)
- [ADR-0026 — Declarar el núcleo soportado y entrar en fase de consolidación](0026-fase-de-consolidacion-nucleo-soportado.md) (§3 vara de entrada, §4 bus factor)
- [ADR-0016 — spec-flow se distribuye como `@devground/sdd`](0016-spec-flow-como-paquete-sdd.md) (dominio del paquete, patrón installer + sync)
- [ADR-0002 — Changesets para versionado y publicación](0002-changesets-versioning.md) (minor vía changeset)
