# Telemetría de decisiones de routing

El orquestador registra cada decisión de asignación de modelo en un log **append-only**
para poder medir después si el balance precio/calidad fue el correcto (conciliación real
vs estimado, tasa de retrabajo por modelo, ahorro logrado).

## Dónde

`decisions.jsonl` en la raíz del proyecto donde se ejecutó la orquestación
(`<repo>/decisions.jsonl`), o en `~/.claude/skills/model-orchestrator/decisions.jsonl` si
no hay proyecto. Una línea por tarea ejecutada. Append-only: nunca reescribas, solo agrega.

## Esquema (un objeto JSON por línea, compacto)

```jsonc
{
  "ts": "2026-06-30T15:40:00-04:00",   // ISO-8601 con tz, estampado al escribir
  "change": "model-orchestrator",        // nombre kebab del cambio (del brief)
  "task_id": 2,
  "task_kind": "feat",
  "signals": { "type": "feat", "tier": 2, "risk": "med", "breaking": false },
  "floor": { "model": "sonnet", "effort": "medium", "rule_id": "tier2-standard", "locked": false },
  "assigned": { "model": "sonnet", "effort": "high" },
  "adjustment": 0,                       // -1 | 0 | +1 niveles de capability vs piso
  "adjusted_by": "model-router",         // "model-router" | "manual-override" | "floor"
  "reason": "delicado pero no amerita opus; subo esfuerzo, no modelo",
  "est_cost_usd": 0.13,                  // null si el modelo no tiene tarifa verificada
  "pricing_confidence": "verified",       // verified | unconfirmed | unavailable

  // ── reconciliación (se añade DESPUÉS de ejecutar, no antes) ──
  "actual_tokens": { "input": 18000, "output": 12000 }, // tokens reales del sub-agente
  "actual_cost_usd": 0.156,              // calculado por engine.mjs reconcile
  "cost_delta_usd": 0.026,               // real - estimado
  "cost_delta_pct": 20.0,                // desviación %

  "orchestrator_version": "1.0.0"
}
```

## Reconciliación (cerrar el lazo estimado ↔ real)

Tras ejecutar un sub-agente, conoces sus **tokens reales** (vienen en la notificación del
Workflow/Agent: `<usage><subagent_tokens>…`). Pasa esos tokens a
`engine.mjs reconcile '{"model":"sonnet","est_cost_usd":0.13,"actual_tokens":{"input":…,"output":…}}'`
y agrega `actual_tokens` / `actual_cost_usd` / `cost_delta_usd` a la línea de esa tarea.

Para el resumen consumible por **dev-metrics**:
`engine.mjs metrics <decisions.jsonl>` → reparto por modelo, costo estimado vs real,
error medio %, y **ahorro vs "todo en Opus"** (cuánto valió rutear). Ese objeto es el
puente con tu reader dev-metrics: mide si el balance precio/calidad realmente funcionó.

## Notas

- `adjusted_by` distingue las tres fuentes de la decisión: la regla de piso (`floor`), el
  juez (`model-router`), o un override manual del usuario en el checkpoint de aprobación.
- `est_cost_usd` es la estimación previa; `actual_cost_usd` el real post-ejecución. Ambos
  los calcula `engine.mjs` con la misma fórmula (tokens × tarifa) — la diferencia es solo
  estimado vs real. NO inventes ninguno a mano.
- No incluyas contenido de la tarea ni del transcript: solo etiquetas de decisión. El log
  es benigno y versionable.
- Si append-ear esta línea se siente como fricción, lo estás sobre-pensando: es un `echo`.
