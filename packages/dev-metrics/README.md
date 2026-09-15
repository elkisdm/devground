# @devground/dev-metrics

CLI que registra de forma **continua** la evolución de "codificar con agentes":
volumen de código, calidad, velocidad y eficiencia. El objetivo no es medir hoy,
sino acumular una **serie temporal etiquetada** que permita comparar períodos y,
a futuro, analizar causalidad (¿adoptar un estándar mejoró las métricas?).

Fuentes de datos:

- **git**: historial de una lista configurable de repos (filtrado por emails).
- **transcripts de Claude Code**: `~/.claude/projects/**/*.jsonl`, más un
  directorio de backup **opcional** si configuras `transcriptBackupDir` (se
  espera un subdirectorio `projects/` dentro). Sin esa configuración no se lee
  ningún backup.

Ver [ADR-0006](../../docs/adr/0006-dev-metrics.md) para definiciones de métricas
y los caveats metodológicos.

## Instalación

```bash
pnpm --filter @devground/dev-metrics build
```

El binario queda en `dist/index.js` y se expone como `dev-metrics`.

## Reutilizable: no asume tu setup

Este paquete es publicable y **no asume** un número fijo de cuentas ni de repos.
Funciona igual para alguien con 1 repo y 1 cuenta que para alguien con 19 repos
y 2 cuentas. La configuración se resuelve, por campo, con esta **precedencia**:

```
flags CLI  >  dev-metrics.config.json  >  auto-detección
```

Cada campo (repos, identidades) se resuelve por separado: puedes pasar `--repos`
por CLI y dejar que las identidades vengan del config o de la auto-detección.

### `dev-metrics.config.json` (versionable)

<!-- Este bloque se copia a mano: Prettier le agregaría una coma final que JSON.parse rechaza. -->
<!-- prettier-ignore -->
```jsonc
{
  "repos": ["/ruta/repoA", "/ruta/repoB"], // 1..N (nunca un número fijo)
  "identities": ["123+tuusuario@users.noreply.github.com", "tu@correo.com"], // CONFIRMADAS
  "candidateIdentities": ["colega@empresa.cl"], // ambiguas: revísalas y promuévelas a mano
  "baseDir": "/Users/tu/Documents", // carpeta a escanear por `init`
  "excludes": ["vendor", "legacy"], // fragmentos de ruta a excluir
  "events": [{ "date": "2026-05-14", "label": "adopté eslint" }] // opcional
}
```

## Comandos

### `init`

Auto-detecta cuentas, repos e identidades y escribe un `dev-metrics.config.json`
versionable. **Degrada con gracia** en cada paso (si `gh` no está, si no hay
repos, si un repo no tiene remote: no crashea, avisa).

```bash
dev-metrics init                       # escanea ~/Documents, escribe ./dev-metrics.config.json
dev-metrics init --base-dir ~/code --max-depth 3
dev-metrics init --include-forks       # no excluir forks de terceros
dev-metrics init --force               # sobrescribir un config existente
```

Qué hace:

- **Cuentas GitHub**: parsea `gh auth status` (1, 2 o N cuentas). Si `gh` no
  está o no hay login, sigue sin cuentas y avisa.
- **Repos**: escanea `baseDir` (profundidad acotada, default 2) buscando `.git`.
  Excluye forks de terceros heurísticamente (owner del remote `origin` distinto
  a tus logins de `gh`); `--include-forks` lo desactiva.
- **Identidades**: infiere emails reales del `git log` y los **ancla a las
  cuentas detectadas por `gh`**. Los noreply de GitHub tienen forma
  `<id>+<usuario>@users.noreply.github.com`: `parseNoreplyUsername` extrae el
  `<usuario>` y, si coincide (case-insensitive) con una cuenta `gh`, esa identidad
  es del usuario y se **CONFIRMA** (esos noreply son el identificador canónico de
  la cuenta, no se filtran). Resultado en dos buckets:
  - `identities` (alta confianza): noreply que matchean una cuenta `gh` + emails
    personales cuyo local-part mapea a un login `gh` (ej. `edaza@…` ↔ `edaza-create`)
    o que co-ocurren con una identidad confirmada en 2+ repos.
  - `candidateIdentities` (ambiguas): emails que no mapean a ninguna cuenta (ej. un
    colega, o automatización que pasó el filtro). NO se usan para filtrar git;
    el usuario las revisa y mueve las suyas a `identities`.
    Se filtran bots/agentes (`[bot]`, Anthropic, Cursor, `codex`, `cursoragent`,
    `github-actions`, `@local`) vía `isBotEmail`. El log avisa: "N identidades
    confirmadas, M candidatas".

