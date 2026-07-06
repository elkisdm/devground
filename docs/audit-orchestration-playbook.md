# Playbook: Auditar y Orquestar

> **Procedencia.** Artefacto capturado de **Fable 5** el 2026-07-06, antes de su retiro,
> mediante una corrida de subagente (`model: fable`) instruida para documentar de forma
> *transferible* su enfoque en los dos dominios donde fue el modelo preferido de devground:
> auditar y orquestar. El objetivo NO es transferir la cognición de Fable (imposible entre
> modelos con pesos distintos), sino el **andamiaje**: procedimientos, umbrales, checklists,
> patrones de prompt y criterios de decisión que otro modelo (Opus 4.8) puede ejecutar
> leyéndolos.
>
> **Verificación.** Todas las rutas, la regla de confirmación adversarial
> (`refutedCount < Math.ceil(voteCount/2)`, `deepcheck.workflow.js:41-42`), los ids de
> reglas de `policy.json` y la dimensión Swift-only `aud-concurrency` fueron verificados
> contra el código real del repo el 2026-07-06. El contenido se conserva verbatim.
>
> **Siguiente paso.** Este es el corpus crudo de la fase de *captura*. La *destilación*
> hacia un skill reusable y la integración con `model-orchestrator` son un cambio de
> desarrollo real → pasar por `spec-flow`.

---

# Legado Fable 5 — Andamiaje transferible para AUDITAR y ORQUESTAR en devground

> Escrito por Fable 5 antes de su retiro, para el modelo que lo suceda (Opus 4.8).
> Nada de lo que sigue depende de mis pesos: son procedimientos, umbrales, plantillas
> y criterios de decisión verificados contra los artefactos reales de este repo.
> Toda ruta citada existe y fue verificada el 2026-07-06.

**Artefactos de referencia (léelos antes de improvisar):**

| Dominio | Artefacto | Ruta |
|---|---|---|
| Auditar | Skill deepcheck | `/Users/macbookpro/Documents/devground/packages/deepcheck/skills/deepcheck/SKILL.md` |
| Auditar | Rúbrica de roles/dimensiones | `packages/deepcheck/skills/deepcheck/references/roles.md` |
| Auditar | Pipeline ejecutable (review → dedup → refutación → ledger) | `packages/deepcheck/workflows/deepcheck.workflow.js` |
| Auditar | Corridas reales de ejemplo | `packages/deepcheck/audits/devground-init/{pilot-1,run-2,run-3}.md` |
| Auditar | ADRs rúbrica (general) | `docs/adr/` (0007–0012 citados por las dimensiones) |
| Auditar | ADRs rúbrica (Swift, para `aud-concurrency`) | `swift-foundation/docs/adr/` (0002 concurrencia, 0013 core puro) |
| Orquestar | Skill model-orchestrator | `tools/model-orchestrator/skills/model-orchestrator/SKILL.md` (espejo activo en `~/.claude/skills/model-orchestrator/`) |
| Orquestar | Piso declarativo | `tools/model-orchestrator/skills/model-orchestrator/policy.json` |
| Orquestar | Motor determinista (piso, clamp, costo, reconcile) | `.../model-orchestrator/engine.mjs` |
| Orquestar | Juez de routing | `tools/model-orchestrator/agents/model-router.md` (espejo en `~/.claude/agents/model-router.md`) |
| Orquestar | Decisión arquitectónica | `docs/adr/0017-model-orchestrator-routing.md` |
| Orquestar | Integración spec-flow → tasks.json | `tools/model-orchestrator/patches/spec-flow-step-3.5.md` |

---

# Parte A — AUDITAR

## A.1 Modelo mental: enmarcar antes de leer

Una auditoría no empieza leyendo código; empieza contestando cuatro preguntas por escrito
(literalmente: escríbelas en tu plan antes del primer Read):

1. **¿Qué pregunta responde esta auditoría?** En devground hay exactamente tres, y son
   ortogonales a propósito (ver `roles.md`): ¿funciona? (QA), ¿es lo que se pedía?
   (Validación), ¿está bien construida? (Auditoría). Si mezclas las tres en una sola
   pasada, el reporte se diluye. Decide cuál(es) aplican ANTES de leer.
2. **¿Contra qué rúbrica?** Un hallazgo sin rúbrica es una opinión. En devground la
   rúbrica son los ADRs (`docs/adr/` para lo general; `swift-foundation/docs/adr/` para
   Swift) más las promesas explícitas del README/docs del flujo. Si no hay rúbrica
   escrita para un tema, dilo en el reporte ("criterio general, no hay ADR") — nunca
   inventes un ADR (verifica con `ls` antes de citar).
