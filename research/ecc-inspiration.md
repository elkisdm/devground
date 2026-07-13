# ECC como fuente de inspiración — evaluación de features

**Trabajo de este documento:** decidir qué features de [ECC](https://github.com/affaan-m/ECC)
(Everything Claude Code, affaan-m) vale la pena adoptar en devground, en qué forma, y qué
gate de testeo debe pasar cada una antes de ir a `main`. Todo el trabajo derivado vive en
ramas separadas hasta cumplir su gate.

La objeción obvia primero: **ECC es maximalista (278 skills, 67 agentes, 94 comandos legacy)
y devground es curado — ¿no es copiar ECC traicionar la filosofía?** No, si el filtro es
el correcto: adoptamos *mecanismos de distribución y automatización* que ECC validó con
tracción masiva, nunca su volumen de contenido. Cada feature se evalúa contra lo que
devground ya tiene (dreaming, deepcheck, gitleaks, agents-md) antes de proponer nada nuevo.

## Criterio de evaluación

Una feature entra solo si pasa los tres filtros:

1. **No duplica** un paquete existente de devground — si se solapa, se *adapta dentro* del
   paquete existente, no se crea uno nuevo.
2. **Sobrevive sin el harness** o degrada con gracia — devground es multi-agente
   (AGENTS.md como source of truth); una feature acoplada solo a Claude Code debe ser
   opt-in y aislada.
3. **Tiene gate verificable** — un criterio de salida medible antes de mergear a `main`
   (tests vitest + dogfooding en este mismo repo, el mismo camino que siguieron
   deepcheck y dreaming).

## Veredictos

| # | Feature de ECC | Veredicto | Dónde vive en devground |
|---|----------------|-----------|--------------------------|
| 1 | Distribución como plugin de Claude Code | **Adoptar** | nuevo `.claude-plugin/` en el repo |
| 2 | Hooks del harness (`hooks.json`) | **Adoptar parcial** (3–4 hooks curados, no 22) | extensión de `@devground/agents-md` |
| 3 | Continuous Learning / instincts | **Adaptar dentro de `dreaming`** (confidence score + cap de inyección) | `@devground/dreaming` |
| 4 | AgentShield (scan de configs de agente) | **Adaptar mínimo** (usar la herramienta, no reimplementarla) | `@devground/husky-config` + skill de deepcheck |
| 5 | Strategic compact / token optimization | **Descartar** | — |

---

## 1. Plugin de Claude Code — Adoptar

> **Estado:** implementado en esta rama (`.claude-plugin/` + `skills/` con symlinks a las
> fuentes, cero duplicación). Verificado con una instalación real: `claude plugin
> validate` pasa, marketplace + install funcionan y los symlinks resuelven en el caché.
> Los hooks quedaron deliberadamente fuera del plugin (correrían dos veces junto a
> `devground-hooks`) y un test lo hace permanente. Matriz plugin vs npx en
> `docs/claude-plugin.md`. Pendiente del gate: probar `/plugin install` desde GitHub
> (no solo path local) cuando la rama sea visible.

**Qué hace ECC.** Empaqueta skills, comandos y hooks en `.claude-plugin/plugin.json` +
`marketplace.json` (marketplace auto-hosteado) y se instala con `/plugin install ecc@ecc`.
Es su canal principal de distribución. Detalle no obvio que ECC documenta y protege con
tests de regresión: Claude Code v2.1+ carga `hooks/hooks.json` automáticamente por
convención — declarar `"hooks"` en `plugin.json` produce errores de detección duplicada.

**Qué tenemos.** Las skills de devground (cimientos, spec-flow, dreaming, design-taste,
escritura-tecnica) se distribuyen copiando archivos vía instaladores npm (`npx
@devground/dreaming`). Funciona, pero exige un `npx` por skill y por proyecto.

**Propuesta.** Un `.claude-plugin/` en el root del monorepo que empaquete las skills ya
publicables como plugin `devground@devground`. npm sigue siendo el canal para *configs*
(la ventaja del versionado semver no se toca); el plugin es un canal adicional para
*skills*, donde el modelo copiar-archivos ya era el vigente.

**Riesgos.** (a) Doble instalación plugin + npx duplicaría skills — ECC sufrió esto y lo
resolvió con warnings explícitos; heredar la lección desde el día uno. (b) El formato de
plugin de Claude Code aún evoluciona; anclar a la convención documentada y cubrirla con
un test que valide el manifest.

**Gate para `main`:**
- `plugin.json` validado por test (schema + rutas existen).
- Instalación en un repo limpio: `/plugin install` → las skills responden a sus triggers.
- Convivencia probada: plugin instalado sobre un proyecto que ya corrió `npx @devground/dreaming` no duplica ni pisa.
- README del plugin con la matriz "cuándo plugin vs cuándo npx".

## 2. Hooks del harness — Adoptar parcial

> **Estado:** implementado en `packages/agents-md` (bin `devground-hooks`, 53 tests de
> contrato) con dogfooding activo vía `.claude/settings.json` de este repo apuntando a
> la fuente del paquete. Latencia medida del typecheck single-file: ~0.9s. Pendiente:
> las 2 semanas de dogfooding del gate antes de considerar `main`.

**Qué hace ECC.** ~22 hooks sobre los eventos de Claude Code: PreToolUse (bloquear `npm
run dev` fuera de tmux, quality check pre-commit), PostToolUse (`tsc --noEmit` tras editar
`.ts`, prettier automático, warning de `console.log`), y ciclo de vida (session summary en
Stop, persistencia pre-compact, notificaciones).

**Qué tenemos.** Solo git hooks (husky: lint-staged + gitleaks + commitlint). El hueco
real: los errores se detectan al *commitear*, no al *editar* — un agente puede acumular
20 ediciones rotas antes de que el pre-commit las rechace.

**Propuesta.** Un `hooks/hooks.json` curado dentro de `@devground/agents-md` (los hooks
son "reglas para agentes" ejecutables — mismo dominio del paquete), con 3–4 hooks, no 22:

| Hook | Evento | Por qué este sí |
|------|--------|-----------------|
| typecheck del archivo editado | PostToolUse (Edit) | acorta el ciclo de feedback de commit a edición |
| formato prettier del archivo editado | PostToolUse (Edit) | elimina diffs de formato del lint-staged |
| aviso de `console.log` | PostToolUse (Edit) | regla 5 de AGENTS.md (zero dead code) hecha ejecutable |
| session summary | Stop | insumo directo para `dreaming` (ver §3) |

Los hooks de tmux, notificaciones desktop y bloqueo de dev-server se descartan: opinan
sobre el entorno del usuario, no sobre el proyecto.

**Riesgos.** (a) Falsos positivos que entrenan al usuario a ignorar hooks — por eso el
gate mide ruido, no solo funcionamiento. (b) Latencia: `tsc --noEmit` por edición puede
ser lento en repos grandes; limitar al archivo tocado y medir.

**Gate para `main`:**
- Tests vitest de cada script de hook (entrada → exit code / stderr esperado).
- Dogfooding: 2 semanas activos en este repo; se mergea solo si los falsos positivos son
  ≈0 y la latencia por edición queda bajo ~2s.
- Kill switch documentado (variable de entorno para desactivar sin desinstalar), como el
  `ECC_HOOK_PROFILE` de ECC.

## 3. Continuous Learning — Adaptar dentro de dreaming

**Qué hace ECC.** Extrae "instincts" (patrones aprendidos) con confidence score, los
persiste en `$ECC_AGENT_DATA_HOME/skills/learned/`, e inyecta en SessionStart los de
mayor confianza con un cap (`ECC_MAX_INJECTED_INSTINCTS=6`, umbral 0.7). `/evolve`
clusteriza instincts en skills reutilizables.

**Qué tenemos.** `dreaming` ya es esto con mejor diseño de seguridad: consolidación
out-of-band con harness determinista (reusa el lector de transcripts de dev-metrics),
propuesta con evidencia por cambio, y **nada se escribe sin aprobación**. Crear un
sistema de instincts paralelo violaría el filtro 1.

**Propuesta.** Tomar de ECC exactamente dos mecanismos que a dreaming le faltan:

1. **Confidence score por memoria** — dreaming ya detecta duplicados y contradicciones;
   un score (frecuencia de evidencia × recencia) le da un criterio *cuantificado* para
   proponer deprecaciones y priorizar.
2. **Cap de inyección en SessionStart** — la memoria consolidada hoy no se re-inyecta de
   forma controlada. Un hook SessionStart (del §2) que inyecte las top-N memorias sobre
   el umbral cierra el ciclo: consolidar → puntuar → re-inyectar poco y bueno. El cap es
   la defensa contra el mismo problema que ECC identificó: memoria ilimitada inyectada
   es ruido de contexto.

Los principios de dreaming no se negocian: aprobación humana y nunca borrado duro.
El score *informa* la propuesta; no habilita escritura automática.

**Gate para `main`:**
- Tests del cálculo de score sobre bundles sintéticos (casos: duplicado exacto,
  contradicción, patrón recurrente, memoria huérfana).
- Un ciclo completo dogfoodeado en este repo: gather → propuesta con scores → aprobación
  → siguiente sesión arranca con las top-N inyectadas y verificamos que el cap se respeta.
- dreaming sigue en piloto privado; esto extiende el piloto, no lo salta.

## 4. AgentShield — Adaptar mínimo

**Qué hace ECC.** Scanner separado (`ecc-agentshield`, npm): 102 reglas estáticas sobre
secretos, permisos, hook injection, riesgo de servidores MCP y configs de agente; 1282
tests; modo `--opus` con tres agentes adversariales (attacker/defender/auditor); exit
code 2 para gatear CI.

**Qué tenemos.** gitleaks en pre-commit (higiene de secretos, ADR 0008) y deepcheck
(auditoría adversarial multi-agente). El hueco específico: nadie audita `.claude/`,
`hooks.json` ni configs MCP — superficie que crece justo con los §1–§3 de este documento.

**Propuesta.** No reimplementar 102 reglas — es exactamente el tipo de volumen que no
competimos. Dos movimientos chicos:

1. Evaluar `npx ecc-agentshield scan` **como herramienta externa** en CI (es MIT, exit
   code 2 gatea el build). Si el ruido es aceptable, adoptarla tal cual; devground no
   escribe ni mantiene una línea.
2. Una dimensión nueva en deepcheck ("configuración de agentes") para la auditoría
   razonada que un scanner estático no hace — deepcheck ya tiene los refutadores
   adversariales; es agregar una lente, no un sistema.

**Gate para `main`:**
- Corrida de agentshield sobre este repo triageada a mano: si >30% de los hallazgos son
  falsos positivos, se descarta la integración en CI y queda solo la lente de deepcheck.
- La lente de deepcheck pasa el ciclo normal del piloto (hallazgos confirmados
  adversarialmente, destilación a la skill de auditoría).

## 5. Strategic compact / token optimization — Descartar

ECC sugiere compactación manual tras ~50 tool calls y gestiona caps de contexto por
hooks. Descartado por tres razones: está acoplado a internals del harness que cambian
rápido, Claude Code ya gestiona compactación de contexto de forma nativa cada vez mejor,
y el costo de mantenimiento no lo paga ningún dolor observado en devground. Si el dolor
aparece, este documento se reabre con evidencia.

---

## Proceso: cómo va a `main`

Regla general del experimento, en una línea: **rama separada por feature, gate cumplido y
documentado en el PR, y nada se mergea por calendario — solo por gate.**

1. Cada feature (§1–§4) se desarrolla en su propia rama `claude/ecc-<feature>` colgando
   de esta exploración; PRs independientes y chicos.
2. El PR de cada feature enlaza su gate de esta página y muestra la evidencia (tests +
   resultado del dogfooding). Sin evidencia, el PR no se abre.
3. Lo que sobreviva su piloto gradúa a ADR (status Propuesto) — candidatos claros:
   "distribución dual npm + plugin" (§1) y "hooks de harness como parte de agents-md"
   (§2). Lo que no, se documenta aquí como descartado con la razón.

**Orden sugerido:** §2 (hooks) primero — es la base técnica de la re-inyección de §3 y
del empaquetado de §1, y su gate es el más barato de correr. Después §1, §3 y §4 en
paralelo si se quiere.

**Qué NO cubre este documento:** los agentes (67) y skills (278) de ECC como contenido —
la curación de devground es el producto y ahí no hay nada que importar al bulto. Si una
skill puntual de ECC resulta valiosa, se evalúa individualmente como se hizo con
design-taste (vendorizada de taste-skill, MIT).
