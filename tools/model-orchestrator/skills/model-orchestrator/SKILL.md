---
name: model-orchestrator
description: >
  Orquesta la ejecución de un brief de spec-flow asignando a cada tarea el modelo y el
  nivel de esfuerzo óptimos para balancear precio/calidad, y luego despacha sub-agentes.
  Úsalo DESPUÉS de spec-flow, cuando ya hay un brief con una lista de tareas y quieres
  ejecutarlas — "orquesta esto", "asigna modelos", "reparte las tareas", "ejecuta el
  brief", "rutea por complejidad", "corre el plan con el modelo que toque". Aplica una
  política de piso declarativa (planes/auditorías/decisiones → Opus a máximo esfuerzo;
  feat/fix medio → Sonnet; chore/docs → Haiku) y un agente router barato que ajusta ±1
  nivel con justificación. Genera un plan con costo estimado, lo presenta para aprobación
  y recién entonces ejecuta. NO lo uses para escribir la spec (eso es spec-flow) ni para
  tareas sueltas sin brief.
metadata:
  version: 1.2.0
---

# Model Orchestrator

Conviertes un **brief de spec-flow** (una lista de tareas) en una **ejecución ruteada por
costo/calidad**: cada tarea corre en el modelo y esfuerzo que merece, ni más caro ni más
barato. El balance se gana siendo PRECISO en la asignación, no siendo barato a ciegas.

Flujo: **parsear → rutear (piso + ajuste) → estimar costo → presentar → aprobar → ejecutar → registrar**.

Vives en `~/.claude/skills/model-orchestrator/`. Tus insumos de config:
- `policy.json` — tabla de piso (señal → modelo+effort) y reglas de escalación.
- `pricing.json` — tarifas $/Mtok por modelo (algunas en null a propósito).
- `references/routing-plan.schema.json` — contrato del plan que produces.
- `references/decisions-log.md` — formato del log de telemetría.
- Agente `model-router` (en `~/.claude/agents/`) — juez de ajuste ±1.

---

## Paso 1 — Conseguir las tareas

Tu entrada es el brief que spec-flow ya produjo. **Antes de parsear prosa, busca el
`tasks.json`**: spec-flow (Step 3.5) puede haber emitido ya la versión machine-readable.

**Camino rápido (preferido):** si existe `docs/specs/<change>.tasks.json` (o te pasan uno),
ya está conforme a `references/tasks-input.schema.json` — úsalo tal cual: sáltate el parseo
y pásalo directo a `engine.mjs plan`. Cero ambigüedad, cero inferencia de `kind`.

**Camino de respaldo (parseo):** si NO hay `tasks.json`, extrae del brief en prosa y
constrúyelo tú con el mismo shape. Puede venir:
- **inline** en la conversación (lo más común), o
- en un archivo `docs/specs/<change>.md`.

Extrae:
- **`change`** — nombre kebab del cambio (de la línea de título o classification).
- **`spec_flow_tier`** — el Tier global (0–3) de la línea `**Tier**:`.
- **Señales globales** — de la línea `**Classification**:`: `type` (feat/fix/refactor/perf/
  docs/test/chore/spike), `risk` (low/med/high), flag `breaking`.
- **Las tareas** — de la sección `### Tasks` (lista numerada). Si el brief es Tier 0–1 y no
  tiene sección Tasks explícita, trata el cambio entero como UNA tarea.

Para CADA tarea, infiere su `kind` leyendo su texto (no preguntes):
- contiene "plan/diseño/arquitectura/decisión/ADR/auditoría/security review" → `plan`,
  `design`, `architecture`, `decision`, `adr`, `audit`, `security-review` según corresponda.
- "implementar/agregar/crear endpoint/función" → `implement`/`feat`.
- "arreglar/corregir" → `fix`. "refactor" → `refactor`. "optimizar/perf" → `perf`.
- "test/prueba" → `test`. "doc/readme/changelog" → `docs`. "renombrar/mover/bump" → `chore`.
- "explorar/investigar/spike" → `spike`.

Una tarea hereda las señales globales del brief, pero su `kind` puede dispararle una regla
más específica (p.ej. una tarea "decisión de arquitectura" dentro de un cambio tier 2 sube
a Opus por su kind, no por el tier).

## Paso 2 — Aplicar el PISO (determinista, lo hace el motor)

El piso es código de tabla, no juicio: lo calcula `engine.mjs` recorriendo
`policy.json.rules` de arriba hacia abajo (primera regla cuyo `when` se cumpla por
completo; AND dentro de la regla; si ninguna matchea, `default`). No lo hagas a mano ni
gastes un agente en ello — el motor lo resuelve dentro de `plan` (o `engine.mjs floor`
para inspeccionar una tarea suelta). El 90% de las tareas quedan bien solo con el piso.

## Paso 3 — Ajuste por el agente `model-router` (±1 nivel)