El config resultante es **editable a mano** (override manual de repos/identidades).

| Opción                   | Default                     | Descripción                          |
| ------------------------ | --------------------------- | ------------------------------------ |
| `--config <path>`        | `./dev-metrics.config.json` | Dónde escribir el config.            |
| `--base-dir <dir>`       | `~/Documents`               | Carpeta a escanear.                  |
| `--max-depth <n>`        | `2`                         | Profundidad máxima de escaneo.       |
| `--excludes <fragments>` | —                           | Fragmentos de ruta a excluir (coma). |
| `--include-forks`        | (excluye forks)             | Conservar forks de terceros.         |
| `--force`                | (no sobrescribe)            | Sobrescribir un config existente.    |

### `collect`

Computa un snapshot JSON auto-descriptivo. Resuelve repos/identidades por la
precedencia documentada (flags > config > auto-detección).

```bash
dev-metrics collect \
  --repos /ruta/repoA,/ruta/repoB \
  --emails tu@correo.com,otro@correo.com \
  --since 2026-05-01 \
  --until 2026-05-31 \
  --label "2026-05 baseline"
```

| Opción                 | Default                     | Descripción                                                           |
| ---------------------- | --------------------------- | --------------------------------------------------------------------- |
| `--repos <paths>`      | config / auto               | Repos a recorrer (coma). Override del config/auto-detección.          |
| `--emails <emails>`    | config / auto               | Emails de autor para filtrar git. Override del config/auto-detección. |
| `--config <path>`      | `./dev-metrics.config.json` | Config a leer si no pasas flags.                                      |
| `--since <date>`       | —                           | Solo commits/transcripts ≥ fecha (YYYY-MM-DD).                        |
| `--until <date>`       | —                           | Solo commits/transcripts ≤ fecha.                                     |
| `--label <text>`       | —                           | Etiqueta libre del snapshot.                                          |
| `--out-dir <dir>`      | `./snapshots`               | Carpeta de salida.                                                    |
| `--events-file <path>` | `./snapshots/events.json`   | Log de eventos.                                                       |
| `--no-seed-events`     | (siembra activa)            | No auto-sembrar `events.json` con marcadores detectados.              |

Si no pasas `--repos`/`--emails` y no hay config, `collect` **auto-detecta**
(escanea `~/Documents` por repos e infiere identidades del `git log`). El log
imprime de qué fuente salió cada campo (`flag`/`config`/`auto`).

Salida: `snapshots/<fecha-iso>.json`.

### `report`

Render markdown legible de un snapshot.

```bash
dev-metrics report snapshots/2026-06-02T17-44-04-568Z.json
```

### `diff`

Tabla comparativa (delta + % por métrica) entre dos snapshots. Lista los eventos
que caen entre A y B para leer los deltas en contexto (un refactor post-adopción
infla rework temporalmente — es transición, no degradación).

```bash
dev-metrics diff snapshots/A.json snapshots/B.json
```

### `event`

Registra una anotación (adopción de estándar/herramienta) para alinear pre/post
en los `diff`.

```bash
dev-metrics event \
  --date 2026-05-14 \
  --label "adopted @devground standards" \
  --description "ESLint + TS strict + husky + commitlint"
```

Se guarda en `snapshots/events.json` (ese archivo SÍ se commitea; los snapshots
no, ver `.gitignore`).

### `spec-flow-impact`

Mide el impacto REAL de spec-flow: segmenta cada repo en cambios **spec-flow** (el
commit que toca `.spec-flow/events.jsonl`) vs un **control** pre-rollout del mismo repo,
y reporta test-coupling, ADR-coupling, atomicidad, supervivencia y fricción. Tres reglas
anti-trampa (ver ADR-0014): detectores estrictos (no substring), agregación
baseline-relative (mediana de deltas por-repo), y control recency-matched (los K commits
más recientes pre-rollout, no una ventana calendario que mata la muestra).

