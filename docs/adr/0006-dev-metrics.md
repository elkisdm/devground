# ADR-0006: dev-metrics — serie temporal de "codificar con agentes"

- **Estado**: Propuesto
- **Fecha**: 2026-06-02 (v1) · 2026-06-02 (v2: atribución real por repo, cohortes, memoria) · 2026-06-02 (v3: config + auto-detección, N-identidad, `created` frontmatter, `extends` de tsconfig)
- **Decisor**: edaza
- **Aplica a**: `@devground/dev-metrics`

## Contexto

El usuario desarrolla casi exclusivamente "con agentes" (Claude Code). Quiere
saber, de forma medible y a lo largo del tiempo, si está mejorando: ¿el código
sobrevive más?, ¿hay menos re-trabajo?, ¿la eficiencia (tokens por unidad de
trabajo) baja?, ¿adoptar un estándar realmente movió la aguja?

Medir un solo día no responde nada. El valor está en una **serie temporal
etiquetada**: snapshots reproducibles que se puedan comparar y, en el futuro,
analizar causalidad (evento de adopción → cambio de régimen). Por eso el diseño
prioriza:

1. Snapshots **auto-descriptivos** (período, autores, schema version embebidos).
2. Métricas con **definiciones fijas** para que sean comparables entre fechas.
3. **Anotaciones de eventos** que permitan separar transición de régimen.

Las fuentes de datos son dos: el historial de git (varios repos) y los
transcripts de Claude Code (`~/.claude/projects/**/*.jsonl` + un directorio de
backup **opcional** configurable vía `transcriptBackupDir`).

## Decisión

Se crea el paquete CLI `@devground/dev-metrics` con cuatro comandos:

- `collect` — produce un snapshot JSON auto-descriptivo en `snapshots/<fecha>.json`.
- `report <snapshot>` — render markdown legible.
- `diff <A> <B>` — tabla comparativa (delta + % por métrica), alineada con eventos.
- `event` — registra una anotación (adopción de estándar/herramienta) con su fecha.

Mismas convenciones que `@devground/dev-metrics`' hermano `devground-init`:
TypeScript strict (ADR-0004), `module: NodeNext`, `commander`, vitest, Node
stdlib (`child_process`, `fs`) sin dependencias pesadas. Las funciones de cálculo
son **puras y testeadas** (parser de conventional commit, ratio neto/bruto,
Pearson/R², dedup por uuid, distribución de re-toque).

### Definiciones de métricas (fijas — no cambiar sin bump de `schemaVersion`)

**Git (por lista configurable de repos, filtrado por set de emails):**

- **commits por autor-identidad**: `git log --author=<email>`, sin merges.
- **churn**: líneas añadidas/borradas vía `--numstat`.
- **ratio neto/bruto** = `(add - del) / (add + del)` → "supervivencia del código".
  Rango `[-1, 1]`; `0` si no hubo churn.
- **distribución de tipos** conventional (feat/fix/refactor/chore/docs/test/...).
- **ratio rework** = `(fix + refactor) / feat`; `null` si no hay `feat`.
- **re-toque por archivo** → `% one-shot` (tocado 1 vez) vs `% re-trabajado`
  (5+ veces), sobre la lista de archivos del `--numstat`.
- **commits por día activo** = commits / días distintos con ≥1 commit.

**Transcripts de Claude Code:**

- **tokens** input/output/cache_creation/cache_read desde `message.usage`,
  por período y por modelo (`message.model`).
- **tool_use por tipo**: Write, Edit (incluye MultiEdit), Read, Bash, Other.
  **ratio Edit/Write**.
- **iteración por archivo**: ops (Write+Edit) sobre el mismo `file_path` dentro
  de una sesión → `% one-shot` (1 op) vs `% iterado` (4+ ops); ops/archivo.
- **derivadas**: tokens/commit, tool-calls/commit.
- **calibración**: correlación churn↔output_tokens por proyecto con **R²**
  (Pearson²), computada sobre los totales **reales** por repo (ver v2 abajo).
- **dedup por `uuid`**: el backup y el dir vivo se solapan; se descartan
  mensajes con uuid ya visto.

### v2 — Atribución REAL de tokens por repo (corrige error de v1)

La v1 repartía los tokens por repo de forma **estimada** (proporcional al
churn), bajo la premisa errónea de que "los transcripts no atribuyen tokens por
proyecto". **Eso era incorrecto.** Los transcripts SÍ están organizados por
carpeta de proyecto:

