# Diseño de medición — Impacto de spec-flow + codemap

> Estado: **Propuesto** · Tipo: diseño de medición (ADR-style) · Fecha: 2026-06-03
> Revisión 2026-06-30 (spec-flow v0.3): medición **bidireccional** — se agrega el evento
> `assumption_reversed` como contrapeso al Goodhart de `questions_asked`. Ver §4, §5, §8.
> Cuando spec-flow se empaquete como `@devground/sdd`, este doc se promueve a un ADR
> formal en devground.

## 1. Pregunta

¿spec-flow + el codemap **mejoran de verdad** la calidad y eficiencia del desarrollo, o
solo lo sentimos así? Queremos evidencia automática y en background, no impresiones, para
decidir al momento de despliegues o mejoras con datos en la mano.

## 2. El instrumento (ya existe)

`@devground/dev-metrics` computa un time-series etiquetado desde git + transcripts de
Claude Code: volumen de código, calidad, velocidad, eficiencia. **No construimos un
instrumento nuevo — instrumentamos el que ya hay.**

Baseline pre-spec-flow ya capturado (memoria `dev-metrics-baseline`, Mar–May 2026):
velocidad ~32 commits/día · eficiencia ~54k tok/commit · supervivencia 62%→85% ·
one-shot ~60% · R²=0.63.

## 3. El problema metodológico (por qué un before/after miente)

El baseline ya venía **subiendo** antes de spec-flow (supervivencia 62%→85%). El dev está
mejorando solo. Por lo tanto:

> Un before/after ingenuo confunde el efecto de spec-flow con el crecimiento propio del
> developer. Correlación ≠ causalidad. **Rechazado como diseño primario.**

**Diseño elegido: segmentación CONCURRENTE (within-subject, mismo período).** Dentro de la
misma ventana temporal, comparar cambios *con* spec-flow vs *sin* spec-flow. Mismo dev,
mismo período → se controla el crecimiento personal y las tendencias temporales. Es la
evidencia más creíble sin randomización.

El before/after se conserva solo como referencia **secundaria** (contexto), nunca como
prueba.

## 4. Unidad de análisis y etiquetado

**Unidad:** el *cambio* (un commit o grupo de commits ligado a una petición).

**Etiquetado (la pieza que falta).** dev-metrics necesita saber qué cambios pasaron por
spec-flow. spec-flow **emite un evento** por corrida:

```jsonc
{
  "event": "spec",              // discriminador; ausente en eventos viejos ⇒ "spec"
  "ts": "2026-06-03T14:22:00-04:00",
  "change": "agregar-login-email",
  "tier": 1,                    // 1..3 (Tier 0 NO emite: rompería su "no artifacts")
  "type": "feat",               // feat|fix|refactor|perf|...
  "size": "small", "risk": "low",
  "files": ["src/app/login/page.tsx", "src/auth/session.ts"],
  "assumptions": 2,             // # de supuestos inferidos y declarados en el brief
  "questions_asked": 0,         // fricción — SIEMPRE leído contra assumptions y reversiones
  "brief": "inline"             // inline | docs/specs/<change>.md
}
```

**Evento de reversión (el contrapeso de calidad).** `questions_asked` mide fricción, pero
por sí solo premia no-preguntar → Goodhart: inferir a lo loco puntúa perfecto. El segundo
evento cierra el loop. Cuando un supuesto inferido resulta **equivocado** (el usuario lo
corrige, o el rework lo prueba), se anexa otra línea al mismo `change`:

```jsonc
{
  "event": "assumption_reversed",
  "ts": "2026-06-30T10:00:00-04:00",
  "change": "agregar-login-email",      // mismo change que el evento spec
  "task_id": 2,                          // opcional: id de la tarea (si pasó por model-orchestrator)
  "assumption": "<el supuesto inferido que falló>",
  "cost": "trivial|rework|redesign"     // qué tan caro salió equivocarse
}
```

