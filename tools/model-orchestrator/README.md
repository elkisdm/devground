# model-orchestrator

Harness de **routing de modelos por complejidad** para Claude Code. Después de que
`spec-flow` produce un brief con tareas, este orquestador asigna a cada tarea el modelo
y el nivel de esfuerzo óptimos (Opus 4.8 / Sonnet 5 / Haiku 4.5) para **balancear
precio/calidad**, presenta un plan con costo estimado, y tras aprobación despacha
sub-agentes con el modelo asignado.

> **Esto es una copia versionada para distribución.** La fuente activa vive en
> `~/.claude/skills/model-orchestrator/` y `~/.claude/agents/model-router.md`. Edita
> allí y sincroniza aquí (o instala desde aquí, ver abajo).

## Cómo funciona

```
spec-flow → brief con tareas (+ tasks.json machine-readable, Step 3.5)
   ↓
model-orchestrator
   ├─ Paso 1  parsear tareas (o consumir tasks.json directo)
   ├─ Paso 2  PISO declarativo  (policy.json: kind/tier/risk → modelo+effort)
   ├─ Paso 3  ajuste ±1 nivel por el agente model-router (juez barato en Haiku)
   │          → engine.mjs CLAMP determinístico impone las invariantes
   ├─ Paso 4  costo estimado    (pricing.json, honesto: sin tarifa → "pendiente")
   ├─ Paso 5  presentar plan + costo  →  ESPERAR aprobación
   ├─ Paso 6  ejecutar          (Workflow: paralelo/secuencia según depends_on)
   └─ Paso 7  telemetría + reconciliación real vs estimado
```

### Política de piso (resumen)

| Naturaleza de la tarea | Modelo | Effort |
|---|---|---|
| plan · auditoría · decisión · ADR · diseño · security-review | `opus` | `max` |
| código de riesgo alto · breaking · tier 3 | `opus` | `high` |
| feat/fix/perf medio (tier 2) | `sonnet` | `high` |
| feat/fix chico (tier 1) | `sonnet` | `medium` |
| docs · chore · style · rename | `haiku` | `low` |

Las **invariantes** (un `feat` con lógica nueva nunca cae a Haiku; un piso `locked` no
se desescala; ±1 nivel; el effort acompaña al escalar) se imponen en código en
`engine.mjs` — NO se delegan al juicio del agente barato.

## El motor (`engine.mjs`)

Cero dependencias, Node puro. Es la fuente de verdad determinística.

```bash
node engine.mjs floor    '<task|[tasks]>'              # asignación de piso
node engine.mjs clamp    '<{floor,proposal,task}>'     # recorte de la propuesta del agente
node engine.mjs plan     <tasks.json> [proposals.json] # routing-plan.json completo
node engine.mjs reconcile '<{model,est_cost_usd,actual_tokens}>'  # costo real vs estimado
node engine.mjs metrics  <decisions.jsonl>             # agregado: ahorro vs "todo Opus", etc.
node engine.mjs selftest                               # suite (debe pasar 30/30)
```

## Instalar en otra máquina

```bash
cp -R skills/model-orchestrator ~/.claude/skills/
cp agents/model-router.md ~/.claude/agents/
# aplicar el patch de spec-flow (Step 3.5) — ver patches/spec-flow-step-3.5.md
```

## Pricing

`pricing.json` lleva tarifas verificadas (al 2026-06-30). **Sonnet 5** está en su precio
introductorio ($2/$10, vigente hasta 2026-08-31); sube a estándar ($3/$15) el
2026-09-01 — actualizar entonces. Si un modelo no tiene tarifa, el plan reporta el costo
como "pendiente", nunca inventado.