- Viven en `~/.claude/projects/<DIR>/**/*.jsonl` (más el backup congelado).
- `<DIR>` se deriva de la ruta absoluta del repo:
  `<DIR> = repoPath.replace(/[^A-Za-z0-9]/g, '-')`.
  Ej: `/Users/macbookpro/Documents/encuentrosmart`
  → `-Users-macbookpro-Documents-encuentrosmart`.
  (Verificado contra el disco; un espacio y un guion del path producen doble
  guion, que coincide con `HCLP--Capitalinteligente`.)

`collect` ahora, para cada repo: deriva `<DIR>`, lee sus `*.jsonl` (live +
backup), deduplica por `uuid`, filtra por período y **suma** `message.usage`.
Los `outputTokens`/`totalTokens` por repo son **medición**, no estimación. El
R² churn↔tokens se calcula con estos totales reales (excluyendo repos sin dir,
para que un dir ausente no se confunda con un cero genuino). La función pura de
mapeo `repoPathToProjectDir` está testeada.

Lo que **NO** mapea a ningún repo pedido (`subagents`, sesiones desde `~`,
otros repos) se acumula en un bucket `unattributed` y **no se reparte**.

### v2 — Adopción de estándares + cohortes

Por repo se detectan marcadores (vía `git log --diff-filter=A --reverse`):
fecha de PRIMERA aparición de `tsconfig.json` (y si HOY tiene `"strict": true`
vía `git show HEAD:tsconfig.json`), `.husky/pre-commit`,
`eslint.config.{js,mjs,cjs}`, primer test (`*.test.ts(x)`/`*.spec.ts`) y primer
commit conventional (reusa el parser de `conventional.ts`), más la fecha de
nacimiento (primer commit). Se persiste como `adoption[]` en el snapshot.

Cohorte (clasificación pura, testeada) sobre los marcadores **clave** (tsconfig,
eslint flat config, primer test): `born-standardized` (todos dentro de ~7 días
del nacimiento), `retrofitted` (todos presentes pero alguno después) o `partial`
(falta alguno). `report` y `diff` agregan por cohorte (born-standardized vs el
resto). `collect` auto-siembra `events.json` con los marcadores detectados
(desactivable con `--no-seed-events`).

### v2 — Memoria / costo de contexto (opcional y agnóstica al backend)

La memoria es **opcional** y dev-metrics es **agnóstico al backend** que la
respalde: no asume ninguna herramienta concreta. Si el usuario no usa memoria o
no existen directorios `memory/`, la sección se omite con gracia. Su beneficio,
cuando se usa, es continuidad de contexto a largo plazo, no churn. Métricas:

- **Corpus de memoria**: nº de `.md` (excluyendo `MEMORY.md`) bajo
  `~/.claude/projects/<proyecto>/memory/`, por proyecto y por semana ISO, más
  bytes totales. La fecha de cada nota se toma del `created:` del frontmatter
  (ruta robusta, inmune al reseteo de mtimes); fallback a mtime solo si falta.
- **Tasa de crecimiento**: notas nuevas por semana (`notesByWeek`).
- **Context cost (PROXY)**: tokens de output en los primeros N (=3) mensajes de
  cada sesión = costo de re-establecer contexto al arrancar; la tendencia a la
  baja sugiere mejor continuidad. Es un **proxy**, no una medición directa.
- **Señal de reutilización**: sesiones con un `tool_use` `Read` sobre una ruta
  que contiene `/memory/`.

Por defecto **no** se hace la partición antes/después, **no** se emite caveat de
mtime y **no** se auto-siembra ningún evento de memoria. Solo si se configura
`memoryBackendMigrationDate` (YYYY-MM-DD) —la fecha en que se migró el backend de
memoria y eso pudo resetear mtimes— se habilita el split antes/después en
términos genéricos ("migración de backend de memoria el `<fecha>`"), el caveat de
mtime, y se auto-registra el evento genérico `<fecha> | memory backend
migration`. Definir un **estándar de memoria agnóstico a la herramienta** queda
como trabajo futuro.

### v3 — Reutilizable: config + auto-detección, sin asumir cardinalidad

La v1/v2 asumía implícitamente el setup del autor (su lista de repos y sus 2
identidades GitHub se pasaban por flags). Como el paquete es **publicable y
reutilizable**, la v3 elimina toda suposición de un número fijo de cuentas o de
repos. Sirve igual a alguien con **1 repo y 1 cuenta** que a alguien con **19
repos y 2 cuentas**.

**Comando `init`** (`commands/init.ts`): genera un `dev-metrics.config.json`
versionable. Degrada con gracia en cada paso (nunca crashea):

