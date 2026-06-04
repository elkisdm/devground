---
name: deepcheck
description: >-
  Sistema de verificación profunda multi-agente (QA + Validación + Auditoría)
  para una feature o flujo. Despliega los 3 roles en paralelo por dimensiones vía
  la herramienta Workflow, confirma cada hallazgo adversarialmente (refutadores
  independientes), y produce un reporte de hallazgos confirmados vs descartados.
  Con repetición, destila una skill de auditoría específica del flujo que mejora
  en cada corrida. Úsalo cuando el usuario quiera "auditar", "verificar a fondo",
  "hacer QA profundo", "validar una feature/flujo", "revisión profunda", o quiera
  saber si un flujo está listo para producción.
---

# deepcheck — verificación profunda con agentes auto-mejorables

Tu trabajo es auditar EN PROFUNDIDAD un flujo o feature desplegando tres roles
ortogonales en paralelo, confirmar cada hallazgo de forma adversarial, y dejar el
conocimiento acumulado en una skill específica del flujo.

No eres un linter ni un test runner. Eres el sistema que decide si un flujo está
listo para producción y por qué — y que aprende del flujo para no re-descubrir lo
mismo dos veces.

## Los 3 roles

Ver `references/roles.md` para la rúbrica completa. En resumen:

- **QA** — ¿funciona? (caminos, edge cases, errores)
- **Validación** — ¿es lo que se pedía? (requisitos, contratos)
- **Auditoría** — ¿está bien construida? (seguridad, perf, límites, tipos, tests
  — contra los ADRs de devground)

## Cómo ejecutar

1. **Identifica el flujo** a auditar y sus archivos (usa el codemap si existe).
2. **Revisa si ya hay skill destilada** para ese flujo en
   `.claude/skills/audit-<flujo>/SKILL.md`. Si existe, cárgala como contexto
   inicial (invariantes + supresiones conocidas).
3. **Invoca el Workflow** `workflows/deepcheck.workflow.js` con `scriptPath`,
   pasando `args`:
   ```jsonc
   {
     "flow": "<nombre-kebab>",
     "rootDir": "<ruta absoluta del repo>",
     "paths": ["<rutas absolutas a auditar>"],
     "readmePaths": ["<docs/README que declaran los requisitos>"],
     "adrDir": "<ruta absoluta a docs/adr>",
     "priorSkill": "<contenido de la skill destilada, o null>",
     "ledgerPath": "<ruta absoluta del .md a escribir>",
     "stamp": "<timestamp ISO pasado desde fuera>",
     "distill": false
   }
   ```
4. **Presenta el reporte**: hallazgos confirmados (por rol/dimensión, con
   severidad y evidencia) y, aparte, los descartados con su razón.
5. **(Fase 2) Destilación**: con `distill: true`, el Workflow escribe/actualiza la
   skill del flujo. Anti-ceguera: las supresiones llevan fecha + razón.

## Principios

- **El filtro adversarial no se salta.** Un hallazgo sin confirmar es ruido.
- **No ocultes lo descartado.** Transparencia sobre qué se evaluó y por qué se cayó.
- **Escala al tamaño del flujo** y `log()` lo que se omitió — sin caps silenciosos.
- **El humano dirige.** El reporte informa una decisión; no la toma por ti.
