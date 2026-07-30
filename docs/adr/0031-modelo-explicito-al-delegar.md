# ADR-0031: Al delegar, el modelo del subagente va explícito por naturaleza de la tarea

- **Estado**: Aceptado
- **Fecha**: 2026-07-30
- **Decisor**: edaza
- **Aplica a**: `~/.claude/CLAUDE.md` (regla viva), `packages/sdd/orchestration/CLAUDE.rule.md` (extracto distribuido), skill `model-orchestrator`

## Contexto

En julio de 2026 se lanzaron **2.323 subagentes** y **1.068 de ellos (46%) corrieron en Opus
sin que nadie lo pidiera**: no llevaban `model` explícito en la llamada, y el harness hace que
un subagente sin `model` propio herede el modelo del padre. Con Opus como modelo de sesión
habitual, heredar significa Opus.

Desglose de los lanzamientos que heredaron Opus, por tipo de agente:

| Agente | Lanzamientos con Opus heredado | ¿Corresponde Opus? |
|---|---|---|
| `general-purpose` | 229 | No — es el catch-all, la mayoría es búsqueda y trabajo mecánico |
| `Explore` | 124 | No — es búsqueda read-only sobre muchos archivos |
| sin `subagent_type` | 10 | No — cae al catch-all |
| `planner` / `planner-deep` | 185 | **Sí** — Opus por definición del agente (ADR-0027) |
| `ejecutor` | 603 | Irrelevante: su frontmatter declara `model: sonnet` y eso gana sobre la herencia |

La distinción importa: los agentes propios de `~/.claude/agents/` **ya declaran su modelo**
(`ejecutor` sonnet, `planner` opus, `model-router` sonnet, `format-adapter` haiku). Los que
heredan son los **built-in** del harness (`Explore`, `general-purpose`, `claude`), que no tienen
definición en disco donde fijarlo.

Costo medido en julio, a precio de API (no desembolso: hay suscripción de por medio):

| Origen | Valor |
|---|---|
| Main loop | US$61,4k (65%) |
| Subagentes | US$33,1k (35%) — de los cuales **US$23,3k corrieron en Opus** |

Los ~353 lanzamientos de `Explore`/`general-purpose` que heredaron Opus son **59% de los
lanzamientos Opus** del mes. Moverlos a Sonnet (≈1/5 del precio por token) ahorra del orden de
**US$11-13k/mes de valor-API**. Es una estimación por lanzamiento, no una medición por tokens:
los transcripts no atribuyen tokens a un `agent_id`.

Existe además la skill `model-orchestrator` (política de piso declarativa en `policy.json`:
juicio → Opus max; feat/fix medio → Sonnet; docs/chore → Haiku) que resuelve exactamente este
problema para un brief con tareas. Está **huérfana**: no hay ningún `decisions.jsonl` en el
disco, o sea que nunca corrió.

## Decisión

Dos cambios, ninguno de los cuales ordena delegar.

**1. Regla condicional, no imperativa.** Se agrega a la regla viva un bullet que aplica
únicamente *cuando ya se decidió delegar*: la llamada lleva `model` explícito, elegido por la
naturaleza de la tarea.

| Naturaleza de la tarea | Modelo |
|---|---|
| Búsqueda / lectura / exploración (`Explore`, barridos de archivos) | `sonnet` |
| Trabajo mecánico determinista (rename, mover, bump, formato, docs) | `haiku` |
| Implementación de lógica (feat/fix/perf, `general-purpose` que edita) | `sonnet` |
| Juicio: plan, diseño, auditoría, decisión, review de seguridad | `opus` |

Los agentes que ya declaran modelo en su frontmatter no se tocan: su definición gana y es
correcta.

**2. `model-orchestrator` queda como puerta explícita.** Sigue siendo opt-in (lo pide el
usuario), pero se nombra en la regla para que exista como opción conocida cuando hay un brief
con tareas que vale repartir. `policy.json` es la fuente de verdad del piso; este ADR no la
duplica.

La forma de la regla es deliberada. [ADR-0030](0030-delegacion-opt-in-por-peticion.md) midió
que un bullet **imperativo** en el `CLAUDE.md` global ("la ejecución es de subagentes") produjo
232 delegaciones no pedidas en cuatro días, porque se activaba por el modelo de sesión y no por
lo que el usuario pedía. Un bullet **condicional** ("cuando delegues, elige bien el modelo") no
puede tener ese efecto: no dispara la acción, solo la abarata. Si se sorprende delegando más
después de este ADR, la causa no es este texto.

## Consecuencias

**Positivas**

- Del orden de US$11-13k/mes de valor-API que hoy se gasta en Opus para buscar archivos deja de
  gastarse, sin tocar la calidad del trabajo de juicio (planes y auditorías siguen en Opus).
- La decisión de modelo queda visible en la llamada, no implícita en cuál era el modelo de
  sesión — que es lo que la hacía imposible de auditar.

**Negativas / riesgos**

- Un `Explore` en Sonnet puede pasar por alto algo que Opus habría encontrado. El riesgo es
  acotado porque `Explore` devuelve rutas y extractos que el main loop verifica, pero es real.
- La regla depende de disciplina en cada llamada: no hay enforcement. Se descartó el hook a
  propósito (ver Alternativas).
- No se puede verificar el ahorro con precisión: los transcripts no atribuyen tokens por
  subagente, así que la métrica seguirá siendo "lanzamientos por modelo", no "dólares por
  agente".

## Alternativas consideradas

1. **Un hook `PreToolUse` que rechace lanzar subagentes sin `model`.** Descartada por ahora: es
   la misma clase de mecanismo que ADR-0028 tuvo que desregistrar, y el costo de un falso
   positivo (no poder lanzar un agente) es peor que el de un lanzamiento caro. Queda como opción
   si la disciplina no aguanta.
2. **Crear definiciones locales `~/.claude/agents/Explore.md` y `general-purpose.md` que fijen
   `model: sonnet`.** Sería enforcement real sin hooks, pero no está verificado que un archivo
   local pueda sobrescribir un agente built-in del harness, y una definición local a medias
   podría degradar el agente. Pendiente de probar; si funciona, reemplaza al punto 1 de la
   decisión con algo determinista.
3. **Bajar el modelo de sesión a Sonnet y escalar a Opus cuando se necesite.** Ataca el 65% del
   gasto (main loop), que es más grande, pero cambia la calidad del trabajo principal, no la del
   trabajo auxiliar. Es una decisión distinta y no se toma acá.

## Referencias

- [ADR-0027 — Empaquetar la regla de orquestación en @devground/sdd](0027-empaquetar-regla-de-orquestacion.md)
- [ADR-0028 — La capa de orquestación es opt-in y queda desactivada por defecto](0028-orquestacion-opt-in-desactivada-por-defecto.md)
- [ADR-0030 — La delegación a subagentes es opt-in por petición](0030-delegacion-opt-in-por-peticion.md)
- `~/.claude/skills/model-orchestrator/policy.json` — piso declarativo de routing
- Medición de julio 2026: 2.323 lanzamientos, 46% con Opus heredado; US$94,5k de valor-API
  total (65% main loop / 35% subagentes)
