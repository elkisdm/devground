# @devground/dev-metrics

## 1.2.0

### Minor Changes

- c8e9718: spec-flow pasa a v0.5: el code review es parte de la Definition of Done (ADR-0036), extendiendo el ADR-0029 que puso ahi los tests.

  Los tests prueban que el codigo hace lo que la spec dijo. No pueden decirte que la spec estaba incompleta, que el cambio rompio un invariante que nadie escribio, o que duplica algo tres modulos mas alla — porque el test se derivo de la misma spec incompleta. Eso lo encuentra un review, y en la practica **siempre** encuentra algo.

  Escalado por tier, como todo en la skill: Tier 0 ninguna, Tier 1 `/code-review medium`, Tier 2 `high`, Tier 3 `max` o deepcheck si cruza modulos. La regla de cierre: corre la revision del tier y cierra todos los hallazgos — arreglandolos, o con una linea que diga por que no es real o no es ahora. No compite con `/code-review` ni con deepcheck: los **agenda**.

  La pieza que importa es la telemetria. El evento `spec` gana `"review": {level, findings, resolved}`, y `dev-metrics` lo parsea tolerando las tres formas que toma (ausente en eventos previos, `"n/a"`, o el objeto). Es el tercer gauge y responde lo que los otros dos no pueden: **¿los cambios estan saliendo mas limpios?** Los hallazgos por cambio deberian bajar con el tiempo; si no bajan, spec-flow produce briefs que parecen completos y no lo son. `findings > resolved` es deuda, y esta pensado para verse.

### Patch Changes

- Updated dependencies [8a1907e]
  - @devground/logger@0.3.0

## 1.1.0

### Minor Changes

- 8e565ce: dev-metrics ahora reporta su versión real desde package.json (antes mentía 0.1.0
  mientras el paquete es 1.0.0); `init` imprime la razón accionable y sugiere
  --force cuando el config ya existe (antes salía con exit 1 sin mensaje); y
  readEvents descarta filas malformadas de events.json en vez de dejar pasar
  fechas/labels undefined al timeline. Internamente, `collect` recorre el corpus de
  transcripts UNA sola vez en lugar de tres y filtra por período al vuelo, sin
  retener toda la historia en memoria.

## 1.0.0

### Major Changes

- 48dd01b: Declare the public API stable at 1.0.0 (ADR-0026, consolidation phase).

  No behaviour changes: the bump is the semver commitment itself. From 1.0.0 on,
  any breaking change to the CLI commands, their flags/output, or the exported
  `.`/`./transcript`/`./memory` entry points requires a major release. Internal
  adoption depends on this package; `0.x` ("anything may break") no longer
  reflects its contract.

### Patch Changes

- 78e990e: Fix the pnpm install warning in workspace consumers ("Failed to create bin … dist/index.js").

  The `dev-metrics` bin now points to a committed shim (`bin/dev-metrics.js`) that exists before `tsc` runs, so pnpm can link it at install time. The shim delegates to `dist/index.js` and fails with a clear "run `pnpm build`" message when the package hasn't been compiled yet. Published behaviour is unchanged (`dist/` ships as before; `bin/` is now included).

## 0.4.0

### Minor Changes

- 2fbbcef: Expose `transcript` and `memory` library subpaths (`@devground/dev-metrics/transcript`,
  `@devground/dev-metrics/memory`) via the package `exports` map, so other packages can
  reuse the transcript reader (`parseTranscriptLine`, `TranscriptRecord`, `extractToolUses`,
  `dedupByUuid`) and memory enumeration (`defaultMemoryRoot`, `listMemoryNotes`,
  `parseCreatedFrontmatter`) without deep-importing from `dist/`. Additive — no behavior
  change to the CLI.

## 0.3.0

### Minor Changes

- 8bbaffa: Add `@devground/sdd`: packages the spec-flow intake skill with a `devground-sdd`
  installer (project-level `.claude/skills/spec-flow/`, or `--global`). Step 0 now makes
  reading `docs/codemap.md` mandatory when present.

  dev-metrics: add `orientation` command (orientation cost = output tokens before the
  first edit, plus a size-robust share and a codemap-payoff comparison restricted to
  codemap-having repos) and `spec-flow-impact` (segments spec-flow vs same-repo pre-rollout
  control with strict detectors, baseline-relative aggregation, and recency-matched control).

## 0.2.0

### Minor Changes

- 9c95a0f: New package `@devground/dev-metrics`: a CLI that builds a labelled time-series of
  "coding with agents" — code volume, quality, velocity and efficiency — from git
  history and Claude Code transcripts.

  Commands:

  - `collect` — write a self-describing metrics snapshot (git churn, conventional
    commit type distribution, rework ratio, file re-touch; transcript tokens by
    model, tool_use counts, Edit/Write ratio, per-file iteration; derived
    tokens/commit and churn↔tokens R²).
  - `report <snapshot>` — render a markdown report.
  - `diff <A> <B>` — delta table between two snapshots, aligned with event
    annotations.
  - `event` — record a standard/tool adoption to separate transition cost from
    steady-state regime in diffs.

  Methodology and caveats documented in docs/adr/0006-dev-metrics.md.

### Patch Changes

- Updated dependencies [38a68ec]
  - @devground/logger@0.2.0
