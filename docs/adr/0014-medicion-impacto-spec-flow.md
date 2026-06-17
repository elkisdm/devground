# ADR-0014: Medición de impacto de spec-flow (segmentación con reglas anti-trampa)

- **Estado**: Propuesto
- **Fecha**: 2026-06-17
- **Decisor**: edaza
- **Aplica a**: `@devground/dev-metrics`, comando `spec-flow-impact`

## Contexto

`spec-flow` emite un evento por cambio a `<repo>/.spec-flow/events.jsonl`. La pregunta abierta era: **¿spec-flow mejora outcomes reales (tests, durabilidad, documentación) o solo añade ceremonia?** El instrumento (eventos) existía, pero el análisis que une evento↔commit↔outcome nunca se construyó.

Una auditoría manual previa (179 eventos, 16 repos) produjo dos métricas **contaminadas** que, de haberse implementado ingenuamente, habrían reportado mejoras FALSAS:

1. **Test-coupling por substring "test"**: matcheaba features como `routes/test.ts`, inflando la tasa de un repo de 0% a un falso 85%.
2. **Durabilidad por fix-follow-up (≤N días)**: confundía la densidad temporal de commits con fragilidad — la ventana spec-flow es corta y densa, la pre-rollout larga y dispersa, así que el conteo de "fix dentro de N días" se infla por densidad, no por calidad.

El `before/after` ingenuo también miente: el dev ya venía mejorando solo (supervivencia 62%→85% pre-spec-flow), así que un control mal elegido atribuye a spec-flow una mejora que era aprendizaje.

## Decisión

El comando `spec-flow-impact` segmenta los commits de cada repo en **spec-flow** (el commit que toca `.spec-flow/events.jsonl`), **control** (pre-rollout, tipo código, del autor) y **other**, y compara solo spec-flow vs control con TRES reglas obligatorias:

### (a) Detectores ESTRICTOS, nunca substring
`lib/detectors.ts` exige evidencia estructural: extensión real de test (`*.test.ts`, `*.spec.ts`), directorio dedicado (`__tests__/`, `tests/`), o convención de lenguaje (`test_*.py`, `*_test.go`). Un archivo llamado `test.ts` fuera de un directorio de test **no** cuenta. Hay un test de regresión explícito para ese caso.

### (b) Baseline-relative por repo
Cada métrica compara un repo contra su PROPIO control. El agregado cross-repo es la **mediana de los deltas por-repo**, nunca un pooling de conteos crudos (un repo test-heavy aplastaría a uno test-poor). Repos sin control suficiente se **listan, no se descartan en silencio**.

### (c) Densidad neutralizada por diseño, no por ventana
Se comparan **tasas por-commit**, nunca totales absolutos — una tasa ya está normalizada por commit, así que la densidad no la distorsiona. El control son los **K commits de código más RECIENTES pre-rollout** (K=30): la recencia controla la tendencia de aprendizaje (un commit reciente refleja la habilidad de hoy) sin que una ventana calendario de igual largo *starve* la muestra. La métrica fix-follow-up **no se implementa**.

Comparabilidad exige DOS pisos: `n_spec-flow ≥ 5` y `n_control ≥ 8`.

### Métricas reportadas
ADR/spec-coupling, test-coupling, files/commit, churn/commit, supervivencia (net/gross), y fricción (`questions_asked` por tier).

## Consecuencias

**Positivas**

- El instrumento corrigió a su propio autor: con rigor, las señales robustas resultaron ser **test-coupling** (Δ mediana +36pp) y **supervivencia** (Δ +0.18), no ADR-coupling (Δ mediana ~+2pp, impulsada por pocos repos) ni atomicidad (mixta) como sugería la auditoría manual.
- Las reglas anti-trampa quedan codificadas y testeadas (no dependen de recordarlas).

**Negativas / límites**

- Los repos *greenfield* nacidos post-rollout no tienen control (sin "antes") y quedan no-comparables — honesto, pero reduce la muestra.
- La recencia mitiga, no elimina, el confound de aprendizaje. No es un experimento aleatorizado; es la mejor segmentación observacional disponible.
- K=30 y los pisos de n son heurísticos; ajustables si la evidencia lo pide.

## Alternativas consideradas

- **Ventana calendario de igual largo (descartada)**: controlaba la tendencia pero starve la muestra — en pruebas reales dejó a `ored` con n_control=1 pese a tener 40+ commits pre-rollout disponibles. La recencia por conteo de commits logra el mismo control de tendencia sin perder señal.
- **before/after global (descartada)**: confundido por el aprendizaje del dev (ver Contexto).