```bash
dev-metrics spec-flow-impact                 # usa repos/identidades del config
dev-metrics spec-flow-impact --repos ~/a,~/b --emails me@x.com
```

**Señales de spec-flow 0.6 (ADR-0037)**: spec-flow escribe DOS eventos por cambio a
`.spec-flow/events.jsonl` (`event:"spec"` y `event:"review"`), porque se conocen en
momentos distintos y viajan en commits distintos — la telemetría de 0.5 forzaba
placeholders como `"findings":"pending"` cuando el review todavía no cerraba. Un
tercer tipo, `event:"assumption_reversed"`, es la reversión de un supuesto y NUNCA
cuenta como un cambio Tier 0-3. El evento `spec` lleva `premortem`/`spec_review`
(Step 3/3.6); el evento `review` lleva el cierre del bucle: `passes`, `findings`,
`findings_capped`, `found_total`, `induced`, `resolved`, `open`, `redesigned`,
`tests`.

La lectura de esta telemetría vive en `lib/spec-flow-review-loop.ts` como un
modelo de datos con once invariantes (L-1..L-11, cada una con su test en
`spec-flow-review-loop.test.ts`), no como una lista suelta de métricas:

- **L-1** la unidad es el **cambio**: los `spec` se colapsan por `change`
  (el último por `ts` gana; sin `change` se descarta), y su review es el
  `review` más reciente con `ts ≥` el del spec, o el `review` inline del
  propio spec (L-6), o ninguno (cambio **abierto**).
- **L-2** un campo ausente es **desconocido**, nunca `0` ni `false`; un
  review "no aplicó" (`level` ausente o `"n/a"`) excluye el cambio de TODAS
  las métricas, incluida "sin cierre".
- **L-3** los hallazgos de 1ª pasada son exactos, censurados
  (`findings_capped:true`) o desconocidos (flag ausente); la media usa solo
  los exactos, y cada brazo reporta los tres conteos y su `cappedShare` aparte
  — un brazo con datos nunca es `null` aunque su media lo sea.
- **L-4** "sin cierre" cubre cambios Tier ≥ 1 que son 0.6 o traen review
  inline, sin review aplicable o con `findings` no numérico (`"pending"`); el
  agregado entre repos es la **mediana** del ratio `count/n` de cada repo
  (nunca `count`/`n` agrupados de golpe), con `count`/`n` totales aparte, solo
  para contexto.
- **L-5** los hallazgos de 1ª pasada se comparan en brazos exhaustivos y
  excluyentes sobre cambios 0.6 Tier ≥ 2: `con pre-mortem` (`na ≤ 3`),
  `pre-mortem de cumplimiento` (`na ≥ 4` o `premortem:false`), `sin declarar`
  (ausente/`"n/a"`/`true` legado) y `línea base 0.5` (el `review` inline
  anterior a 0.6, que no conocía el tope de hallazgos).
- **L-6** el contrato intermedio — un spec 0.6 con `review` inline, como el
  que ya circula en producción — se lee igual que un evento `review` propio.
- **L-7** la IDENTIDAD de un repo es su **root commit** (`git rev-list
--max-parents=0 HEAD`), no el `git-common-dir` — dos clones independientes
  del mismo repositorio (dos `.git` distintos, misma historia) se reconocen
  como uno solo. `git-common-dir` (canonicalizado con `realpath`) se usa
  DESPUÉS, solo para elegir el **worktree principal** dentro de un grupo ya
  identificado por root commit; sin ganador claro, gana el primero visto. Un
  path cuyo gitdir no se puede resolver (worktree huérfano) se **descarta**,
  nunca se conserva — no hay root commit al que atribuirle su historia.
- **L-8** `--until` se valida como `YYYY-MM-DD` real y usa un solo reloj:
  eventos por `date ≤ until`, git con `--until=<until>T23:59:59`.
