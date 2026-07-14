---
name: audit-monorepo-devground-completo
description: >-
  Skill de auditoría destilada para el flujo "monorepo-devground-completo" (todo el
  monorepo devground: núcleo soportado del ADR-0026 — presets de config, devground,
  cli, dev-metrics, sdd — y experimentales — deepcheck, dreaming, ui-conventions,
  design-taste, logger, familia swift, model-orchestrator). Acumula el conocimiento
  de auditorías previas: invariantes confirmadas, falsos positivos ya descartados y
  edge cases descubiertos. La cargas ANTES de re-auditar el monorepo para partir de
  un piso más alto y reducir ruido. Generada y mantenida por @devground/deepcheck.
---

# Auditoría destilada — monorepo-devground-completo

> Generada por deepcheck. Última corrida: 2026-07-13. Corridas acumuladas: 1.
>
> Linaje: hereda de la skill `audit-devground-init` (2 corridas sobre el subconjunto
> `packages/cli`). El conocimiento del CLI se fusionó aquí y se AMPLÍA al monorepo
> completo. Cuando esta skill contradice a `audit-devground-init`, gana ésta.

## Tesis central de esta corrida (leer primero)

El bug dominante del monorepo NO es un algoritmo mal escrito: es **duplicación de la
lógica de instalación sin red de tests + drift doc↔código a tres bandas**. Hay TRES
puntos de entrada que escriben la config del proyecto del usuario:

1. `packages/cli/src/index.ts` → `installers/*.ts` (el flujo `devground-init`, con
   write-guard y algo de tests).
