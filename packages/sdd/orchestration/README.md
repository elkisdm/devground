# Orquestación — regla dura de Fable/Opus como advisor

Capa instalable de `@devground/sdd` que versiona la regla dura de orquestación de
sesiones interactivas: cuando el modelo de sesión es Fable/Mythos/Opus, actúa como
**advisor/orquestador** y NO ejecuta cambios directamente — delega en subagentes según
el tier de la petición. Ver [ADR-0027](../../../docs/adr/0027-empaquetar-regla-de-orquestacion.md)
(sucede a [ADR-0022](../../../docs/adr/0022-jerarquia-de-orquestacion.md)).

**La fuente de verdad son los archivos vivos en `~/.claude`.** Este directorio es su
**mirror versionado** — se actualiza con `sync-orchestration.mjs`, nunca a mano.

## Las 5 piezas

| Pieza | Rol |
|---|---|
| `scripts/orchestrator-gate.sh` | Hook `PreToolUse`. Enforcement: si el modelo de sesión es orquestador, deniega `Edit`/`Write`/`NotebookEdit`, Bash mutante y MCP mutante en el main loop (con allowlist administrativa de un solo comando y excepción para `~/.claude/` y el scratchpad). Los subagentes nunca son bloqueados. |
| `scripts/orchestrator-context.sh` | Hook `UserPromptSubmit`. Activación: si el modelo de sesión es orquestador, inyecta el contexto de la regla y el modelo de tiers en cada turno; en Sonnet/Haiku queda en silencio. |
| `agents/ejecutor.md` | Subagente Sonnet. Implementa un plan o brief ya recibido — edits, comandos mutantes, tests, commits. |
| `agents/planner.md` | Subagente Opus, esfuerzo `high`. Diseña la implementación de un cambio Tier 2: archivos a tocar, riesgos, criterios de verificación. Solo lectura. |
| `agents/planner-deep.md` | Subagente Opus, esfuerzo `xhigh`. Igual que `planner` pero para Tier 3 o riesgo alto (migraciones, cambios irreversibles, contratos externos, seguridad, cambios que cruzan varios módulos). Solo lectura. |

## Modelo de tiers

| Tier | Ruteo |
|---|---|
| 0 (typo, chore trivial) | Directo a `Agent(subagent_type=ejecutor, model haiku)`, sin ceremonia. |
| 1 (cambio pequeño, ~1-3 archivos, bajo riesgo) | Sin planner: el orquestador explora lo mínimo, escribe un brief autocontenido (rutas exactas + fragmentos relevantes inline) y delega en `Agent(subagent_type=ejecutor, Sonnet)`. |
| 2 | `Agent(subagent_type=planner, Opus effort high)` produce el plan, luego `ejecutor` lo implementa. |
| 3 / riesgo alto | `Agent(subagent_type=planner-deep, Opus effort xhigh)` produce el plan, luego `ejecutor` lo implementa. |

En sesiones Sonnet/Haiku como modelo de sesión, no aplica el gate: se procede directo.

## Instalación

> **Opt-in, desactivado por defecto.** Instalar `@devground/sdd` NO activa esta capa:
> `npx @devground/sdd` solo instala la skill spec-flow. Esta capa requiere ejecutar su
> propio installer Y pegar a mano el bloque de hooks — dos actos deliberados. Antes de
> activarla, lee las consecuencias medidas en
> [ADR-0028](../../../docs/adr/0028-orquestacion-opt-in-desactivada-por-defecto.md).

```bash
npx -p @devground/sdd devground-orchestration
```

Copia `scripts/` y `agents/` a `~/.claude/scripts` y `~/.claude/agents` (guarded: nunca
sobrescribe un archivo existente). `settings.hooks.json` y `CLAUDE.rule.md` son
**extractos de merge**, no archivos standalone — el installer imprime dónde vive cada
snippet para que los pegues a mano en `~/.claude/settings.json` (clave `"hooks"`) y en
tu `CLAUDE.md` (sección `## Rules`).

## Sync

Cuando edites los archivos vivos en `~/.claude`, sincroniza el mirror versionado:

```bash
pnpm --filter @devground/sdd sync:orchestration
```

`settings.hooks.json` y `CLAUDE.rule.md` no se tocan con el sync — son extractos que se
mantienen a mano.

## Bypass

Por sesión, con conocimiento del usuario: `CLAUDE_ORCHESTRATOR_GATE=off`.

## Tests

```bash
pnpm --filter @devground/sdd test
```

Pipe-tests herméticos de `orchestrator-gate.sh` y `orchestrator-context.sh` en
`test/gate.test.sh` — no dependen de `~/.claude/settings.json`.

## Estado medido (2026-07-22)

Medición sobre 678 sesiones reales (ver [ADR-0028](../../../docs/adr/0028-orquestacion-opt-in-desactivada-por-defecto.md)):

| Señal | Resultado |
|---|---|
| Delegación a subagentes | 53% → 92% de las sesiones |
| Costo por turno de usuario | $8,23 → $9,04 (+10%, sin ahorro demostrable) |
| Invocaciones de spec-flow | 173 → 7 (el hook de contexto la desplaza) |
| Denials del gate | 314, en 62% de las sesiones |

Defectos conocidos abiertos, a resolver antes de recomendar la activación:

1. `orchestrator-gate.sh` deniega **cualquier** comando Bash que contenga `>`, sin validar
   el destino de la redirección. La validación de rutas contra el scratchpad solo existe
   para `rm/mv/cp/mkdir/touch/chmod`. Es la mayor fuente de falsos positivos (195 de los
   314 denials fueron Bash).
2. `orchestrator-context.sh` menciona `spec-flow` solo como paréntesis dentro de una
   instrucción imperativa de ruteo por tier; en la práctica la desplaza.
3. Tier 0-1 no rentabiliza la delegación: el brief más el re-descubrimiento del repo por
   parte del ejecutor cuestan más que el cambio.
