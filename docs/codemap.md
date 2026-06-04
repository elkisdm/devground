# Code map

Índice de *dónde vive cada cosa*. Lo mantiene `spec-flow` en cada cambio: el
índice acota la búsqueda, el código confirma. No es un manual de *cómo* (eso son
el código y los ADRs), sino de *dónde*.

| Subsistema | Paths | Responsabilidad | Entrypoints | ADRs |
|------------|-------|-----------------|-------------|------|
| **CLI (devground-init)** | `packages/cli/src/` | Scaffolding interactivo de los estándares devground en un proyecto | `src/index.ts` (bin `devground-init`); `src/select.ts` (routing de presets, puro/testeable); `src/installers/*.ts` (un installer por herramienta); `src/installers/write-guard.ts` (no-sobreescribe); `src/utils/exec.ts` (`run` vía execSync), `utils/package-json.ts` | 0001, 0010–0012 |
| **deepcheck** | `packages/deepcheck/` | Verificación profunda multi-agente (QA+Validación+Auditoría) con confirmación adversarial y destilación de skills por flujo | skill `skills/deepcheck/SKILL.md`; ejecutable `workflows/deepcheck.workflow.js` (corre vía la herramienta Workflow); bin `setup.js` (`devground-deepcheck`); ledgers en `audits/<flujo>/` | 0013 |
| **Config presets** | `packages/{prettier,eslint,tsconfig,commitlint,lint-staged,husky}-config/` | Configuración compartida instalable | archivos estáticos publicables | 0003–0005 |
| **architecture-guide** | `packages/architecture-guide/` | Knowledge base + ADR templates instalables en cualquier proyecto | bin `setup.js`, `adr-new.js` | — |
| **dev-metrics** | `packages/dev-metrics/` | Serie temporal de métricas de codificar-con-agentes (git + transcripts) | bin `dist/index.js` (`dev-metrics`) | 0006 |
| **agregador** | `packages/devground/` | Bundle de los 7 presets de config + `devground-setup` | bin de setup | — |

> Skills destiladas por deepcheck viven en `.claude/skills/audit-<flujo>/` del
> proyecto auditado (ej: `.claude/skills/audit-devground-init/`).