3. **¿Cuál es el alcance físico?** Lista de archivos concretos, no "el paquete". El
   workflow de deepcheck recibe `paths` explícitos por algo: sin frontera, el auditor
   deriva hacia código adyacente y produce hallazgos fuera de alcance que nadie pidió.
4. **¿Qué ya se sabe?** Revisa si existe skill destilada de corridas anteriores en
   `.claude/skills/audit-<flujo>/SKILL.md`. Si existe, sus supresiones (falsos positivos
   ya descartados, con fecha y razón) y hotspots son tu punto de partida. Re-reportar un
   falso positivo ya descartado es el error más caro de imagen que puede cometer un
   auditor: entrena al humano a ignorarte.

Regla de encuadre de proporcionalidad: define desde el inicio qué NO importa en este tipo
de artefacto. Ejemplo real de la dimensión `aud-perf` del workflow: "en un CLI de
scaffolding el I/O sync suele ser aceptable — solo reporta lo que de verdad importa".
Escribe esas exclusiones antes de empezar; te inmunizan contra hallazgos teóricos.

## A.2 Procedimiento paso a paso

1. **Identifica flujo y archivos.** Nombra el flujo en kebab (`devground-init`,
   `swift-foundation-fase-1`). Enumera `paths` absolutos. Incluye los docs que declaran
   requisitos (`readmePaths`) — sin ellos, el rol Validación no tiene contrato que verificar.
2. **Carga el prior.** `cat .claude/skills/audit-<flujo>/SKILL.md` si existe. Anota
   supresiones vigentes (con su gatillo de re-validación) y hotspots.
3. **Revisa por dimensiones en paralelo, no en una pasada monolítica.** Las 11 dimensiones
   reales están en `deepcheck.workflow.js` (`DIMENSIONS`): `qa-happy`, `qa-edge`,
   `qa-errors`, `val-requirements`, `val-contracts`, `aud-security`, `aud-perf`,
   `aud-limits`, `aud-types`, `aud-tests`, `aud-concurrency` (esta última SOLO Swift; en
   flujos no-Swift devuelve vacío, no inventa). Cada dimensión es un agente/pasada con
   una sola pregunta. La instrucción clave por dimensión: *"Reporta SOLO hallazgos con
   evidencia concreta del código. Si no hay nada real en tu dimensión, devuelve findings
   vacío. No inventes para llenar."* — cópiala literal, funciona.
4. **Exige el shape completo por hallazgo:** `{title, severity, file, line, evidence,
   rationale}`. `evidence` cita código real (archivo:línea y el fragmento); `rationale`
   explica el impacto para el usuario/operación, no repite el título. Un hallazgo sin
   `file:line` no existe.
5. **Dedup ANTES de verificar** (barrera obligatoria). El mismo bug aflora en varias
   lentes (en run-3, un solo defecto de `readPackageJson` apareció por `qa-edge`,
   `qa-errors` y `val-contracts`). Fusiona en UNA entrada canónica por problema raíz, con
   la severidad más alta y `reportedBy` listando las dimensiones. No inventes ni descartes
   al fusionar: solo agrupa. (Motivo económico: verificar antes de dedup paga refutadores
   3× por el mismo issue.)
6. **Verificación adversarial de CADA hallazgo — no opcional.** Tres refutadores
   independientes con lentes distintas (las literales del workflow):
   - **CORRECTITUD**: ¿el código realmente se comporta como dice el hallazgo? Lee línea por línea.
   - **CONTEXTO**: ¿hay una salvaguarda, test o convención del proyecto que lo neutraliza?
   - **IMPACTO**: aunque sea técnicamente cierto, ¿tiene impacto real, o es teórico/cosmético en este flujo? Refuta si el impacto es nulo.
   El refutador recibe la instrucción de ser escéptico y de refutar ante la duda razonable.
   Regla de confirmación (código real, `isConfirmed`): confirmado si
   `refutedCount < ceil(voteCount/2)` — mayoría de refutadores NO logró refutarlo. Se usan
   3 refutadores porque con 2 la "mayoría" colapsa a unanimidad y un solo escéptico mata
   hallazgos reales (bug corregido en el propio workflow; no lo reintroduzcas).
7. **Reporta confirmados Y descartados.** Los descartados van en su propia sección con la
   razón de refutación. Nunca los ocultes: la transparencia sobre qué se evaluó y por qué
   se cayó es lo que hace confiable el reporte (ver la sección "Descartados" de
   `audits/devground-init/run-3.md` — las refutaciones son tan detalladas como los hallazgos).
8. **Destila (opcional pero valioso).** Escribe/actualiza
   `.claude/skills/audit-<flujo>/SKILL.md`: invariantes confirmadas, supresiones con fecha
   + razón + gatillo de re-validación, hotspots por dimensión. Anti-ceguera: las
   supresiones se re-validan en cada corrida (¿cambió el código que las justificaba?), no
   se confían indefinidamente.

