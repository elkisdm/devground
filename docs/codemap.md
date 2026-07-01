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
| **dev-metrics** | `packages/dev-metrics/` | Serie temporal de métricas de codificar-con-agentes (git + transcripts) + impacto spec-flow | bin `dist/index.js` (`dev-metrics`); subcomando `spec-flow-impact` (`commands/spec-flow-impact.ts`); motor `lib/spec-flow-segment.ts` (segmentación per-commit, control recency-matched); `lib/spec-flow-events.ts` (parser JSONL); `lib/detectors.ts` (test/ADR estrictos, anti-substring); `lib/spec-flow-report.ts`; subcomando `orientation` (`commands/orientation.ts`, motor `lib/orientation.ts` = tokens antes del 1er edit + payoff codemap) | 0006, 0014, 0015 |
| **sdd (spec-flow)** | `packages/sdd/` | Skill de intake SDD instalable (classify→tier→brief→telemetría); `skill/` = copia versionada de `~/.claude/skills/spec-flow/` | bin `setup.js` (`devground-sdd`, instala a `.claude/skills/spec-flow/`, `--global` a `~`) | 0016 |
| **agregador** | `packages/devground/` | Bundle de los 7 presets de config + `devground-setup` | bin de setup | — |
| **model-orchestrator** | `tools/model-orchestrator/` | Routing de modelos por complejidad tras `spec-flow`: asigna modelo+effort por tarea (Opus/Sonnet/Haiku), estima costo y despacha sub-agentes. Copia versionada; fuente activa en `~/.claude/skills/model-orchestrator/` | motor `skills/model-orchestrator/engine.mjs` (Node puro, invariantes en código, `selftest` 30/30); piso `policy.json`; tarifas `pricing.json`; juez `agents/model-router.md` (Haiku, ±1 nivel); patch `patches/spec-flow-step-3.5.md` | 0017 |

> Skills destiladas por deepcheck viven en `.claude/skills/audit-<flujo>/` del
> proyecto auditado (ej: `.claude/skills/audit-devground-init/`).