- **L-9** una sola llamada a `git log -p` clasifica cada commit por las
  líneas que AGREGA en el mismo diff: agrega ≥1 línea spec (o sin
  discriminador) cuyo `change` no aparece también en una línea borrada del
  mismo commit → spec-flow; si no, pero agrega algo parseable (un `review`,
  una reversión, o un `spec` REESCRITO — mismo `change` borrado y re-agregado)
  → **seguimiento** (ni spec-flow ni control); si no agrega nada parseable
  (borra solo, o git falla) → ninguno de los dos, nunca spec-flow por
  defecto.
- **L-10** también se leen `assumptions` (tasa de reversión de supuestos,
  dividida por el MÁXIMO `assumptions` declarado entre todas las líneas spec
  del cambio, no solo la última si el spec se re-emitió con un número menor),
  `spec_review` (adopción del gate), `tests` (verificados en Tier 2+, solo
  cambios 0.6 con review aplicable y un valor real de `tests`, nunca `"n/a"`
  ni la baseline 0.5) y `resolved`/`found_total` (resueltos sobre
  encontrados, solo sobre cambios con review aplicable).
- **L-11** cada número del reporte lleva su `n`; `repos` en el encabezado
  cuenta solo los repos con al menos un dato; el render es puro (no escribe
  en stdout).

Por repo se calcula su propio `ReviewLoopStats`; entre repos se combina con la
MISMA regla que el resto del reporte (mediana de valores por-repo, nunca un pool
crudo de eventos — un repo con más cambios no debe dominar el promedio).

### `orientation`

Mide el **costo de orientación**: output tokens gastados antes del primer `Edit`/`Write`
por sesión (lo que cuesta orientarse antes de tocar código), más un _share_ robusto al
tamaño de tarea, y una comparación del payoff del codemap restringida a repos que
realmente tienen `docs/codemap.md` (ver ADR-0015).

```bash
dev-metrics orientation --repos ~/a,~/b      # repos para detectar cuáles tienen codemap
```

## Métricas

**N-identidad (1..N, degrada con gracia):** toda la lógica funciona con 1, 2 o
N identidades. Con **1 sola identidad** la dimensión de atribución por cuenta se
**omite** (el reporte no muestra el desglose "Commits by identity" — no la
inventa). Con **2+** identidades que realmente commitearon, se habilita. La
atribución de **tokens por CUENTA** sigue siendo imposible (los transcripts no
guardan email/accountUuid por línea) — esto es **ortogonal** a cuántas
identidades configures.

**Git:** commits por autor, churn (add/del), ratio neto/bruto
`(add-del)/(add+del)`, distribución de tipos conventional, ratio rework
`(fix+refactor)/feat`, % archivos one-shot vs re-trabajados (5+), commits/día
activo.

**Transcripts:** tokens (input/output/cache_creation/cache_read) por período y
modelo, tool_use por tipo (Write/Edit/Read/Bash), ratio Edit/Write, iteración por
archivo (% one-shot vs 4+ ops, ops/archivo), tokens/commit, tool-calls/commit,
correlación churn↔output_tokens con R². Dedup por `uuid`.

**Atribución REAL por repo (v2):** los transcripts SÍ están organizados por
carpeta de proyecto. Para cada repo se deriva su directorio en
`~/.claude/projects/<DIR>` donde `<DIR> = repoPath.replace(/[^A-Za-z0-9]/g, '-')`
(ej. `/Users/macbookpro/Documents/encuentrosmart` →
`-Users-macbookpro-Documents-encuentrosmart`). Se leen sus `*.jsonl` (live +
backup), se deduplica por `uuid`, se filtra por período y se **suman** los
`message.usage`. Los tokens por repo son **medición**, no estimación. Los tokens
de carpetas que no mapean a ningún repo de la lista (`subagents`, sesiones desde
`~`, otros repos) van a un bucket `unattributed` — nunca se reparten. El R²
churn↔tokens se computa sobre estos totales reales por repo.

