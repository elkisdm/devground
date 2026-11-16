# Orquestación — regla dura de Fable/Opus como advisor

Capa instalable de `@devground/sdd` que versiona la regla dura de orquestación de
sesiones interactivas: cuando el modelo de sesión es Fable/Mythos/Opus, actúa como
**advisor/orquestador** y NO ejecuta cambios directamente — delega en subagentes según
el tier de la petición. Ver [ADR-0027](../../../docs/adr/0027-empaquetar-regla-de-orquestacion.md)
(sucede a [ADR-0022](../../../docs/adr/0022-jerarquia-de-orquestacion.md)).

**Sin esta capa no hay delegación automática.** El flujo por defecto de `@devground/sdd`
—`spec-flow` clasifica, tú ejecutas, los subagentes se lanzan solo si el usuario los pide—
es el de [ADR-0030](../../../docs/adr/0030-delegacion-opt-in-por-peticion.md), salvo el plan
de ejecución de Tier 2–3 de spec-flow 0.8+, que despacha los tres `ejecutor*` sin hooks
([ADR-0040](../../../docs/adr/0040-plan-de-ejecucion-por-agentes-y-contexto-acotado.md)).
Todo lo que sigue describe qué cambia si activas la capa a propósito.

**La fuente de verdad son los archivos vivos en `~/.claude`.** Este directorio es su
**mirror versionado** — se actualiza con `sync-orchestration.mjs`, nunca a mano.

## Las piezas