- **Cuentas GitHub**: `parseGhAuthStatus` parsea `gh auth status` (1, 2 o N
  cuentas, con su flag `Active account`). Si `gh` no está o no hay login,
  `detectGithubAccounts` devuelve `[]` + warning. Función de parseo **pura y
  testeada** (no requiere `gh` para el test).
- **Repos**: `discoverRepos` escanea un `baseDir` configurable (default
  `~/Documents`, profundidad acotada, default 2) buscando `.git`. Excluye forks
  de terceros heurísticamente (`isLikelyThirdPartyFork`: el owner del remote
  `origin` no coincide con ninguno de los logins de `gh`); `--include-forks` lo
  desactiva. Parsers (`parseRemoteOwner`) **puros y testeados**.
- **Identidades** (v4 — corrige inferencia sobre-eager): `inferIdentities`
  infiere emails del `git log` y los **ancla a las cuentas detectadas por `gh`**.
  Los noreply de GitHub `<id>+<usuario>@users.noreply.github.com` son el
  identificador **canónico** de la cuenta, NO un marcador de bot: `parseNoreplyUsername`
  (pura y testeada) extrae el `<usuario>` y, si matchea (case-insensitive) un login
  `gh`, la identidad se CONFIRMA (el código anterior los filtraba — estaba al revés).
  El resultado se separa en dos buckets:
  - `identities` (alta confianza): noreply que matchean cuenta `gh` + emails
    personales con evidencia fuerte de ser la misma persona (local-part que mapea a
    un login `gh` vía `localPartMatchesAccount`, ej. `edaza@…` ↔ `edaza-create`; o
    co-ocurrencia con una identidad confirmada en 2+ repos distintos).
  - `candidateIdentities` (ambiguas): emails que no mapean a ninguna cuenta (un
    colega que comparte un solo repo, automatización que pasó el filtro). NO se usan
    para filtrar git — el usuario las revisa y promueve a mano.
  Bots/agentes se descartan vía `isBotEmail` (`[bot]`, `noreply@anthropic.com`,
  `@local`, `codex`, `cursoragent`, `@cursor.com`, `github-actions`). En particular
  `codex@local` ahora se filtra (antes pasaba). `init` escribe ambos campos y avisa:
  "N identidades confirmadas, M candidatas (revísalas en el config)".
- **Override manual**: el config es editable a mano (repos/identidades/candidatas/
  excludes/events).

**Shape del config** (`DevMetricsConfig`):
`{ repos: string[], identities: string[], candidateIdentities?: string[], baseDir?, excludes?, events? }`.

**Precedencia de configuración** (documentada y testeada en
`commands/resolve.ts`): **flags CLI > `dev-metrics.config.json` > auto-detección**,
resuelta **por campo** (puedes pasar `--repos` y dejar identidades al config o
auto). La auto-detección corre **perezosamente**, solo para el campo que ni
flags ni config aportaron. Aplica a `collect`. El log imprime la fuente
(`flag`/`config`/`auto`) de cada campo.

### v3 — N-identidad que degrada con gracia

Toda la lógica funciona con 1..N identidades. Con **1 sola identidad** la
dimensión de atribución por cuenta se **OMITE** (el reporte no muestra el
desglose "Commits by identity"; no se inventa). Con **2+** identidades que
realmente commitearon en el período, se habilita. La atribución de **tokens por
CUENTA** sigue siendo imposible (los transcripts no guardan email/accountUuid
por línea) — esto es **ortogonal** al número de identidades (caveat 1).

### v3 — Memoria: fecha desde `created` del frontmatter (corrige caveat 5)

Las notas del vault fueron backfilleadas con `created: YYYY-MM-DD` en el
frontmatter. `listMemoryNotes` ahora toma la fecha de cada nota de ese campo
(`parseCreatedFrontmatter`, **pura y testeada**), que es **inmune al reseteo de
mtimes** de la migración. Solo si `created` falta se cae a mtime, y `collect`
avisa cuántas notas quedaron en ese caso (`notesFromMtime`).

### v3 — `strict` resuelve la cadena `extends` del tsconfig (corrige caveat 4)

`isStrictFromConfigs` (pura, testeada) sigue la cadena `extends` del tsconfig:
un repo que hereda `"strict": true` de un `tsconfig.base.json` relativo se
detecta correctamente; un `strict: false` explícito en el hijo override; un
`extends` a paquete (`@tsconfig/strictest`) no se puede leer desde git y corta
la cadena (limitación residual). Tolerante a JSONC (comentarios + comas
finales).