Si el flujo es grande, no ejecutes esto a mano: invoca la skill `deepcheck` con el
Workflow `packages/deepcheck/workflows/deepcheck.workflow.js` — el pipeline de arriba ya
está codificado ahí.

## A.3 Heurísticas con umbrales

Orden de prioridad de señales (de más a menos rentable por minuto de auditoría):

1. **Seguridad en fronteras de entrada** (`aud-security`): `execSync`/`exec` con strings
   construidos por concatenación, path traversal, secretos en claro. ROJA siempre:
   cualquier entrada externa que llegue a un shell o a una ruta sin validar. Es "el punto
   más crítico" según la propia dimensión.
2. **Promesas incumplidas del contrato** (`val-requirements`/`val-contracts`): el README
   dice "no sobreescribe nada" — ¿de verdad chequea antes de escribir? ROJA si el claim
   falso puede causar pérdida de datos o falso éxito en CI; AMARILLA si vive en un bloque
   ilustrativo (ejemplo real: el diff del README que promete `tsconfig.typecheck.json`
   incondicional fue LOW porque está en un bloque colapsable).
3. **Falso éxito**: código que reporta `success` sin haber hecho el trabajo (exit 0 con
   cero efectos, tally que cuenta skips como éxitos). ROJA en CI/pipelines (nadie mira más
   que el exit code); AMARILLA en uso interactivo (el humano ve los warnings).
4. **Validación de forma en datos parseados**: JSON/YAML parseado y usado sin verificar
   que sea el shape esperado. ROJA si la forma inesperada causa data loss silencioso
   (ejemplo real HIGH de run-3: `package.json` como array → reescribe el archivo vacío y
   reporta éxito); AMARILLA si solo produce un TypeError ruidoso.
5. **Tests ausentes en rutas críticas** (`aud-tests`): OJO con el alcance — ADR-0012 de
   devground define "ruta crítica" de forma CERRADA: dinero, leads/datos de conversión,
   auth. Deuda de cobertura fuera de esas tres categorías es AMARILLA como mucho, y citar
   ADR-0012 para inflarla es un error que el filtro adversarial castiga (pasó en run-3:
   hallazgo "high" refutado exactamente por eso). Excepción que sí es ROJA-alta: un fix
   introducido a propósito contra un bug conocido, sin test que lo proteja de regresión.
6. **Concurrencia Swift** (`aud-concurrency`): ROJA — `@unchecked Sendable` sin
   justificación escrita; tipo no-`Sendable` cruzando frontera de aislamiento;
   `Domain`/capa base importando UIKit/SwiftUI (rompe ADR-0013, core puro). AMARILLA —
   `.defaultIsolation(MainActor.self)` en capas base portables (antipatrón: hops de actor).
7. **Perf y límites** (`aud-perf`, `aud-limits`): solo el costo DOMINANTE del flujo. ROJA
   si hay multiplicación de trabajo caro conocible de antemano (ejemplo real MEDIUM:
   6 subprocesos `add -D` en serie que podrían ser 1 — 6× la latencia dominante).
   AMARILLA/silencio para I/O sync en herramientas de un disparo.

Regla de corte general: si no puedes escribir la **cadena causal completa** —entrada
concreta → línea concreta → comportamiento erróneo observable → daño para alguien— el
hallazgo es amarillo como máximo, y si además el gatillo no es alcanzable desde el código
real, no se reporta.

## A.4 Taxonomía de hallazgos

Severidades (enum real del workflow): `critical | high | medium | low | info`.

- **critical**: daño en producción sin intervención — pérdida de datos de usuario,
  secreto expuesto, inyección explotable.
- **high**: data loss silencioso, falso éxito en camino principal, regresión sin red en
  un fix deliberado. (Los dos HIGH reales de run-3: data loss por JSON malformado; guarda
  anti-falso-éxito de CI sin test.)
- **medium**: contrato externo deshonesto sin pérdida de datos (tally que sobre-reporta),
  costo dominante multiplicado innecesariamente.
- **low**: desalineación docs↔código en material ilustrativo, cableado sin test cuando la
  lógica pura sí está cubierta.
- **info**: observación sin acción requerida. Úsala poco; suele ser ruido con corbata.

Qué reportar vs callar:

- **Reporta** todo lo confirmado por el filtro adversarial, cada uno con evidencia
  `file:line` y rationale de impacto. Reporta también los descartados en sección aparte
  con su razón.
- **Consolida** manifestaciones múltiples de una misma raíz en UN hallazgo (la severidad
  del conjunto = la más alta de las manifestaciones) y di explícitamente que el fix
  correcto está en la raíz, no en parchear cada síntoma.