El piso es un punto de partida; la complejidad real de una tarea puede no estar capturada
por las señales. Para afinar, consulta al agente **`model-router`** (corre en Sonnet,
barato relativo a la ejecución). Pásale, por tarea: `title`, `description`, `kind`, `signals`, `floor`, y
`capability_order`/`effort_order`/`max_levels` desde `policy.json`. Si la tarea nombra
archivos concretos, pásaselos para que calibre la complejidad real.

Optimizaciones (no malgastes routing):
- **Salta el router** si el piso ya está en `opus`/`max` y `locked:true` — no hay hacia
  dónde escalar ni se permite bajar. Asignación final = piso, `adjustment:0`.
- **Paraleliza** las consultas del router con la herramienta `Workflow` cuando hay varias
  tareas (cada juicio es independiente).
- Si hay muy pocas tareas (≤3) puedes aplicar tú mismo el criterio del router siguiendo
  `~/.claude/agents/model-router.md`, sin despachar el agente.

### El clamp lo impone el motor en CÓDIGO (NO el agente)

El agente `model-router` solo **propone**. Las invariantes se imponen determinísticamente
en `engine.mjs` — NO se delegan a su juicio: el router es más barato que Opus y puede "razonar"
que un feat con lógica nueva es mecánico y proponer Haiku (puede pasar). No lo discutas
con el prompt; el motor lo **recorta**. No reimplementes el clamp de memoria: invoca el
motor.

Reglas duras que `engine.mjs` garantiza pase lo que pase el agente (ver `clamp()`):
- **±1 nivel** de `capability_order` (un `+5` abusivo se recorta a 1).
- **`locked` nunca desescala** (modelo ni effort por debajo del piso).
- **Lógica nueva no cae a Haiku**: cualquier `kind` fuera de `no_new_logic_kinds`
  (`feat`/`fix`/`perf`…) tiene piso `sonnet`, aunque el agente proponga `haiku`.
- **Escalar el modelo sube el effort**.
- Propuesta sin JSON válido o sin `reason` → se descarta y queda el piso.

La `reason` guardada es la del agente si su propuesta sobrevive intacta; si el motor la
recortó, deja constancia (lo hace solo: `"router pidió haiku/low; feat = lógica nueva, no
baja de sonnet; final sonnet/low"`).

## Paso 3.bis — Construir el plan con el motor

No armes el plan a mano. Con las tareas parseadas y las propuestas del router, invoca:

```bash
node ~/.claude/skills/model-orchestrator/engine.mjs plan <tasks.json> [proposals.json]
```

- `tasks.json`: `{ change, spec_flow_tier, tasks:[{id,title,kind,size,signals,depends_on}] }`
  (`size` ∈ small|medium|large, o pasa `est_tokens` explícito).
- `proposals.json` (opcional): mapa `{ "<id>": {model,effort,reason} }` con la salida del
  agente por tarea. Sin él, el plan queda solo-piso (útil para previsualizar).
- Salida: el `routing-plan.json` completo (piso + clamp + costo + totales), conforme al
  schema. El motor aplica floor → clamp → costo en un paso.

Comandos sueltos para depurar: `engine.mjs floor '<task>'`, `engine.mjs clamp
'<{floor,proposal,task}>'`. Verifica el motor cuando lo toques: `engine.mjs selftest`.

La asignación **final** de cada tarea = piso + ajuste validado.

## Paso 4 — Costo (honesto o nada) — lo calcula el motor

El motor estima el costo dentro de `plan` usando `pricing.json` y los buckets de tokens
(`small`/`medium`/`large`, o `est_tokens` explícito por tarea). Tu única responsabilidad
es asignar un `size` razonable a cada tarea al armar `tasks.json`. El motor:
- usa la tarifa solo si el modelo tiene `input`/`output` **no-null** (`verified`);
- si es **null** (p.ej. Sonnet 5 hoy), deja `est_cost_usd: null` → "pendiente de tarifa".
  **JAMÁS** se usa el bloque `estimate` de `pricing.json` como precio real;
- setea `pricing_status` (`complete`/`partial`/`unavailable`) y deja `totals.est_cost_usd`
  en `null` si alguna tarea quedó pendiente.

Guarda la salida como `routing-plan.json` en el proyecto. La fecha `generated` la pasas tú
al motor (campo del `tasks.json` o estampada al escribir) — los scripts no generan fechas.

## Paso 5 — Presentar el plan y ESPERAR aprobación

Esto gasta dinero real: **no ejecutes sin luz verde**. Muestra una tabla compacta:

```
Tarea                          kind        piso          → final         ajuste  costo est.
1. Diseñar esquema de datos    decision    opus/max      opus/max          0     $0.42
2. Implementar endpoint POST   feat        sonnet/med    sonnet/high      +1     pendiente*
3. Tests del endpoint          test        sonnet/low    sonnet/low        0     pendiente*
4. Actualizar README           docs        haiku/low     haiku/low         0     $0.01

Total estimado: $0.43  (+ 2 tareas en Sonnet 5 sin tarifa confirmada)
* Sonnet 5 sin precio verificado en pricing.json — costo no calculado.
Reparto: opus×1, sonnet×2, haiku×1.
```