## Caveats metodológicos (reales, verificados — el código los documenta)

1. **La partición POR REPO de tokens es MEDICIÓN (v2 corrige a la v1).** Los
   transcripts SÍ están organizados por carpeta de proyecto (`<DIR>`), así que
   los tokens por repo se **miden** sumando `message.usage` de cada
   `~/.claude/projects/<DIR>`. Lo ÚNICO inatribuible es la **CUENTA** que pagó
   (personal vs trabajo): los transcripts no guardan email/accountUuid por
   línea. **No confundir cuenta con proyecto.** Lo que no mapea a ningún repo
   pedido va al bucket `unattributed` (no se reparte). **v3**: esto es
   **ortogonal al número de identidades**. Tengas 1 o N identidades, el gasto de
   tokens por cuenta sigue sin poder atribuirse desde los archivos; la
   N-identidad solo afecta el desglose de **commits** por autor (git), que sí es
   atribuible.

2. **Ventana de retención ~33 días.** El cleanup de Claude Code borra
   transcripts a ~33 días, así que los meses viejos quedan **parciales**. Un
   directorio de backup **opcional** (`transcriptBackupDir`) recupera parte. Por
   eso `collect` lee live + backup y **deduplica por uuid** (de lo contrario el solape
   duplica todo). Aplica también a la atribución por repo y a las señales de
   memoria.

3. **R² churn↔tokens sobre datos reales, pero sensible al N.** Ya no se calcula
   sobre estimados: usa los totales reales por repo. Con pocos repos es ruidoso
   (con 2 repos Pearson siempre da ±1). Interpretar con N ≥ 5 repos.

4. **Costo de transición ≠ degradación.** Adoptar un estándar genera una ola de
   refactor/docs que **infla temporalmente** rework y tokens/commit. Eso es
   costo de transición, no que el desarrollador empeore. Por eso existen las
   **anotaciones de eventos**: `diff` lista los eventos que caen entre A y B
   para leer los deltas en contexto. En v2 los marcadores de adopción se
   auto-siembran para facilitar esta alineación. **v3**: la detección de
   `"strict": true` resuelve la cadena `extends` (relativa) del tsconfig; un
   `extends` a paquete sigue sin poder leerse desde git (limitación residual).

5. **Memoria: fecha desde `created` (v3 corrige la v2) + proxy.** La fecha de
   cada nota se toma del campo `created:` del frontmatter (el vault fue
   backfilleado), **inmune al reseteo de mtimes** de la migración del
   2026-05-16. Solo si `created` falta se cae a mtime con advertencia
   (`notesFromMtime`), caso en que el volumen pre-migración no es confiable. El
   "context cost" sigue siendo un **PROXY** (tokens de output en los primeros N
   mensajes por sesión), no una medición directa de la efectividad de la
   memoria.

## Consecuencias

**Positivas**
- Base verificable y reproducible para responder "¿estoy mejorando?".
- Snapshots versionables: el `events.json` se commitea; los snapshots no
  (`.gitignore`), evitando ruido en git pero conservando el log curado.
- Funciones puras → alta cobertura de tests, bajo costo de mantenimiento.

**Negativas / Trade-offs**
- Los tokens por repo son medición, pero el gasto **por cuenta** sigue sin
  poder atribuirse desde los archivos (caveat 1) — sirve para tendencia, no
  para facturación por cuenta.
- Series históricas previas a ~33 días atrás son incompletas (caveat 2).
- El `diff` por cohorte requiere ≥ 1 repo por cohorte para ser interpretable;
  el R² requiere varios repos (caveat 3).
- Las métricas de memoria dependen de mtime pre-migración poco confiable y de
  un proxy de context cost (caveat 5).

## Alternativas consideradas

1. **Métrica puntual (un solo reporte, sin serie):** descartado — no permite
   análisis de evolución ni de causalidad, que es el objetivo.
2. **Parsear costos desde una API de billing de Anthropic:** no disponible a
   nivel de archivo local; además no resuelve la atribución por cuenta.
3. **Dependencia de una librería de stats (simple-statistics, etc.):**
   innecesaria; Pearson/R² son ~20 líneas de stdlib y evitan peso (coherente con
   "simplicidad > pureza" de knowledge/BEST-PRACTICES.md).

## Referencias

- [ADR-0004 — TypeScript strict](0004-typescript-strict.md)
- [knowledge/03-systems-design.md](../../knowledge/03-systems-design.md)
- `packages/dev-metrics/README.md`