- **Calla** (ni siquiera envíes a refutación): estilo que un linter ya vigila, deuda
  hipotética ("podría ser problema si algún día…"), hallazgos fuera de los `paths`
  acordados, y cualquier cosa cubierta por una supresión vigente cuyo gatillo de
  re-validación no se activó.

## A.5 Modos de falla del auditor (y el antídoto concreto)

Estos son los errores que los modelos cometemos auditando. Los vi en mis propias corridas
y en las de otros:

1. **El falso positivo plausible**: mecanismo técnicamente correcto, síntoma inalcanzable.
   El caso de libro está en run-3: "action async + `program.parse()` síncrono → unhandled
   rejection". Todo el mecanismo era verificable y cierto… pero al leer la fuente de
   `prompts@2.4.2` resultó que ningún path de rechazo era alcanzable desde ese call site
   (la cancelación RESUELVE, no rechaza). **Antídoto**: la lente IMPACTO exige rastrear el
   gatillo hasta una entrada alcanzable. Si el gatillo requiere una configuración que el
   código nunca produce, es fragilidad latente → se refuta.
2. **Inventar para llenar la cuota**: una dimensión sin hallazgos reales fabrica uno
   cosmético. **Antídoto**: instrucción explícita "si no hay nada real, devuelve findings
   vacío" + el filtro adversarial que lo cobra después. Cero hallazgos en una dimensión
   es un resultado válido y valioso.
3. **Inflar severidad citando una rúbrica que no aplica**: etiquetar "high, viola ADR-X"
   sin leer el alcance del ADR. **Antídoto**: antes de citar un ADR, lee su sección
   "Aplica a" y verifica que el caso cae dentro. El paso es literal: `Read docs/adr/00NN-*.md`
   y cita la línea de alcance en tu rationale.
4. **Re-descubrir lo ya descartado**: repetir un falso positivo que una corrida anterior
   ya refutó. **Antídoto**: cargar la skill destilada ANTES de revisar y respetar sus
   supresiones — salvo que el gatillo de re-validación se haya activado (el código
   suprimido cambió). Y su inverso, **la supresión ciega**: confiar en supresiones viejas
   para siempre. Antídoto: cada supresión lleva fecha + razón + gatillo, y se re-valida.
5. **Verificarse a sí mismo**: el mismo contexto que produjo el hallazgo lo "confirma".
   Confirmarás tu propio sesgo. **Antídoto**: los refutadores son agentes/pasadas
   INDEPENDIENTES, sin acceso al razonamiento del que reportó — solo reciben el hallazgo
   (title, severity, file:line, evidence, rationale) y el código. Con 3 lentes distintas
   y regla de mayoría real.
6. **Hallazgo sin ancla**: "el manejo de errores es débil en general". **Antídoto**: el
   schema exige `file` y `line` como campos required. Si no puedes anclarlo, no es un
   hallazgo, es una impresión.

## A.6 Patrón de prompt reutilizable (agente auditor de una dimensión)

```
CONTEXTO DEL FLUJO
- Flujo: <nombre-kebab>
- Archivos en alcance (SOLO estos): <lista de rutas absolutas>
- Requisitos declarados: <rutas de README/docs>
- Rúbrica: <rutas de ADRs aplicables — verifica el "Aplica a" de cada uno antes de citarlo>
- Conocimiento previo: <contenido de .claude/skills/audit-<flujo>/SKILL.md, o "ninguno">
  RESPETA sus supresiones: NO re-reportes lo documentado como falso positivo, SALVO que
  el código haya cambiado y el gatillo de re-validación aplique. Ataca primero sus hotspots.

TU DIMENSIÓN [<rol> / <clave>]: <pregunta única de la dimensión, con sus exclusiones de
proporcionalidad — ej. "en un CLI de un disparo el I/O sync es aceptable">

Reporta SOLO hallazgos con evidencia concreta del código. Si no hay nada real en tu
dimensión, devuelve findings vacío. No inventes para llenar.

Por hallazgo, JSON: { "title": <defecto en una frase, afirmativa y específica>,
"severity": "critical|high|medium|low|info", "file": <ruta>, "line": <n>,
"evidence": <qué dice el código, citando archivo:línea>,
"rationale": <cadena causal: entrada concreta → comportamiento erróneo → daño para quién> }
```

Y el prompt del refutador (uno por lente, tres lentes por hallazgo):