Luego pregunta, en UNA ronda, con `AskUserQuestion`: **aprobar / ajustar / cancelar**.
Si el usuario quiere ajustar (cambiar el modelo de una tarea, forzar esfuerzo), aplica el
cambio al plan, registra que fue override manual, y vuelve a mostrar. No ejecutes hasta
aprobación explícita.

## Paso 6 — Ejecutar (despacho de sub-agentes)

Con el plan aprobado, despacha cada tarea con su `{model, effort}` usando la herramienta
**`Workflow`** (es la que permite `agent(prompt, {model, effort})` por tarea y paraleliza):

- **Respeta `depends_on`**: tareas con dependencias van en secuencia detrás de ellas; las
  independientes (`depends_on: []`) en paralelo. Usa `pipeline` cuando hay cadenas de
  dependencia y `parallel` para los lotes independientes.
- Cada `agent()` recibe el `model` y el `effort` de la asignación final de su tarea, más el
  contexto de la tarea (título, descripción, archivos a tocar del brief).
- **Inyecta guía de calidad por `kind`**: al construir `buildTaskPrompt(t)`, busca `t.kind`
  en `references/kind-playbooks.md`. Si tiene un checklist, adjúntalo al prompt del
  subagente bajo `## Guía de calidad para esta tarea` — es guía mecánica destilada de los
  playbooks (`docs/*-playbook.md`), en el punto de trabajo, sin reemplazar el contexto de
  la tarea. Si el kind no está mapeado (`chore`/`style`/`rename`/`spike`/`test`), no
  inyectes nada. Anota en `decisions.jsonl` qué checklist inyectaste (`playbook_injected`)
  para poder medir después si baja la tasa de reversión. Además, si la tarea toca frontend
  (título/archivos de UI: formularios, inputs, modales, componentes React/Next/Tailwind,
  `.tsx`/`.jsx`), adjunta TAMBIÉN el checklist **UI / FRONTEND** de `kind-playbooks.md` — es
  aditivo al checklist del kind, no lo reemplaza, y no altera el ruteo de modelo/costo.
- Las tareas `plan`/`audit`/`decision` corren primero si otras dependen de su resultado.

Esquema de despacho (pseudocódigo de Workflow):

```js
// tareas independientes en paralelo, cada una con su modelo/esfuerzo
const results = await parallel(independentTasks.map(t => () =>
  agent(buildTaskPrompt(t), { model: t.assigned.model, effort: t.assigned.effort,
                              label: `task-${t.id}:${t.assigned.model}` })))
// cadenas de dependencia con pipeline
```

Si el entorno no tiene la herramienta `Workflow` disponible, degrada a despachar con la
herramienta `Agent` (un sub-agente por tarea, con su `model`), respetando el orden de
dependencias secuencialmente.

## Paso 7 — Telemetría y reconciliación (cerrar el lazo)

Por cada tarea ejecutada, agrega UNA línea a `decisions.jsonl` (append-only; esquema en
`references/decisions-log.md`): piso, ajuste, razón, modelo final, costo estimado.

**Reconcilia con el costo real.** Cada sub-agente que despachas devuelve sus **tokens
reales** en la notificación del Workflow/Agent (`<usage><subagent_tokens>…`). Con eso:

```bash
node engine.mjs reconcile '{"model":"sonnet","est_cost_usd":0.13,"actual_tokens":{"input":18000,"output":12000}}'
```

y añade `actual_tokens` / `actual_cost_usd` / `cost_delta_usd` a la línea de esa tarea. Así
el log lleva estimado Y real, no solo la apuesta previa.

**Resumen del balance precio/calidad** (insumo para `dev-metrics`):

```bash
node engine.mjs metrics decisions.jsonl
```

Devuelve reparto por modelo, estimado vs real, error medio %, y el **ahorro vs "todo en
Opus"** — la métrica que justifica el harness. Si el ahorro es alto y el error de
estimación bajo, el routing está cumpliendo; si no, ajusta `policy.json`.

---

## Principios

- **El routing es barato; la ejecución es cara.** Nunca rutees con Opus. El juez es Sonnet:
  el clamp del motor atrapa las desescaladas malas, pero una escalada perdida no la atrapa
  nadie — el juez necesita capacidad para VER la complejidad sutil que amerita escalar.
- **Sesgo a calidad en la duda.** Desescalar ahorra centavos y puede costar un retrabajo
  caro. Solo baja cuando la tarea es obviamente mecánica.
- **Planes, auditorías y decisiones son sagrados**: Opus a máximo esfuerzo, no negociable.
- **Honestidad de costos**: sin tarifa verificada no hay número. "Pendiente" > inventado.
- **Aprobación antes de gastar**: el plan se muestra y se aprueba; nunca ejecutas a ciegas.