| Pieza                             | Rol                                                                                                                                                                                                                                                                                            |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/orchestrator-gate.sh`    | Hook `PreToolUse`. Enforcement: si el modelo de sesión es orquestador, deniega `Edit`/`Write`/`NotebookEdit`, Bash mutante y MCP mutante en el main loop (con allowlist administrativa de un solo comando y excepción para `~/.claude/` y el scratchpad). Los subagentes nunca son bloqueados. |
| `scripts/orchestrator-context.sh` | Hook `UserPromptSubmit`. Activación: si el modelo de sesión es orquestador, inyecta el contexto de la regla y el modelo de tiers en cada turno; en Sonnet/Haiku queda en silencio.                                                                                                             |
| `agents/ejecutor.md`              | Subagente Sonnet, esfuerzo `medium`. Implementa lógica (feat, fix, refactor, tests) a partir de su porción del brief.                                                                                                                                                                          |
| `agents/ejecutor-mecanico.md`     | Subagente Haiku, esfuerzo `low`. Trabajo determinista sin lógica nueva: docs, renombrar, bump, formato.                                                                                                                                                                                        |
| `agents/ejecutor-critico.md`      | Subagente Opus, esfuerzo `high`. Núcleo de riesgo de un cambio: solo con un invariante nombrado (`Invariante: …`) de auth/seguridad, dinero, dato irreversible o contrato externo (ADR-0049). |
| `agents/planner.md`               | Subagente Opus, esfuerzo `high`. Diseña la implementación de un cambio Tier 2: archivos a tocar, riesgos, criterios de verificación. Solo lectura.                                                                                                                                             |
| `agents/planner-deep.md`          | Subagente Opus, esfuerzo `xhigh`. Igual que `planner` pero para Tier 3 o riesgo alto (migraciones, cambios irreversibles, contratos externos, seguridad, cambios que cruzan varios módulos). Solo lectura.                                                                                     |

## Delegación medida (ADR-0049)

Tres piezas en `scripts/`, con sus pruebas en `test/` (`python3 test/<archivo>.test.py`):

- `encargar.py`: único punto de entrada a un ejecutor externo (otra herramienta de agentes con
  su propio cupo). Crea un árbol de trabajo propio, bloquea el push del repo mientras corre,
  comprueba el cupo y devuelve estado (`ok`, `cupo`, `no-responde`, `sin-informe`,
  `sin-cambios`, `commit-indebido`, `tiempo`, `fallo`), informe y parche. La plantilla
  `plantillas/encargo-reglas.md` se agrega a cada encargo.
- `delegacion-gate.py`: hook `PreToolUse` (matcher `Agent|Task`). Niega un `ejecutor-critico`
  sin línea `Invariante:` y un agente genérico sin `model`; falla abierto.
- `delegacion-medicion.py`: informe semanal por agente (lanzamientos, turnos, tokens), la
  proporción del crítico contra sus umbrales y los encargos externos; con `--hook`
  (`SessionStart`) avisa en una línea si el crítico pasa los umbrales.

Los parámetros (umbrales, modo del gate, precios, registro de ejecutores externos) viven en
`~/.claude/delegacion.json`; `delegacion.example.json` es el punto de partida y el sync no lo
copia. Los hooks se registran con el extracto de `settings.hooks.json`.

**Apagar el gate:** `gate.modo = "apagado"` (o `"avisar"`) en `delegacion.json`, o
`DELEGACION_GATE=off` por sesión. No hace falta tocar nada más.

**Contrapesos de la medición.** El informe incluye además las revisiones y auditorías lanzadas
con agentes genéricos (por modelo y tokens), las rondas de arreglo por cada 100 ejecutores
contra su umbral, los rechazos del crítico y, con `--invariantes`, el texto de cada invariante
para revisar una muestra. `encargar.py disponibles` recuerda el último estado de cupo de cada
ejecutor durante `ejecutores_externos_memoria_cupo_horas`. Los patrones y umbrales viven en
la clave `medicion` de `delegacion.json`.


## Modelo de tiers

| Tier                                           | Ruteo                                                                                                                                                                             |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 (typo, chore trivial)                        | Directo a `Agent(subagent_type=ejecutor, model haiku)`, sin ceremonia.                                                                                                            |
| 1 (cambio pequeño, ~1-3 archivos, bajo riesgo) | Sin planner: el orquestador explora lo mínimo, escribe un brief autocontenido (rutas exactas + fragmentos relevantes inline) y delega en `Agent(subagent_type=ejecutor, Sonnet)`. |
| 2                                              | `Agent(subagent_type=planner, Opus effort high)` produce el plan, luego `ejecutor` lo implementa.                                                                                 |
| 3 / riesgo alto                                | `Agent(subagent_type=planner-deep, Opus effort xhigh)` produce el plan, luego `ejecutor` lo implementa.                                                                           |

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

`CLAUDE.rule.md` trae dos bullets: el **base** va siempre, el **add-on** solo si además
registraste los hooks. Pegar el add-on sin los hooks deja una orden imperativa sin
enforcement que delega en cada petición con Opus/Fable — es el fallo que documenta
ADR-0030 §Contexto.

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

| Señal                      | Resultado                                    |
| -------------------------- | -------------------------------------------- |
| Delegación a subagentes    | 53% → 92% de las sesiones                    |
| Costo por turno de usuario | $8,23 → $9,04 (+10%, sin ahorro demostrable) |
| Invocaciones de spec-flow  | 173 → 7 (el hook de contexto la desplaza)    |
| Denials del gate           | 314, en 62% de las sesiones                  |

Defectos conocidos abiertos, a resolver antes de recomendar la activación:

1. `orchestrator-gate.sh` deniega **cualquier** comando Bash que contenga `>`, sin validar
   el destino de la redirección. La validación de rutas contra el scratchpad solo existe
   para `rm/mv/cp/mkdir/touch/chmod`. Es la mayor fuente de falsos positivos (195 de los
   314 denials fueron Bash).
2. `orchestrator-context.sh` menciona `spec-flow` solo como paréntesis dentro de una
   instrucción imperativa de ruteo por tier; en la práctica la desplaza.
3. Tier 0-1 no rentabiliza la delegación: el brief más el re-descubrimiento del repo por
   parte del ejecutor cuestan más que el cambio. Sacarlos exige tocar
   `orchestrator-gate.sh`, que deniega `Edit`/`Write` en el main loop sin mirar el tier;
   no basta con reescribir el bullet.

## Post-mortem del apagado (2026-07-27)

Desactivar los hooks no detuvo la delegación. Entre el 23 y el 27 de julio, con los hooks
ya desregistrados, se lanzaron **232 subagentes sin que el usuario los pidiera** (183
`ejecutor`, 33 `planner`, 16 `planner-deep`), concentrados en un solo repo (200).

La causa fue el texto: el bullet de `CLAUDE.rule.md` seguía pegado en el `CLAUDE.md`
**global**, y su condición es el modelo de sesión, no la petición. Con Opus como modelo
habitual, se cumplía siempre.

Lección para quien instale esta capa: **el snippet de `CLAUDE.md` es tan activo como los
hooks, y sobrevive a desactivarlos.** Si apagas la capa, quita también el bullet add-on.
Ver [ADR-0030](../../../docs/adr/0030-delegacion-opt-in-por-peticion.md).