```
INTENTA REFUTAR este hallazgo. Eres escéptico: tu trabajo es demostrar que es un FALSO
POSITIVO si lo es. Ante la duda razonable, refuta (refuted=true).

Lente — <CORRECTITUD: lee el código citado línea por línea y verifica el comportamiento |
CONTEXTO: busca la salvaguarda/test/convención que lo neutraliza |
IMPACTO: rastrea el gatillo; si no es alcanzable o el daño es teórico, refuta>

HALLAZGO: <title / severity / file:line / evidence / rationale>

Devuelve: { "refuted": bool, "reason": <justificación citando código>, "confidence": 0-1 }
```

Confirmación: `refutedCount < ceil(3/2)` → confirmado. Reporta ambas listas.

## A.7 Ejemplo entrada→salida (caso real, corrida `devground-init` run-3)

**Entrada**: auditar el CLI de scaffolding `devground-init` (paths: `packages/cli/src/`,
README raíz y del CLI, ADRs 0007–0012, skill destilada de run-2 con supresiones vigentes).

**Hallazgo BUENO (confirmado, HIGH)** — nota la cadena causal completa y la consolidación:

> `readPackageJson`/`detectStack` no validan que el JSON parseado sea un objeto plano:
> un `package.json` malformado (array/escalar/null) provoca data loss silencioso.
> `packages/cli/src/ops/package-json.ts:9-13` castea a `Record<string,unknown>` sin
> chequear la forma. Con `[]`: `'prettier' in pkg` es false → instala dependencias reales,
> asigna `pkg.prettier = '…'`, y `JSON.stringify([])` reescribe el archivo SIN esa clave
> (data loss) y reporta `success` (falso éxito). Tres manifestaciones, una raíz: el fix va
> en `readPackageJson`, no en cada installer. Severidad = la más alta (high, por el data loss).

Por qué es bueno: entrada concreta reproducible, línea exacta, comportamiento verificado
paso a paso, daño explícito, manifestaciones consolidadas, fix apuntado a la raíz.

**Hallazgo MALO (descartado 2/3)** — el falso positivo plausible:

> "El callback `.action()` es async pero se invoca con `program.parse()` síncrono: un
> rechazo del prompt escapa como unhandled rejection."

Por qué se cayó: el mecanismo es 100% cierto (verificado hasta en la fuente de
commander@13.1.0), pero la lente IMPACTO rastreó cada path de rechazo de `prompts@2.4.2`
y ninguno es alcanzable desde ese call site — la cancelación con Ctrl+C RESUELVE con un
objeto manejado, no rechaza. Fragilidad latente ≠ defecto. Un auditor sin filtro
adversarial lo habría reportado y habría quemado credibilidad.

---

# Parte B — ORQUESTAR

## B.1 Modelo mental: descomponer y asignar

La orquestación en devground es un pipeline con separación estricta de poderes
(ADR-0017): **el juicio es barato y ajustable; las invariantes son código y no se
negocian**. La secuencia mental:

1. **La descomposición no es tuya**: viene de `spec-flow` (brief con `### Tasks`, o mejor,
   `docs/specs/<change>.tasks.json` machine-readable emitido por el Step 3.5). Si no hay
   brief, primero va spec-flow; el orquestador NO se usa para tareas sueltas.
2. **Cada tarea tiene una NATURALEZA (`kind`) que manda sobre el contexto global**: dentro
   de un cambio Tier 2, "actualizar README" sigue siendo barata (haiku) y "decisión de
   arquitectura" sigue siendo sagrada (opus/max). Este es el bug que la precedencia de
   `policy.json` corrige explícitamente: el tier global se filtraba a tareas mecánicas y
   las encarecía. Clasifica por tarea, no por proyecto.
3. **Piso determinista → ajuste ±1 por juez barato → clamp en código**. El piso lo calcula
   `engine.mjs` recorriendo `policy.json.rules` de arriba hacia abajo (primera regla que
   matchea, AND interno). El agente `model-router` (corre en Haiku) solo PROPONE ajustes;
   `engine.mjs clamp()` recorta cualquier propuesta que viole las invariantes. Nunca
   delegues las invariantes al prompt del juez: el zorro no cuida el gallinero.
4. **Costo honesto y aprobación antes de gastar**: plan con costo estimado (o "pendiente"
   si la tarifa no está verificada en `pricing.json` — JAMÁS un número inventado),
   presentado al humano, ejecutado solo con luz verde.
5. **Cerrar el lazo**: cada decisión a `decisions.jsonl` (append-only), reconciliada con
   tokens reales (`engine.mjs reconcile`), y medida contra "todo en Opus"
   (`engine.mjs metrics`) — el ahorro con bajo error de estimación es lo que justifica
   el harness; si no se cumple, se ajusta `policy.json`, no se abandona la telemetría.

## B.2 Criterios de routing con umbrales (los reales de `policy.json`)

Tabla de piso, en orden de precedencia (primera que matchea gana):

