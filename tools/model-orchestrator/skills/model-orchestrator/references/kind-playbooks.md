# Checklists por `kind` — inyección de guía en el prompt del subagente

Cuando el orquestador despacha un subagente (Paso 6 de `SKILL.md`), adjunta al prompt el
checklist de abajo correspondiente a `task.kind`. Es **guía mecánica de calidad en el
punto de trabajo** — no reemplaza el contexto de la tarea (título, archivos), lo
acompaña. Cada checklist es la destilación accionable de un playbook; el detalle vive en
el playbook fuente citado.

**Cómo usarlo:** busca `task.kind` en la tabla de ruteo. Si tiene checklist, pégalo en el
prompt del subagente bajo un encabezado `## Guía de calidad para esta tarea`. Si el kind
no está mapeado (`chore`, `style`, `rename`, `spike`, `test`), no inyectes nada — son
mecánicos y la guía sería ruido. Registra en `decisions.jsonl` qué checklist inyectaste
(campo `playbook_injected`) para poder medir después si baja la tasa de reversión.

## Tabla de ruteo `kind → checklist`

| `kind` | Checklist |
|---|---|
| `audit`, `security-review` | **RED-TEAM** |
| `decision`, `adr`, `architecture`, `design` | **DECISIÓN** |
| `plan` | **PLAN** |
| `feat`, `fix`, `refactor`, `perf` | **DISEÑO** |
| `docs` | **DOCS** |
| `chore`, `style`, `rename`, `spike`, `test` | *(sin inyección)* |

---

## RED-TEAM
*Fuente: `docs/reasoning-craft-playbook-vol2.md` §A; `docs/audit-orchestration-playbook.md` §A.*

- **Pre-mortem, no "¿funciona?":** "es dentro de 6 meses y esto falló en producción, ¿cuál es la frase que empieza con 'resulta que asumimos que…'?".
- **Inventario de supuestos → inversión:** lista cada "esto asume que X"; por cada uno escribe "¿y si NO-X?" trazado hasta un efecto observable (crash, dato corrupto, acceso no autenticado, fuga).
- **Barre 4 fronteras**, empezando por las dos más rentables: (1) entrada no confiable, (2) costuras A↔B (qué asume A sobre la salida de B que B no garantiza), (3) estado/concurrencia, (4) límites (ausencia≠vacío≠null, tamaño, caso 0/1/N, escape hatches).
- **Prioriza plausibilidad×daño:** reporta alto×alto / alto×medio / medio×alto; descarta baja-plausibilidad salvo daño catastrófico (etiquétalo). El "teórico inalcanzable" (requiere "primero comprometé el server") se descarta: el daño precede al hallazgo.
- **Refuta tu propio hallazgo antes de reportarlo** (si no corre `deepcheck`): ¿qué salvaguarda existente lo neutraliza? ¿el actor y la secuencia son reales? Sin este paso eres generador de hipótesis, no red-teamer.

## DECISIÓN
*Fuente: `docs/reasoning-craft-playbook-vol2.md` §A/B; `docs/reasoning-craft-playbook.md` §A.*

- **Divergencia real, no variaciones:** genera 3-4 opciones, cada una con su `supuesto_que_niega` distinto (quién actúa / dónde en el stack / cuándo / métrica / si el problema existe). Dos que niegan el mismo supuesto son una.
- **Incluye la opción nula** cuando existió, con descarte de alcance acotado. Cada opción lleva su "gana si ___" en una frase; si no puedes completarla con un contexto real, es paja.
- **Congela la rúbrica ANTES de evaluar** — si defines los criterios con favorita ya elegida, se doblan hacia ella.
- **Analogía = hipótesis, nunca conclusión:** si la usas para decidir, pásala por el test de las 3 preguntas (predice algo verificable del destino o es adorno).
- **Narrativa del ADR:** herida primero (el daño observado, no generalidades), objeción principal respondida antes de que el lector la formule, decisión imperativa y verificable, trade-offs negativos reales (sin ellos no es creíble).
- **Registra las descartadas** con su razón en una frase ("Alternativas consideradas").

## PLAN
*Fuente: `docs/reasoning-craft-playbook.md` §A (intención); `docs/reasoning-craft-playbook-vol2.md` §B (divergencia).*

- **Enumera interpretaciones como diffs** antes de elegir; el que "se te ocurrió primero" no tiene prioridad por serlo.
- **Umbral asumir-vs-preguntar = costo de REVERSIÓN, no probabilidad de error.** Reversión barata → asume, declara, procede. Cara/irreversible + alto impacto + no inferible → pregunta (una sola ronda batcheada).
- **Toda asunción consecuente se escribe donde el usuario la vea** ("Asumo X, corrígeme").
- **Descompón por eje**, no en variaciones: enfoques que difieren en su supuesto, no en detalles.

## DISEÑO
*Fuente: `docs/reasoning-craft-playbook.md` §B.*

- **Juzga naming/API por el código del llamador y el mal uso más probable**, nunca por la implementación. Escríbelos de verdad antes del veredicto — la prosa se retro-justifica, los artefactos no.
- **Un nombre miente** si su docstring de 1 línea necesita "pero/excepto", o si requiere una nota aclaratoria adyacente. Renómbralo o documenta por qué no.
- **Vocabulario cerrado:** un concepto = una palabra en todo el sistema (verifícalo con grep, no con memoria).
- **Mínima superficie:** cada parámetro opcional / campo de retorno necesita un llamador real HOY. "Configurabilidad" sin segundo consumidor es deuda, no flexibilidad.
- **Empate técnico → elige lo consistente con el repo**, no fabriques un principio. Un principio real predice una falla concreta; una preferencia solo produce adjetivos.

## DOCS
*Fuente: `docs/reasoning-craft-playbook.md` §A/B; `docs/reasoning-craft-playbook-vol2.md` §B.*

- **El doc tiene un trabajo, no un tema:** ¿qué hará el lector distinto después de leerlo? (ADR persuade · README filtra en 30s · guía enseña · PR body justifica).
- **Conclusión primero.** Test de 20s: título + primera frase de cada sección bastan para decidir bien. Test de borrado: si la primera frase se puede quitar sin pérdida, quítala.
- **Si enseña:** elige el ejemplo ancla CENTRAL (no el raro/vistoso); una idea verificable por capa; cierra con un test de predicción sobre un caso NUEVO que no mostraste (no un resumen).
- **Si destila:** protege umbrales/excepciones/contraejemplos primero (son lo menos derivable). Test de negación: si negar la frase es absurdo ("debe ser confiable"), no informa — reescríbela con un sustantivo verificable o bórrala.
- **Forma según contenido:** ítems intercambiables → lista; estructura paralela de ≥3 → tabla; cadena causal → prosa. Cero adjetivos sin medición.