Así, "preguntó 0 y construyó lo incorrecto" deja de puntuar igual que una corrida limpia.
Una corrida es buena solo si AMBOS lados están sanos: poca fricción Y pocas reversiones.

**Puente con model-orchestrator (calidad de routing).** Cuando el cambio se orquestó por
modelo, `task_id` liga la reversión a la tarea concreta del `decisions.jsonl` del
orquestador (ambos logs llavean por `change`; `task_id` fija la tarea). El orquestador
reconcilia **costo** real vs estimado pero NO mide retrabajo; este evento es esa pieza
faltante. Con el join, dev-metrics responde lo que ninguno de los dos mide solo: *¿bajar una
tarea a un modelo más barato sube su tasa de reversión?* — el riesgo central del orquestador
("desescalar puede costar un retrabajo caro"), hoy sin instrumentar.

Destino: **`<repo>/.spec-flow/events.jsonl`** (JSONL append-only, versionado). **Decisión
v0:** el evento se commitea JUNTO al cambio → el enlace evento↔commit es **directo** (el
mismo commit toca `events.jsonl` y el código), no heurístico. Esto supera el matching por
ventana+overlap del diseño original.

dev-metrics liga **evento → commit** así:
1. **Primario (directo):** el commit que introduce la línea del evento en `events.jsonl`
   ES el commit del cambio. Linkage casi exacto.
2. **Fallback:** si el evento y el código quedaron en commits distintos, ventana temporal
   + overlap de archivos (`files` del evento ∩ archivos del commit).

Un cambio sin evento se etiqueta `not-used`. Se reporta la tasa de matching como métrica
de confianza. Nota: los eventos son labels benignos (nombre, tier, paths) — NO contenido
de transcript — por eso es seguro versionarlos (a diferencia de los snapshots de
dev-metrics, que sí son PII y quedan locales).

## 5. Métricas (definición operacional)

| Métrica | Definición computable | Dirección esperada | Atribuible a |
|---|---|---|---|
| **Supervivencia de código** | % de líneas introducidas por el cambio aún vivas tras N commits/días (dev-metrics ya lo computa) | ↑ con spec-flow | calidad del plan |
| **One-shot rate** | cambio que llega a "done" sin commits de corrección (`fix` inmediato sobre los mismos archivos en X tiempo, o sin loops de edición en transcript) | ↑ del 60% | brief upfront |
| **Eficiencia** | output tokens del transcript atribuibles al cambio ÷ líneas sobrevivientes | **ambigua** (suma spec, resta rework) | efecto neto |
| **Costo de orientación** | tokens/tiempo entre el inicio del cambio y el **primer Edit** (lecturas/greps previos en el transcript) | ↓ conforme el codemap madura | **codemap (la más limpia)** |
| **Velocidad** | cambios o commits por unidad de tiempo | plana o ↑ | anti-fricción |
| **Fricción** | `questions_asked` por cambio, leído junto a `assumptions` | bajo *para el riesgo* (no →0 ciego) | Prime Directive |
| **Calidad de inferencia** | `assumption_reversed` ÷ `assumptions` totales (tasa de reversión) | ↓ pocas reversiones | contrapeso al Goodhart de fricción |

La fila *orientación* es la joya para el codemap (señal limpia, pocos confounds). La fila
*calidad de inferencia* es la joya para el Prime Directive: es la única que castiga el
fallo opuesto a la fricción —inferir con confianza y equivocarse— y sin ella el sistema se
optimiza a no preguntar aunque deba.

## 6. Comparaciones que produce el reporte

1. **Concurrente (primaria):** spec-flow vs not-used, misma ventana, por métrica.
2. **Tier-matched:** comparar solo dentro del mismo tier (un Tier-3 vs Tier-3) para no
   mezclar peras con manzanas — los cambios grandes son intrínsecamente distintos.