2. `packages/devground/setup.js` (el flujo `npx devground-setup` — "Dos comandos y
   listo" del README raíz — copia a mano la lógica del CLI, **cero tests**).
3. Los `setup.js` de cada preset (`husky-config`, `agents-md`, `sdd`, …) invocados
   por delegación.

El CLI arregló bugs (lint-staged config, validación de forma, no-TTV) con tests de
regresión; `devground/setup.js` **reintrodujo esos mismos bugs** porque es una copia
que ninguna suite cubre. Prioriza este archivo: concentra 1 CRITICAL + 5 HIGH + varios
MEDIUM de esta corrida.

## Delta crítico vs. la skill anterior (regresiones e inversiones)

- **`resolveInstall` INVIRTIÓ su política de no-TTY.** La skill `audit-devground-init`
  decía "no-TTY sin `--yes` se rechaza con `exit(1)`". YA NO. `select.ts:41-56`
  ahora **instala el preset FULL por defecto** en entornos no interactivos (comentario
  explícito). La justificación ("el write-guard mantiene seguro un re-run") es una
  **premisa falsa**: los installers delegantes (agents-md, husky, architecture-guide,
  ui-conventions) EVADEN el write-guard → un re-run en CI destruye archivos del usuario.
  Esto pasó de "resuelto" a hallazgo HIGH nuevo.
- **La supresión del `.action()` de `index.ts` YA NO APLICA.** La skill anterior lo
  suprimía como "justo bajo el umbral de ADR-0010". Tras crecer con vitest/ui-conventions/
  tally, el callback tiene **87 líneas efectivas > 80** → dispara la señal `warn` de
  `max-lines-per-function`. Se PROMOVIÓ a hallazgo (aud-limits) y la supresión se ELIMINÓ.
- **`hasSwift` a medio implementar (ADR-0021).** `detect-stack.ts:21-34` ahora detecta
  Swift pero **nada lo consume**; en repo Swift-only el CLI ya no falla limpio: corre
  installers JS sobre un repo sin manifiesto (`npm install -D` puede mutar un package.json
  ancestro). Regresión de política nueva.
- **`readPackageJsonSafe` (nuevo en detect-stack) mitigó PARCIALMENTE** el hallazgo
  histórico de forma en el CLI: tolera ausencia (`{}`) pero sigue lanzando en malformado.
  El fix NO se propagó a `devground/setup.js:32-33`, que sigue crudo.

## Mapa del flujo

El monorepo tiene 22 paquetes bajo `packages/` + `swift-foundation/`. Núcleo soportado
(ADR-0026): `cli`, `devground`, `dev-metrics`, `sdd` y los presets de config
(`prettier/eslint/tsconfig/commitlint/lint-staged/husky/vitest-config`, `agents-md`,
`architecture-guide`, `ui-conventions`). Experimentales: `deepcheck`, `dreaming`,
`design-taste`, `logger`, `chile-formats`, familia swift (`swift-ci`, `swift-format-config`,
`swift-design-tokens`, `swift-package-template`, `swift-foundation`), model-orchestrator.

- **CLI (`packages/cli/src/index.ts`)**: orquestador. `resolveInstall` (`select.ts`)
  decide install/prompt (ver delta crítico), `detectStack` (`detect-stack.ts` → `readPackageJson`),
  itera installers en serie con tally, `process.exit` por failures/preset inválido.
- **Aggregator (`packages/devground/setup.js`)**: bin del paquete paraguas `@devground/devground`
  1.1.0. DUPLICA a mano la lógica del CLI (lint-staged, husky, AGENTS.md+symlinks, eslint).
  Cero tests. Fuente de la mayoría de los hallazgos altos.
- **Presets con `setup.js`** (`husky-config`, `agents-md`, `sdd`): escriben config del
  usuario; los guardeados usan `writeFileGuarded`/`copyDirGuarded`, los delegantes NO.
- **dev-metrics (`packages/dev-metrics`)**: parsea el corpus de transcripts `~/.claude/projects/*.jsonl`
  (2.6 GB / 4292 archivos en esta máquina). `collect.ts` + `lib/transcript-collect.ts`.
- **dreaming (`packages/dreaming`)**: paquete PUBLICADO en npm (0.1.1). `src/index.ts`
  (commander) + `lib/gather.ts` + `lib/window.ts`.
- **sdd orchestration (`packages/sdd/orchestration/scripts/orchestrator-gate.sh`)**: la
  "regla dura" de orquestación (ADR-0027), gate fail-open que depende de `jq`.
- **deepcheck (`packages/deepcheck`)**: `src/lib.ts` (umbral de confirmación adversarial,
  CRITICAL) + `workflows/deepcheck.workflow.js` (copia espejo INLINE del umbral).
- El contrato público se documenta en TRES lugares que derivan: `README.md` raíz,
  `packages/cli/README.md` y los README de cada preset.

## Invariantes confirmadas

Cosas que SON verdad de este flujo y no hay que re-verificar desde cero (pero sí
re-chequear que sigan siendo verdad si el código cambió):

- **Existen 22 paquetes** en `packages/` + `swift-foundation/`. Núcleo vs experimental
  según ADR-0026 (ver mapa). Prioriza núcleo, luego experimental.
- **`resolveInstall` (`select.ts`) defaultea a preset FULL en no-TTY** (`defaulted:true`),
  NO rechaza. El write-guard NO cubre los installers delegantes → la justificación del
  comentario es falsa para ellos. (Ver delta crítico + hotspot qa-edge.)
- **`readPackageJson` vive en `packages/cli/src/utils/package-json.ts`**; `detect-stack.ts`
  la envuelve en `readPackageJsonSafe` (tolera ausencia con `{}`, lanza en malformado).
  El fix de forma NO se propagó a `devground/setup.js:32-33` ni a otros bin `.js`.
- **`devground/setup.js` es una copia manual del CLI sin tests.** Toda mejora del CLI
  debe replicarse aquí a mano y ninguna suite lo detecta. Es la fuente raíz sistémica.
- **El write-guard (`installers/write-guard.ts`) es la garantía de "no sobreescribir",
  pero SOLO en los installers guardeados.** Los delegantes (husky, agents-md,
  architecture-guide, ui-conventions) escriben vía binario externo y NO están guardeados.
- **`devground/setup.js` hardcodea `pnpm exec` en el pre-commit** (`:174`) y en el
  preset `husky-config/hooks/pre-commit.sh:29-30`. El CLI detecta e instala con npm/yarn,
  pero el hook siempre asume pnpm.
- **El fallback de copia symlink** (`devground/setup.js:210-217` y su duplicado en
  `agents-md/setup.js`) resuelve `../AGENTS.md` con `path.resolve(targetDir, target)` →
  apunta al **directorio PADRE**, no a `linkDir`/`targetDir`. Roto para 2 de 4 links.
- **`run()` (`utils/exec.ts`)** usa `execSync` con string interpolado (shell). Inyectable
  POR DISEÑO pero NO explotable: inputs son listas estáticas internas o el nombre del PM.
  No re-reportar como vuln.
- **Los casts `as` en fronteras CLI/FS** (readPackageJson, manifest, `response.tools`,
  parseArgs de deepcheck, loadSnapshot) NO violan ADR-0011 (alcance DB/API). No re-reportar
  como hallazgo de tipos por la atribución. OJO: la falta de validación de FORMA sí es
  defecto real cuando el valor se USA sin normalizar (readPackageJson, loadState, readEvents).
- **`orchestrator-gate.sh` es fail-open y depende de `jq`.** Un typo en la regex o `jq`
  ausente = el gate no bloquea nada, en silencio. Es un control de autorización (ADR-0012).
- **deepcheck ejecuta en runtime la copia INLINE del umbral** (`deepcheck.workflow.js:41-49`),
  NO `src/lib.ts` (que es lo único testeado). El código verificado ≠ el código ejecutado.
- **dreaming y dev-metrics reportan `--version` hardcodeado** desalineado del package.json
  (dreaming 0.0.0 vs 0.1.1; dev-metrics 0.1.0 vs 1.0.0). El fix canónico existe en
  `cli/src/index.ts:45-47`.
- **La familia swift compila en Swift 6 (Approachable Concurrency) y sus 5 tests pasan.**
  El único ruido de concurrencia es una cita de ADR equivocada (info). No re-auditar la
  concurrencia desde cero salvo cambio en `swift-foundation/`.

## Hotspots por dimensión

Dónde mirar primero en cada dimensión, aprendido de los hallazgos confirmados:

- **qa-happy (fuente raíz #1 — `devground/setup.js`):** el flujo "Dos comandos y listo"
  del README raíz está roto de varias formas simultáneas. (a) escribe `lint-staged` como
  STRING en package.json (`:53-59`) — formato que lint-staged >=16 rechaza — y a la vez
  instala el pre-commit que lo ejecuta → **todos los commits bloqueados** (CRITICAL; el CLI
  ya lo arregló escribiendo `.cjs` con test en `installers.test.ts:138-150`). (b) hardcodea
  `pnpm exec` (`:174` + `husky-config/hooks/pre-commit.sh:29-30`) → exit 127 en npm/yarn.
  (c) viola "No sobreescribe archivos existentes" pisando AGENTS.md, `.husky/pre-commit`,
  symlinks (borra CLAUDE.md/.cursorrules reales) y el script `prepare` (`:62-66,173-175,183-218`).
  Revisa también `tsconfig/package.json:5-13` (preset `next-loose` documentado pero fuera
  del `files[]` del tarball → extends falla) y el tally de installers delegantes
  (`architecture-guide.ts:5-14`: siempre devuelven 'installed', re-runs sobre-reportan).
- **qa-edge (destrucción de datos + estado parcial):** el patrón guardeado del monorepo
  NO cubre los caminos destructivos. `agents-md/setup.js:20-60` BORRA CLAUDE.md/.cursorrules/
  copilot-instructions/styleguide reales para reemplazarlos por symlinks (pre-mortem: un
  proyecto con CLAUDE.md a mano lo pierde). `resolveInstall` (`select.ts:41-56`) instala FULL
  en CI sin flags → dispara esa destrucción sin interacción. `detect-stack.ts:21-34`:
  `hasSwift` detectado pero no consumido → repo Swift-only corre installers JS. `husky-config/
  setup.js:37-53` clobbea `prepare` + hooks custom sin warn. `devground/setup.js:32-33` no
  valida forma/parseo de package.json (null→TypeError, `42`→falso éxito, `[]`→data loss).
  `vitest.ts:29-41`: agrega `test:coverage` sin instalar `@vitest/coverage-v8`.
- **qa-errors (catch que traga la causa raíz):** `devground/setup.js:162-175` — el catch de
  `npx husky init` descarta el fallo real y el script muere después con ENOENT engañoso
  DESPUÉS de reescribir package.json (estado parcial). `husky-config/setup.js:20-29` — mismo
  patrón, reemplaza el error por mensaje genérico. `devground/setup.js:210-217` — el fallback
  de copia apunta al padre (ver invariantes). `dev-metrics init.ts:48-58` — config existe →
  `exit 1` SIN imprimir razón (el warning se genera pero nunca se muestra). `sdd/
  setup-orchestration.js:34-39` — único setup sin guarda de existencia del origen (info).
- **aud-perf (dev-metrics es el hotspot; máquina de 16 GB con incidente de RAM previo):**
  `collect.ts:154,157,210-215` parsea el corpus completo (2.6 GB) **TRES veces** en una
  corrida — una sola traversal alimentaría los tres agregados. `transcript-collect.ts:136-156`
  acumula la historia completa en heap ANTES del filtro por período (con `--since/--until`
  el 90% se descarta ya materializado → riesgo OOM); el filtro y la dedup por uuid pueden
  ser streaming por línea. `cli/index.ts:139-152` sigue haciendo hasta 8 `add -D` + 4 npx
  seriales (re-verificado de corridas anteriores, sin batching). `dreaming/gather.ts:61-69`
  hace `statSync` dentro del comparador de sort (O(n log n) syscalls).
- **aud-tests (cobertura que apunta al artefacto equivocado):** `devground/setup.js` = ruta
  crítica del núcleo, cero tests, ya reintrodujo el bug de lint-staged (`:54-56`). deepcheck:
  el umbral CRITICAL se testea en `lib.ts` pero el runtime es la copia inline de
  `deepcheck.workflow.js:41-49`. `orchestrator-gate.sh:85-125`: rama deny MCP + allowlist
  scratchpad + stripping de comillas sin ningún caso en `gate.test.sh` (gate fail-open).
  `cli/index.ts:62-65`: exit codes sin test (ninguna suite importa index.ts).
- **val-contracts (`--version` + defaults hardcodeados a la máquina del autor):**
  `dev-metrics/src/index.ts:39` (0.1.0≠1.0.0), `dreaming/src/index.ts:28` (0.0.0≠0.1.1,
  paquete publicado), `dreaming/src/index.ts:39` (`--project` default `-Users-macbookpro`
  → falla para todo consumidor). Todos con fix canónico en `cli/src/index.ts:45-47`.
- **val-requirements (drift doc↔código a tres bandas — SIEMPRE comparar las 3 docs):**
  `README.md:51-66` omite 2 de 10 installers (Vitest, ui-conventions), presenta
  `tsconfig.typecheck.json` como salida incondicional (solo Next/Astro) y omite la detección
  de Astro. `devground/README.md:24-27` omite Astro. `design-taste/README.md:9` dice "five
  skills" pero empaqueta 10. El typecheck condicional es hallazgo RECURRENTE (2 corridas sin
  cerrar).
- **aud-premortem (composición instalador↔runtime):** `devground/setup.js:153-175` promete
  Commitlint pero nunca instala el hook commit-msg (ni gitleaks) → config muerta. `setup.js:76-78`
  (rama Next) genera eslint.config.mjs que importa `eslint-config-next` (peer opcional que el
  quickstart no instala) → ERR_MODULE_NOT_FOUND. `orchestrator-gate.sh:13-15` depende de `jq`
  (macOS no lo trae) y falla-abierto sin señal.
- **aud-types (validar forma cuando el valor se USA):** `dev-metrics/lib/events.ts:26-34`
  (events.json editable a mano, castea sin verificar campos → labels/fechas 'undefined').
  `dreaming/lib/window.ts:6-14` (`loadState` castea `null`→TypeError pese a promesa de `{}`).
  Fix de una línea cada uno (validar `typeof === 'object' && !== null && !Array.isArray`).
- **aud-limits (funciones sobre umbral ADR-0010):** `cli/index.ts:57-165` (.action() 87>80,
  supresión previa INVALIDADA) y `cli/installers/tsconfig.ts:7-109` (install() 86>80, inflado
  por literales de config inline — el ADR pide extraer la constante). OJO: `renderReport` de
  dev-metrics (181 líneas) está SUPRIMIDO (ver tabla), no re-reportar.
- **aud-concurrency (swift):** solo `swift-foundation/Sources/Persistence/KeyValueStore.swift:12-14`
  cita el ADR equivocado (0019 vs 0002). El resto compila limpio en Swift 6. No re-auditar.

## Falsos positivos conocidos (supresiones)

Hallazgos reportados antes y descartados. **Cada uno lleva fecha + razón.** El
destilador los RE-VALIDA periódicamente: una supresión no es para siempre.

| Hallazgo | Razón del descarte | Fecha | Re-validar después de |
|----------|--------------------|-------|------------------------|
| deepcheck parseArgs 'normaliza' la frontera de args con casts `as` sin validar | Atribución ADR-0011 incorrecta (0011 aplica solo a DB/API, no a narrowings `as string[]` de CLI args; no son `as any`). Casts de frontera, no defecto | 2026-07-13 | re-validar si cambia knowledge/adr/0011-*.md o packages/deepcheck/src parseArgs |
| loadSnapshot castea JSON arbitrario de un path del usuario a Snapshot sin validar forma | Mecánicamente cierto (`JSON.parse as Snapshot`, path de CLI) pero severity/encuadre "defect" no aplica: es artefacto interno del propio flujo, no frontera no confiable con daño accionable | 2026-07-13 | re-validar si el snapshot pasa a leerse de fuente externa o su forma se usa sin normalizar |
| Los hooks degradados asumen un backstop de CI que devground nunca instala ("CI valida secretos") | Bajo la lente de CORRECTITUD el hook hace lo que su diseño documentado dice; la premisa del backstop es de diseño/política, no un bug de comportamiento | 2026-07-13 | re-validar si cambia husky-config/hooks/*.sh o la doc de degradación |
| Gate orquestación: allowlist de `git commit` no cubre mensajes multilínea o con `;`/`&`/`|` (heredoc siempre denegado) | Mecanismo verificado (una línea→allow; `;`/`|`/heredoc→deny) pero mischaracteriza el impacto: el deny es fail-safe (deniega de más, no de menos) y el orquestador tiene otros caminos | 2026-07-13 | re-validar si orchestrator-gate.sh cambia el parsing de git commit o la política pasa a fail-open |
| dreaming resolveProject: root inexistente → readdirSync(root) lanza ENOENT crudo enmascarando el mensaje amistoso | Mecanismo cierto (gather.ts:36) pero neutralizado en este flujo: el trigger ("--root con typo") no es el camino normal y el default de --project ya falla antes con su propio problema | 2026-07-13 | re-validar si cambia packages/dreaming/src/lib/gather.ts:36 o el orden de validación de root |
| devground-adr: subcomando desconocido imprime usage y sale con exit 0 (misuse como éxito) | Code-accurate (adr-new.js:55-58 exit 0) pero la razón de daño no aplica a este flujo: es un helper interno de docs, no un gate de CI ni escribe estado destructivo | 2026-07-13 | re-validar si adr-new.js pasa a usarse en scripts que dependan del exit code |
| renderReport (dev-metrics) tiene 181 líneas — 2.3x el umbral de ADR-0010, la función más larga del núcleo | Conteo correcto (report.ts:21-220) pero ignora las salvaguardas del propio ADR-0010: ~80 es señal `warn` no error, y el cuerpo es render declarativo (template de salida), el caso que el ADR exime | 2026-07-13 | re-validar si renderReport agrega lógica de control (no solo render) o crece mucho más |
| @devground/sdd: "Existing files are never overwritten" no tiene test (gate.test.sh no toca setup.js) | copyDirGuarded (setup.js:29-50) implementa la garantía correctamente (`if existsSync → skip`); es deuda de cobertura, no defecto. OJO: NO extender esta absolución a agents-md/husky, que SÍ sobreescriben (hallazgos activos) | 2026-07-13 | re-validar si cambia packages/sdd/setup.js o se añade test de sobreescritura |
| parseTranscriptLine castea a TranscriptRecord asumiendo campos numéricos sumados sin verificar tipo | En addUsage (transcript.ts:98-101) `??` cubre null/undefined; para que el daño (concatenación "05") ocurra el campo tendría que ser string en el .jsonl, que Claude Code nunca escribe. No explotable en el corpus real | 2026-07-13 | re-validar si el formato de transcript cambia o se ingiere .jsonl de fuente no-Claude-Code |
| El gate de cobertura de CI solo está activo para packages/cli (dev-metrics y sdd fuera) | Hechos correctos (solo cli define test:coverage) pero descartado como hallazgo: es política de CI/deuda de gate, no un defecto de código con daño observable; dev-metrics re-exporta el preset sin ratchet y sdd ni usa vitest por diseño | 2026-07-13 | re-validar si ADR-0025/0012 exigen el gate para todo el núcleo o cambia la config de CI |
| README raíz promete un script `prepare` que ningún installer del CLI escribe | Grep mal acotado a packages/cli/src/. La promesa SÍ se cumple (husky lo escribe vía binario). NOTA: distinto del hallazgo activo de devground/setup.js:62-66, que SÍ clobbea un `prepare` preexistente | 2026-07-13 | re-validar si cambia README.md o packages/cli/src/installers/husky.ts |
| readPackageJson/detectFramework castean con `as` en frontera (invocando ADR-0011) | El cast NO viola ADR-0011 (alcance DB/API). La falta de validación de FORMA sí es defecto real y está activa como hallazgo (qa-edge en devground/setup.js) — esta supresión cubre solo la atribución al ADR | 2026-07-13 | re-validar si cambia knowledge/adr/0011-*.md o utils/package-json.ts |
| run() ejecuta execSync con string interpolado (inyectable) / addDevDependency sink latente | Factualmente correcto pero NO explotable: inputs son listas estáticas internas o el nombre del PM detectado, no datos no confiables | 2026-07-13 | re-validar si exec.ts o package-json.ts empiezan a interpolar input de usuario |
| El manifest / response.tools del prompt se castean sin validar (index.ts) | Ciertos a nivel sintáctico pero la atribución de riesgo no aplica: son artefactos internos controlados, no frontera no confiable | 2026-07-13 | re-validar si el manifest o el prompt pasan a leerse de fuente externa |
| package-json.ts: addDevDependency/getInstallCmd sin test; index.ts sin test de orquestación | Falta de test, no fix; getInstallCmd es lógicamente correcto. OJO: las guardas de exit code y el default no-TTV SÍ están promovidas a hallazgos aud-tests por ser ruta crítica | 2026-07-13 | re-validar si se agrega/quita cobertura sobre index.ts o utils/package-json.ts |
| La action es async pero se invoca con program.parse() síncrono → unhandled rejection | Mecanismo verificado pero sin evidencia de daño observable accionable en este flujo | 2026-07-13 | re-validar si cambia index.ts (parse/parseAsync) o se añade lógica async tras el prompt |

**Supresión ELIMINADA en esta corrida (ya no es falso positivo):**
- ~~"El callback .action() concentra demasiadas responsabilidades (borde de ADR-0010)"~~ —
  la premisa numérica ("justo bajo el umbral") dejó de ser cierta: 87 líneas > 80 tras
  vitest/ui-conventions/tally. PROMOVIDO a hallazgo aud-limits (`index.ts:57-165`).

## Edge cases descubiertos

- **package.json JSON-válido-pero-no-objeto** (fuente raíz, viva en `devground/setup.js:32-33`,
  el camino "instala todo de una" que NO recibió el fix del CLI):
  - `null` → TypeError crudo.
  - escalar `42`/`"x"` → asignaciones `pkg.prettier = …` se ignoran en modo sloppy → loguea
    "Prettier config activado" + reescribe el archivo SIN activar nada (falso éxito).
  - array `[]` → las claves añadidas se pierden en JSON.stringify (data loss silencioso).
  - JSON inválido → SyntaxError sin mensaje accionable.
- **Re-ejecución de `devground-setup` sobre un proyecto ya configurado** = pérdida de datos:
  pisa AGENTS.md, `.husky/pre-commit`, borra CLAUDE.md/.cursorrules reales (los asume symlinks
  propios) y clobbea un `prepare` compuesto (`"husky && patch-package"`). Sin confirmación.
- **`resolveInstall` en no-TTY sin flags** (pipe, CI, script, agente IA) instala el preset
  FULL → dispara los installers destructivos (agents-md, husky) sin interacción humana. La
  regresión de política NO tiene test.
- **Repo Swift-only (sin package.json)**: `hasSwift` se detecta pero no se consume →
  prettier/vitest revientan ENOENT (contados "failed"), mientras eslint/tsconfig/commitlint/
  lint-staged SÍ escriben configs JS y shellean `npm install -D` sin manifiesto (npm resuelve
  el package.json ancestro → puede mutar un proyecto padre no relacionado). Peor que el crash
  limpio previo a la tolerancia.
- **Proyecto npm/yarn con hook `pnpm exec`**: `git commit` falla con exit 127 (`pnpm: command
  not found`); en commit-msg el mismo fallo se malinterpreta como "commitlint no disponible"
  y se OMITE la validación con diagnóstico equivocado.
- **Fallback de copia symlink (Windows sin permisos)**: `path.resolve(targetDir, '../AGENTS.md')`
  apunta al PADRE. Si el padre no tiene AGENTS.md → ENOENT no capturado a mitad del setup; si
  el padre casualmente tiene uno (`~/Documents/AGENTS.md`) → copia contenido AJENO al proyecto
  en silencio y reporta éxito.
- **Next sin `eslint-config-next`** (proyecto no generado por create-next-app con ESLint):
  `devground-setup` genera un eslint.config.mjs que lo importa estáticamente → `pnpm lint` y
  el `eslint --fix` de lint-staged en pre-commit crashean con ERR_MODULE_NOT_FOUND (error de
  módulo que no apunta a devground). `devground-init` sí instala la dep; `devground-setup` no.
- **`devground-dreaming gather` sin `--project`** (todo consumidor que no sea el autor): falla
  siempre con el default `-Users-macbookpro` que jamás existirá en su máquina.
- **events.json / state.json editados a mano o truncados**: un elemento sin `label` o un
  `null` literal atraviesa el cast → labels/fechas 'undefined' en el reporte (events) o
  TypeError pese a la promesa de degradar a `{}` (dreaming loadState).
- **`orchestrator-gate.sh` sin `jq` instalado** (macOS limpio): el gate falla-abierto en
  silencio; el usuario cree tener la "regla dura" activa pero no bloquea nada.
- **deepcheck: ajustar el umbral en `lib.ts` y olvidar el espejo inline del workflow** → toda
  la suite verde mientras el workflow real confirma/descarta con la regla vieja.