**Adopción de estándares + cohortes (v2):** por repo se detecta la fecha de
PRIMERA aparición de `tsconfig.json` (y si HOY tiene `"strict": true`),
`.husky/pre-commit`, `eslint.config.{js,mjs,cjs}`, primer archivo de test, y el
primer commit conventional, más la fecha de nacimiento (primer commit). Cada repo
se clasifica en cohorte: `born-standardized` (marcadores clave dentro de ~7 días
del nacimiento), `retrofitted` (aparecen después) o `partial` (faltan
marcadores). `report` y `diff` agregan métricas por cohorte. `collect` auto-siembra
`events.json` con los marcadores detectados (desactivable con `--no-seed-events`).
La detección de `"strict": true` **resuelve la cadena `extends`** del tsconfig
(un repo que hereda `strict` de un `tsconfig.base.json` relativo se detecta
correctamente; un `extends` a paquete como `@tsconfig/strictest` no se puede leer
desde git y corta la cadena — limitación residual documentada).

**Memoria / costo de contexto (opcional, agnóstica al backend):** tamaño del
corpus de memoria (`.md` bajo `~/.claude/projects/*/memory/`, excluyendo
`MEMORY.md`) por proyecto y por semana ISO. La fecha de cada nota se toma del
**`created:` del frontmatter** (inmune al reseteo de mtimes y ruta robusta por
defecto); solo si falta se usa mtime. dev-metrics **no asume ninguna herramienta
de memoria**: si no usas memoria o no existen directorios `memory/`, la sección
se omite con gracia. "context cost" (PROXY) = tokens de output en los primeros N
mensajes de cada sesión (re-establecer contexto al arrancar; menor = mejor
continuidad); señal de reutilización = sesiones con un `Read` sobre una ruta
`/memory/`.

Por defecto **no** se hace la partición antes/después ni se siembra evento de
memoria. Solo si configuras `memoryBackendMigrationDate` (YYYY-MM-DD) —la fecha
en que migraste tu backend de memoria y eso pudo resetear mtimes— se habilita el
split antes/después, el caveat de mtime y se auto-registra el evento genérico
`<fecha> | memory backend migration`. Un estándar de memoria agnóstico a la
herramienta queda como **trabajo futuro**.

## Caveats (importantes)

1. **La PARTICIÓN POR REPO de tokens ahora es MEDICIÓN**, no estimación (v2,
   corrige el error de la v1). Lo ÚNICO inatribuible es la **CUENTA** que pagó
   (personal vs trabajo): los transcripts no guardan email/accountUuid por línea.
   El bucket `unattributed` aísla lo que no mapea a ningún repo pedido.
2. Claude Code borra transcripts a ~33 días → meses viejos parciales; un backup
   **opcional** (`transcriptBackupDir`) recupera parte; se deduplica por uuid al
   unir live+backup.
3. El R² churn↔tokens se calcula sobre **totales reales por repo**, pero con
   pocos repos es ruidoso (con 2 repos siempre da ±1: Pearson sobre 2 puntos).
   Interpreta con N ≥ 5 repos.
4. Adoptar un estándar infla rework y tokens/commit temporalmente (transición ≠
   degradación) → usa `event` + `diff` para separarlos. Los marcadores
   auto-sembrados ayudan a alinear pre/post.
5. **Memoria (agnóstica al backend):** la fecha de cada nota se toma del campo
   `created:` del frontmatter, que es **inmune al reseteo de mtimes** y es la
   ruta robusta por defecto. Solo si una nota **no** tiene `created` se cae a
   mtime. La partición antes/después y el caveat de mtime solo aparecen si
   configuras `memoryBackendMigrationDate` (genérica: "migración de backend de
   memoria el `<fecha>`"); en ese caso `collect` avisa cuántas notas quedaron en
   fallback a mtime. dev-metrics no asume ninguna herramienta concreta; un
   estándar de memoria agnóstico a la herramienta es **trabajo futuro**. El
   "context cost" sigue siendo un **PROXY**, no una medición directa de la
   efectividad de la memoria.

## Primer snapshot (quickstart)

```bash
# 1. build
pnpm --filter @devground/dev-metrics build

# 2. auto-detecta tu setup -> dev-metrics.config.json (revísalo/edítalo)
cd packages/dev-metrics
node dist/index.js init

# 3. snapshot (usa el config; o pasa --repos/--emails para override)
node dist/index.js collect --label "baseline $(date +%Y-%m)"

# 4. léelo
node dist/index.js report snapshots/<archivo>.json
```

## Desarrollo

```bash
pnpm --filter @devground/dev-metrics test       # vitest
pnpm --filter @devground/dev-metrics typecheck   # tsc --noEmit
```