| Regla | Condición | Asignación | Locked |
|---|---|---|---|
| `judgment-work` | kind ∈ {plan, audit, decision, adr, architecture, design, security-review} | **opus/max** | SÍ |
| `mechanical-docs-chore` | kind ∈ {docs, chore, style} | haiku/low | no |
| `high-risk` | risk = high (migración de datos, contratos externos, auth, dinero, concurrencia, irreversible) | **opus/high** | SÍ |
| `breaking-change` | breaking = true | opus/high | no |
| `tier3-large-or-unknown` | tier = 3 | opus/high | no |
| `tests` | kind = test | sonnet/low | no |
| `tier2-*` | tier = 2 (cualquier type) | sonnet/high | no |
| `tier1-feature` | tier = 1 ∧ type ∈ {feat, fix} | sonnet/medium | no |
| `trivial-tier0` | tier = 0 | haiku/low | no |
| `default` | sin match | sonnet/medium | no |

Reglas de escalada/desescalada (invariantes de `engine.mjs`, no de juicio):

- **±1 nivel máximo** de `capability_order = [haiku, sonnet, opus]`; el effort también
  se acota a ±1 de `effort_order = [low, medium, high, xhigh, max]` respecto al piso.
- **`locked` nunca desescala** (ni modelo ni effort por debajo del piso; escalar sí se puede).
- **Lógica nueva no cae a Haiku**: solo kinds sin lógica nueva
  (`refactor, chore, docs, style, rename, spike`) pueden bajar hasta haiku. Un
  feat/fix/perf, AUNQUE siga un patrón conocido del proyecto, no baja de sonnet — el
  patrón conocido reduce el ESFUERZO (sonnet/low), no el MODELO. Razón económica: mandar
  lógica nueva a un modelo barato ahorra centavos y arriesga retrabajo que cuesta más.
- **Escalar el modelo sube el effort** al menos un nivel (opus/medium para algo crítico
  desaprovecha la escalada).
- **Propuesta del juez sin JSON válido o sin `reason` → se descarta, queda el piso.**

Cuándo escala el juez (+1): lógica concurrente, transacciones, invariantes sutiles,
seguridad/criptografía, algoritmo no trivial, ambigüedad de diseño, o —si lee los archivos
que la tarea toca— código más enredado de lo que el título sugiere. Cuándo desescala (−1):
SOLO tareas obviamente mecánicas y no bloqueadas. Ante la duda, no desescala: el balance
precio/calidad se gana siendo PRECISO, no barato.

Optimización del routing mismo: **nunca rutees con Opus** — el juez corre en Haiku. Salta
el juez si el piso ya es opus/max + locked (no hay a dónde moverse). Con ≤3 tareas, aplica
tú mismo el criterio de `model-router.md` sin despachar el agente (despachar cuesta más
que decidir).

## B.3 Paralelizar vs secuenciar; barrera vs pipeline

Criterio único: **la topología la dicta `depends_on`, no las ganas de ir rápido.**

- **Paralelo**: tareas con `depends_on: []` entre sí. También: consultas al `model-router`
  (cada juicio es independiente) y las 11 dimensiones de review de deepcheck.
- **Secuencia/pipeline**: cadenas de dependencia. Las tareas `plan`/`audit`/`decision`
  corren PRIMERO si otras dependen de su resultado — su salida es insumo, no adorno.
- **Barrera (esperar todos) solo cuando la etapa siguiente necesita el conjunto completo.**
  Los dos casos canónicos en el repo:
  - deepcheck: Review es barrera porque el **dedup necesita TODOS los hallazgos** antes de
    fusionar (y fusionar antes de verificar evita pagar refutadores 3× por el mismo issue).
  - model-orchestrator: la presentación del plan es barrera (necesitas todas las
    asignaciones para el costo total y la aprobación).
- **Pipeline (sin barrera) cuando cada resultado puede fluir solo**: en deepcheck, los
  hallazgos de una dimensión entran a verificación mientras otras dimensiones aún revisan
  — no hay razón para que el hallazgo 1 espere al revisor 11.

Regla de decisión compacta: ¿la etapa N+1 consume el AGREGADO de la etapa N (dedup, suma
de costos, ranking)? → barrera. ¿Consume elementos INDIVIDUALES? → pipeline. ¿No consume
nada de otras ramas? → paralelo puro.

## B.4 Heurísticas de descomposición (fronteras de subtarea)

Una subtarea está bien delimitada cuando el subagente puede ejecutarla leyendo SOLO su
prompt. Checklist de frontera:

1. **Un entregable verificable** por subtarea ("endpoint POST con test que pasa"), no una
   dirección ("mejorar el API"). Si no puedes escribir el criterio de éxito en una línea,
   la tarea está mal cortada.