3. **Tendencia del codemap:** costo de orientación a lo largo del tiempo, para ver si el
   índice efectivamente abarata la búsqueda conforme madura.
4. **Referencia secundaria:** ventana pre-rollout (contexto, no prueba).

Cada número con: n, media ± desviación, delta, y **una nota de confianza** (tamaño de
muestra, tasa de matching evento→commit). Nunca un número desnudo.

## 7. Automatización en background

- **Cron semanal** (`CronCreate`): corre `dev-metrics collect` sobre los proyectos,
  anexa al time-series (snapshot), y genera el reporte de segmentación.
- **Salida:** un reporte markdown en el repo (o devlog) + notificación de una línea con el
  delta de la semana. El mecanismo de snapshots ya existe en dev-metrics.
- **Sin LLM en el camino caliente:** la recolección es determinista (git + parse de
  transcripts); solo el resumen final podría usar LLM, y es opcional.

## 8. Qué haríamos con los datos (umbrales de decisión)

- Velocidad baja > ~15% en spec-flow vs not-used → **spec-flow agrega fricción**: revisar
  umbrales de tier, probablemente bajando cosas a Tier 0/1.
- Supervivencia y one-shot **suben** en spec-flow, mismo período → evidencia a favor.
- Costo de orientación **baja** con codemap maduro → evidencia del codemap.
- `questions_asked` se aleja de 0 **en cambios inferibles (Tier 0-1)** → se está
  sobre-interrogando; endurecer. PERO `questions_asked`=0 con tasa de `assumption_reversed`
  alta → el fallo opuesto: se infiere y se equivoca. Ahí el skill debe preguntar MÁS en el
  must-ask bar, no menos. Leer siempre los dos juntos; ninguno solo decide.

## 9. Alternativas consideradas

| Alternativa | Veredicto |
|---|---|
| Before/after puro | ❌ confundido por el crecimiento propio del dev |
| RCT — randomizar saltarse spec-flow en Tier-1 | ❌ agrega fricción (saltar a propósito) y contradice el valor anti-fricción. Si algún día se quiere rigor extra, existe el skill `ab-testing`. |
| Self-report / encuesta subjetiva | ❌ sesgado, débil |
| **Segmentación concurrente + tier-matched** | ✅ **elegido** — mejor evidencia sin fricción |

## 10. Riesgos

- **Etiquetado impreciso** (evento↔commit) → reportar la tasa de matching como confianza.
- **N pequeño / baja potencia** al inicio → no concluir nada en las primeras semanas;
  declarar el N en cada reporte.
- **Goodhart** (optimizar para la métrica) → mirar las métricas juntas, nunca una sola; en
  particular leer `questions_asked` SIEMPRE contra `assumption_reversed`. El evento de
  reversión es el contrapeso estructural: castiga inferir-y-equivocarse, que la fricción
  por sí sola premiaría. Es la mitigación de diseño, no solo "mirar varias a la vez".
- **Privacidad:** dev-metrics consume transcripts = PII (ADR-0008 de devground). Todo
  local, nunca publicar snapshots. (Relacionado: el footgun de `dev-metrics/snapshots/`
  sin gitignorear que está pendiente de arreglar.)

## 11. Fases de implementación

- **v0 — instrumentación:** ✅ EN MARCHA (2026-06-03). spec-flow emite el evento (§4) a
  `.spec-flow/events.jsonl` versionado (SKILL.md Step 6). Pendiente: registrar el hito de
  rollout como `EventAnnotation {date:"2026-06-03", label:"spec-flow rollout"}` en el
  events file de dev-metrics de cada proyecto cuando corra la medición. *Nada se concluye
  todavía, solo se captura.*
- **v1 — reporte:** comando/segmentación en dev-metrics que produce las comparaciones del
  §6.
- **v2 — cron background:** el §7 automatizado.

> Sin v0, dentro de 3 semanas no hay nada que comparar. Es el único paso urgente; v1/v2
> esperan a que haya señal.
