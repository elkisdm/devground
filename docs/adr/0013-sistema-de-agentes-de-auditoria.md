# ADR-0013: Adoptar un sistema de agentes de auditoría auto-mejorable (deepcheck)

- **Estado**: Aceptado <!-- Propuesto | Aceptado | Rechazado | Reemplazado por ADR-XXXX | Obsoleto -->
- **Fecha**: 2026-06-03
- **Decisor**: @elkisdm
- **Aplica a**: el paquete `@devground/deepcheck` y, a futuro, cualquier proyecto que lo instale para auditar sus flujos.

## Contexto

La verificación profunda de una feature (QA + validación contra requisitos +
auditoría de calidad/seguridad) hoy es manual, no se repite de forma consistente,
y re-descubre los mismos hallazgos en cada iteración. Queríamos un sistema que:
(1) verifique un flujo en sus múltiples dimensiones a la vez, (2) no genere ruido
(falsos positivos que erosionan la confianza), y (3) **acumule conocimiento** del
flujo para reducir iteraciones sobre el mismo código.

Existían dos precedentes en el repo: el skill `spec-flow` (orquesta subagentes
de SDD) y la herramienta `Workflow` de orquestación multi-agente. Ninguno hacía
verificación profunda con confirmación adversarial ni aprendía del flujo.

Se pilotó el concepto sobre un flujo real del propio monorepo (`devground-init`,
ver `packages/deepcheck/audits/devground-init/`). El piloto encontró bugs reales
prod-blocking (lint-staged roto, sobreescritura de configs, exit code 0
mentiroso) y, tras arreglarlos, una segunda corrida confirmó que los fixes
cerraron los bugs **y** detectó deuda introducida por los propios fixes (drift de
documentación) en la misma vuelta. El concepto quedó validado.

## Decisión

Adoptar `@devground/deepcheck`: un sistema de verificación multi-agente con tres
roles ortogonales (QA = ¿funciona?, Validación = ¿es lo que se pedía?, Auditoría
= ¿está bien construida?, esta última usando los ADRs 0007–0012 como rúbrica),
orquestado por la herramienta `Workflow`. El pipeline es: **revisar** (roles ×
dimensiones en paralelo) → **deduplicar** (barrera cross-dimensión) →
**verificar adversarialmente** (3 refutadores por hallazgo, confirma la mayoría)
→ **sintetizar** (ledger) → **destilar** una skill de auditoría específica del
flujo que mejora en cada corrida.

El enforcement de calidad vive en dos mecanismos no negociables: la confirmación
adversarial (un hallazgo sin confirmar no entra al reporte) y la transparencia
(los descartados se listan con su razón, no se ocultan).

## Consecuencias

**Positivas**
- Verificación profunda y repetible que **acumula conocimiento por flujo** en una
  skill destilada → menos iteraciones sobre el mismo código.
- Bajo ruido por diseño: la confirmación adversarial filtra falsos positivos.
- Dogfooding: audita usando los propios estándares de devground (ADRs 0007–0012).

**Negativas / Trade-offs**
- **Costo en tokens alto** (~2.3–2.8M por flujo). Mitigación: la deduplicación
  reduce verificaciones redundantes; reservar el sistema para PRs grandes,
  pre-release o flujos críticos, no para cada commit.
- **Riesgo de ceguera por sobreajuste**: una skill destilada que solo acumula
  supresiones ("ignora esto") puede volverse ciega a regresiones reales.
  Mitigación: cada supresión lleva fecha + gatillo de re-validación, y el
  destilador re-valida las supresiones viejas en vez de confiar en ellas
  indefinidamente. Es la parte del sistema que hay que vigilar.

## Alternativas consideradas

1. **Linter / reglas estáticas**: barato y determinista, pero no razona sobre
   intención ni contra requisitos, no confirma hallazgos (ruido alto) y no
   acumula conocimiento. Complementa, no reemplaza.
2. **Una sola pasada de un agente**: sin fan-out multi-dimensional ni
   confirmación adversarial; mezcla señal y ruido y no escala a "trabajo
   profundo".
3. **CLI con Claude API en CI/headless**: necesario solo si se quiere correr sin
   Claude Code; mayor esfuerzo. Diferido a una fase posterior.

## Referencias

- `packages/deepcheck/` — implementación piloto (skill, workflow, plantilla).
- `packages/deepcheck/audits/devground-init/` — ledgers del piloto y la corrida 2.
- `.claude/skills/audit-devground-init/SKILL.md` — primera skill destilada.
- ADR-0007 a ADR-0012 — rúbrica de la dimensión de auditoría.
- ADR-0006 (dev-metrics) — precedente de uso de agentes en el monorepo.