2. **`kind` único**: si una "tarea" mezcla decisión de diseño + implementación, son DOS
   (la decisión es opus/max locked; la implementación sonnet). Cortar por kind es cortar
   por modelo — mezclar kinds te obliga a pagar el modelo del kind más caro por todo.
3. **Archivos explícitos**: cada tarea lista sus rutas (el brief de spec-flow las trae).
   Sirve doble: el subagente no explora a ciegas, y el `model-router` puede leerlas para
   calibrar complejidad real.
4. **`size` por tarea** (small/medium/large, o `est_tokens`): es tu única responsabilidad
   en la estimación de costo — el motor hace el resto.
5. **Dependencias explícitas, mínimas**: `depends_on` solo cuando la salida de A es
   entrada literal de B. Dependencias "por las dudas" secuencializan lo paralelizable.
6. **Contexto autocontenido**: el subagente NO ve tu conversación. Todo lo que necesita
   (título, descripción, archivos, convenciones del repo relevantes, criterio de éxito)
   va en su prompt. Si al escribir el prompt necesitas más de ~1 párrafo de contexto de
   fondo, considera si la frontera está mal puesta o si falta un artefacto intermedio
   (un archivo de decisión que la tarea anterior deba producir).

## B.5 Modos de falla del orquestador (y las reglas que los evitan)

1. **Sobre-orquestar lo trivial.** Un typo no necesita plan, router ni aprobación.
   Regla dura: Tier 0 procede directo (está exento hasta en spec-flow); con ≤3 tareas no
   despaches el agente router; sin brief no hay orquestación. El overhead de orquestar
   debe ser < 10% del costo de ejecutar — si no, ejecuta directo.
2. **Confiar las invariantes al juez barato.** Lo verás pasar (está documentado en el
   SKILL.md): el router en Haiku "razona" que un feat con lógica nueva es mecánico y
   propone haiku. No lo discutas con más prompt; el clamp en código lo recorta. Regla:
   toda invariante vive en `engine.mjs`/`policy.json`, jamás solo en el prompt del agente.
3. **Fan-out sin dedup.** N agentes paralelos sobre el mismo objeto reportan el mismo
   problema N veces; verificar sin fusionar paga el filtro N×. Regla: entre fan-out y
   cualquier etapa cara (verificación, síntesis, ejecución) va SIEMPRE una barrera de
   dedup/merge.
