# Patch: `spec-flow` Step 3.5 — emitir `tasks.json`

Integración estrecha (aditiva, opcional) entre `spec-flow` y `model-orchestrator`. Permite
que el orquestador consuma las tareas **machine-readable** sin parsear la prosa del brief.

## Dónde insertar

En `~/.claude/skills/spec-flow/SKILL.md`, entre el final del **Step 3** (la línea
`...forward motion with visible reasoning, not an interview.`) y el inicio del
**Step 4 — Implement and verify**.

## Bloque a insertar

```markdown
## Step 3.5 — (opcional, Tier 2–3) Emitir `tasks.json` para orquestación

Si el cambio se va a **orquestar por modelo** (repartir las tareas a Opus/Sonnet/Haiku
según complejidad vía la skill `model-orchestrator`), emite además del brief una versión
machine-readable de la sección `### Tasks`, para que el orquestador no tenga que parsear
prosa. Es **aditivo y opcional**: no cambia el brief ni el flujo; solo escribe un archivo
extra cuando hay descomposición en tareas (Tier 2–3).

Escríbelo junto al brief: `docs/specs/<change>.tasks.json` (o en el scratchpad si el brief
es inline), conforme al contrato
`~/.claude/skills/model-orchestrator/references/tasks-input.schema.json`:

{
  "change": "<kebab>", "spec_flow_tier": 2,
  "tasks": [
    { "id": 1, "title": "<tarea>", "kind": "decision|feat|fix|refactor|perf|test|docs|chore|spike|...",
      "size": "small|medium|large",
      "signals": { "type": "feat", "tier": 2, "risk": "med", "breaking": false },
      "depends_on": [] }
  ]
}

Reglas para llenarlo (lo infieres del brief que ya escribiste, sin preguntar):
- kind por tarea = su naturaleza (una "decisión de arquitectura" es decision,
  "implementar endpoint" es feat, "actualizar README" es docs). El orquestador rutea
  por kind, así que es el campo que más importa.
- signals = las señales globales del brief (type/tier/risk/breaking); una tarea las
  hereda salvo que su naturaleza difiera.
- size = tamaño aproximado de esa tarea (no del cambio global).
- depends_on = el orden natural de tu sección Tasks.

No dispares el orquestador tú: solo dejas el tasks.json listo. El usuario decide
orquestar. Si no se pide orquestación, omite este paso.
```

## Contrato

El shape lo valida `skills/model-orchestrator/references/tasks-input.schema.json` y lo
consume `engine.mjs plan`.
