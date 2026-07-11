# ADR-0024: Integración del ecosistema ui-conventions

- **Estado**: Propuesto
- **Fecha**: 2026-07-11
- **Decisor**: edaza
- **Aplica a**: `tools/model-orchestrator/`, `packages/{deepcheck,eslint-config,chile-formats,cli,agents-md,ui-conventions}/`

## Contexto

ADR-0023 creó `@devground/ui-conventions` como una skill aislada: base universal + overlay
por proyecto, cargada como contexto **antes** de generar UI. Aislada, tiene tres huecos:

1. **No se auto-dispara en sesiones orquestadas.** Cuando la sesión orquesta (Fable/Opus
   como advisor), el código lo escribe un subagente (`ejecutor`) que recibe un brief, no un
   prompt de usuario interactivo — no hay turno en el que una skill de Claude Code se
   auto-dispare por keyword. Sin inyección explícita, las convenciones de UI nunca llegan al
   subagente que efectivamente escribe el código.
2. **No hay ciclo de retroalimentación.** Los hallazgos del audit (deepcheck) sobre UI no
   volvían a la base ni al overlay — cada auditoría redescubre los mismos patrones sin que
   el conocimiento se acumule.
3. **Reglas mecánicamente verificables gastaban tokens del LLM en vez de resolverse con
   lint**, y los helpers regionales (RUT, teléfono, moneda es-CL) se reimplementaban
   proyecto a proyecto en lugar de vivir en un paquete compartido.

## Decisión

Cerrar los tres huecos con cinco integraciones puntuales, cada una en el punto de contacto
existente en vez de un mecanismo nuevo:

**(a) Checklist UI/FRONTEND en `kind-playbooks.md` del model-orchestrator**, inyectado
**aditivamente** por superficie frontend detectada en la tarea — NO es un `kind` nuevo, el
ruteo de modelo/costo no cambia. Se mide igual que el resto de playbooks, vía
`playbook_injected` en `decisions.jsonl`.

**(b) Dimensión `aud-ui-conventions` en deepcheck** (guardada: solo corre en flujos que
tocan UI), la 13ª del array `DIMENSIONS[]`. Audita la base de `@devground/ui-conventions`
más el overlay del proyecto si existe. Lleva la regla de promoción incrustada en el
rationale del hallazgo: repetido ≥2 veces en el mismo proyecto → `PROMOVER→overlay`;
convergente entre proyectos → `PROMOVER→base`. Así el ciclo de retroalimentación (hueco 2)
queda como texto parseable en el hallazgo, no como mecanismo automático nuevo.

**(c) Preset opt-in `./ui` en `eslint-config`**: `jsx-a11y` (`error`, alineado a
base.md §3) más `no-restricted-syntax` / `no-restricted-imports` parametrizables (`warn`)
para primitivas propias y capa única de iconos. Lo que un linter puede validar
determinísticamente no debe gastar tokens del LLM en cada generación (hueco 3).

**(d) Paquete `@devground/chile-formats`**: RUT (formateo puntos+guion, validación módulo
11, clean/DV), teléfono (+56 9), moneda/UF/número (`Intl.NumberFormat('es-CL')`
memoizado), sin dependencias runtime. Código reutilizable pesa menos que instrucción
reutilizable: `base.md` §6 lo referencia como preferente si el proyecto no tiene ya un
helper propio.

**(e) Installer `ui-conventions` en `devground-init`** (auto-skip fuera de React/Next), más
`SKILL.md` §5 "Maintain the overlay" (quien usa el overlay es quien lo mantiene — mismo
principio que ya rige el codemap) y un puntero en `AGENTS.md` §9 para agentes no-Claude que
no cargan skills de Claude Code.

## Consecuencias

**Positivas**
- Las convenciones de UI llegan al código también en sesiones orquestadas, no solo en uso
  interactivo directo de la skill.
- El costo de aplicar reglas mecánicas (a11y, primitivas propias, capa de iconos) se mueve
  del LLM al linter, determinístico y gratis en tokens.
- Los helpers es-CL dejan de reimplementarse por proyecto.

**Negativas / Trade-offs**
- La métrica "hallazgos UI recurrentes por cambio" queda **diferida**: el rastro parseable
  (`aud-ui-conventions` en los ledgers `audits/<flujo>/` de deepcheck) ya existe, pero el
  reader de `dev-metrics` que la agregue no se construye en este ADR — no hay datos aún
  para justificarlo (ver Alternativas).
- El mantenimiento de doble copia de `kind-playbooks.md`/`SKILL.md` entre
  `~/.claude/skills/model-orchestrator/` y `tools/model-orchestrator/skills/model-orchestrator/`
  sigue siendo manual, tal como ya lo establece ADR-0017 — esta integración no lo resuelve,
  solo añade contenido a ambas copias.
- La regla de promoción overlay↔base depende de que un humano lea el rationale del hallazgo
  y actúe — no hay automatización que mueva reglas por sí sola.

## Alternativas consideradas

1. **Crear un `kind` nuevo "ui" en el orquestador**: descartada porque tocaría
   schema/policy/ruteo de modelo por un concepto transversal (UI puede aparecer en tareas de
   cualquier `kind` — feat, fix, refactor) que es ortogonal al costo/complejidad que el
   `kind` existente modela. La inyección aditiva por superficie detectada logra lo mismo sin
   ensanchar el esquema.
2. **Construir ya el reader de `dev-metrics` para hallazgos UI**: descartada por falta de
   datos — la dimensión `aud-ui-conventions` recién se activa con este ADR; construir el
   reader antes de tener ledgers reales sería especulación. El rastro parseable queda listo
   para cuando haya suficiente historial.
3. **Activar el preset `./ui` de eslint por defecto en los consumidores**: descartada por
   riesgo de romper el lint de proyectos existentes que aún no cumplen `jsx-a11y` en modo
   `error`. Se deja opt-in hasta que un proyecto decida adoptarlo explícitamente.

## Referencias

- ADR-0023 — ui-conventions: convenciones de UI como contexto antes de generar.
- ADR-0017 — Routing de modelos por complejidad (model-orchestrator).
- ADR-0003 — ESLint v9 Flat Config.