4. **Subagente con contexto insuficiente.** Síntomas: el subagente re-explora el repo
   desde cero, pregunta cosas que el brief ya respondía, o entrega algo que viola una
   convención obvia. Regla: aplica el checklist B.4 (#6) antes de despachar; si el prompt
   no pasa el test "¿podría ejecutarlo alguien sin acceso a esta conversación?", no
   despaches.
5. **Costos inventados y ejecución sin permiso.** Regla doble del harness: tarifa no
   verificada en `pricing.json` → `est_cost_usd: null` y "pendiente de tarifa" (nunca el
   bloque `estimate` como precio real); y el plan SIEMPRE se presenta y se aprueba antes
   de despachar — esto gasta dinero real.
6. **Orquestar sin telemetría.** Sin `decisions.jsonl` + reconciliación no puedes saber
   si el routing ahorra o degrada. Regla: una línea por tarea ejecutada, append-only, con
   estimado Y real; `engine.mjs metrics` responde si el harness se justifica.

## B.6 Patrón de prompt reutilizable (subagente de trabajo)

```
TAREA <id> de <n> del cambio "<change>" (Tier <t>).

QUÉ: <título>. <descripción con el criterio de éxito verificable en una línea>.

ARCHIVOS: <rutas absolutas que toca; cuáles crear, cuáles editar>.
NO toques nada fuera de esta lista.

CONTEXTO QUE NECESITAS (no explores de más):
- <decisiones ya tomadas que te afectan, con su fuente: "según ADR-00NN…" / salida de la tarea M>
- <convenciones del repo relevantes: estilo, framework de test, estructura>
- <si depende de otra tarea: qué produjo y dónde quedó>

VERIFICACIÓN antes de reportar: <comando concreto — test, build, selftest — que debe pasar>.

REPORTA al terminar: qué hiciste, rutas absolutas tocadas, resultado de la verificación,
y cualquier supuesto que tuviste que tomar (NO lo escondas).
```

Despacho: cada tarea con su `{model, effort}` del plan aprobado, vía Workflow
(`agent(prompt, {model, effort, label: "task-<id>:<model>"})`) — paralelo para
`depends_on: []`, pipeline para cadenas. Sin Workflow, degrada a la herramienta Agent
respetando dependencias en secuencia. Captura los tokens reales de la notificación
(`<usage><subagent_tokens>`) para la reconciliación.

## B.7 Ejemplo entrada→salida

**Entrada** (brief de spec-flow, Tier 2, type feat, risk med): "Agregar rate limiting al
API del CLI de telemetría: (1) decidir estrategia (token bucket vs ventana fija) y
documentarla como ADR, (2) implementar el middleware, (3) tests del middleware,
(4) actualizar el README".

**Salida del routing** (piso por `policy.json` + juicio ±1 + clamp):

| Tarea | kind | Piso (regla) | → Final | Ajuste | Por qué |
|---|---|---|---|---|---|
| 1. Decidir estrategia + ADR | decision | opus/max (`judgment-work`, locked) | opus/max | 0 | Locked: se salta el router (no hay a dónde moverse) |
| 2. Implementar middleware | feat | sonnet/high (`tier2-standard`) | opus/high | +1 | El router leyó el código: rate limiting = estado compartido + concurrencia, señal genuina de escalada; el effort ya estaba en high |
| 3. Tests del middleware | test | sonnet/low (`tests`) | sonnet/low | 0 | Piso correcto: tests sobre código existente |
| 4. Actualizar README | docs | haiku/low (`mechanical-docs-chore`) | haiku/low | 0 | La naturaleza manda sobre el Tier 2 global: sigue siendo mecánica |

Topología: tarea 1 primero (2 y 3 dependen de la estrategia elegida); 2 → 3 en pipeline;
4 en paralelo con la cadena 2→3 (no depende de la estrategia, solo del cambio final —
si el README documenta la estrategia, entonces depende de 1 y va en paralelo con 2).
Presentar tabla + costo (con "pendiente" en los modelos sin tarifa verificada), esperar
aprobación, despachar, registrar 4 líneas en `decisions.jsonl`, reconciliar con tokens
reales.

Contraejemplo de lo que el clamp evita: si el router propusiera "la tarea 2 sigue el
patrón de middleware ya existente → haiku", `engine.mjs` la recorta a sonnet con razón
registrada ("feat = lógica nueva, no baja de sonnet") — el patrón conocido habría
justificado sonnet/low, nunca haiku.

---

# Parte C — Meta: las reglas densas

1. **Un hallazgo sin `file:line`, sin cadena causal (entrada → línea → daño) o sin
   rúbrica citada-y-verificada no es un hallazgo: es una impresión.** No lo reportes.
2. **Nada se reporta sin sobrevivir refutación adversarial independiente** (3 lentes:
   correctitud, contexto, impacto; confirmado si `refutados < ceil(votos/2)`), y los
   descartados se publican con su razón — la transparencia es lo que compra confianza.
3. **El falso positivo plausible se mata por el gatillo**: mecanismo cierto + síntoma
   inalcanzable = refutado. Rastrea siempre si existe una entrada real que dispare el
   comportamiento; "latente" no es "defecto".
4. **Consolida por raíz, no por síntoma**: N manifestaciones del mismo origen = 1 hallazgo
   con la severidad más alta y el fix apuntado a la raíz.
5. **Cero hallazgos es un resultado válido.** "Si no hay nada real, devuelve vacío; no
   inventes para llenar" — y carga las supresiones previas antes de revisar (con
   re-validación fechada, para no volverte ciego).
6. **La naturaleza de la tarea manda sobre el contexto global**: un README dentro de un
   cambio grande sigue siendo haiku; una decisión dentro de un cambio chico sigue siendo
   opus/max. Clasifica por `kind`, primera regla que matchea gana.
7. **Juicio barato, invariantes en código**: el juez de routing corre en Haiku y solo
   propone ±1; el clamp determinista (`engine.mjs`) impone que lo locked no baja, que la
   lógica nueva (feat/fix/perf) jamás cae a haiku —el patrón conocido baja el esfuerzo,
   no el modelo—, y que escalar modelo sube esfuerzo. Nunca delegues una invariante a un
   prompt.
8. **Planes, auditorías y decisiones son sagrados** (opus/max, locked); y nunca rutees
   con el modelo caro — decidir la asignación cuesta centavos, ejecutarla mal cuesta
   retrabajo. Ante la duda, NO desescales.
9. **Barrera solo cuando la etapa siguiente consume el agregado** (dedup, costo total,
   aprobación); pipeline cuando consume elementos individuales; paralelo cuando no consume
   nada de otras ramas. Y entre fan-out y cualquier etapa cara va SIEMPRE un dedup.
10. **Honestidad económica y lazo cerrado**: sin tarifa verificada el costo es "pendiente"
    (jamás inventado); nada se ejecuta sin aprobación explícita; toda decisión va a
    `decisions.jsonl` y se reconcilia con tokens reales — si el ahorro vs "todo en Opus"
    no aparece con error de estimación bajo, se ajusta la política, no la telemetría.
