<div align="center">

```
        ╔═══════════════════════════════════════════════╗
        ║                                               ║
        ║    ░█▀▄░█▀▀░█░█░█▀▀░█▀▄░█▀█░█░█░█▀█░█▀▄      ║
        ║    ░█░█░█▀▀░▀▄▀░█░█░█▀▄░█░█░█░█░█░█░█░█      ║
        ║    ░▀▀░░▀▀▀░░▀░░▀▀▀░▀░▀░▀▀▀░▀▀▀░▀░▀░▀▀░      ║
        ║                                               ║
        ║   estandares de desarrollo como paquetes npm  ║
        ║                                               ║
        ╚═══════════════════════════════════════════════╝
```

<p>
  <a href="https://www.npmjs.com/package/@devground/devground"><img src="https://img.shields.io/npm/v/@devground/devground?style=for-the-badge&logo=npm&color=CB3837&label=npm" alt="npm version" /></a>
  <a href="https://github.com/elkisdm/devground"><img src="https://img.shields.io/github/stars/elkisdm/devground?style=for-the-badge&logo=github&color=181717&label=stars" alt="GitHub stars" /></a>
  <img src="https://img.shields.io/badge/license-MIT-44CC11?style=for-the-badge" alt="MIT License" />
  <img src="https://img.shields.io/badge/PRs-welcome-FF69B4?style=for-the-badge" alt="PRs welcome" />
</p>

<p>
  <img src="https://img.shields.io/badge/pnpm-workspace-F69220?logo=pnpm&logoColor=white" alt="pnpm workspace" />
  <img src="https://img.shields.io/badge/ESLint-v9%20Flat%20Config-4B32C3?logo=eslint&logoColor=white" alt="ESLint v9" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white" alt="TypeScript strict" />
  <img src="https://img.shields.io/badge/Changesets-versioning-26A69A" alt="Changesets" />
  <img src="https://img.shields.io/badge/Node-%E2%89%A520-339933?logo=node.js&logoColor=white" alt="Node 20+" />
</p>

<h3>
  <a href="#-inicio-rapido">Inicio rapido</a>
  <span>&nbsp;·&nbsp;</span>
  <a href="#-paquetes">Paquetes</a>
  <span>&nbsp;·&nbsp;</span>
  <a href="#-uso-de-cada-paquete">Documentacion</a>
  <span>&nbsp;·&nbsp;</span>
  <a href="#-faq">FAQ</a>
  <span>&nbsp;·&nbsp;</span>
  <a href="#-roadmap">Roadmap</a>
</h3>

</div>

---

<table align="center">
<tr>
<td align="center">

**TDD**

ciclo Red → Green → Refactor

</td>
<td align="center">

**Lint + Format**

ESLint 9 + Prettier

</td>
<td align="center">

**Commits**

conventional + hooks

</td>
<td align="center">

**AI Ready**

AGENTS.md multi-agente

</td>
<td align="center">

**Arquitectura**

11 ADRs + knowledge base

</td>
</tr>
</table>

---

# devground

> **9 paquetes npm. Un solo comando.**
> Configura TDD, linting, formateo, commits convencionales, git hooks, reglas para agentes de IA y una knowledge base de arquitectura — en cualquier proyecto Node/TypeScript/Next.js.

```bash
# Instalacion rapida — todo en dos comandos
pnpm add -D @devground/devground eslint prettier typescript husky lint-staged @commitlint/cli
npx devground-setup
```

```bash
# O con el CLI interactivo (detecta tu stack)
npx devground-init
```

<details>
<summary><b>Ver lo que pasa en 30 segundos</b></summary>

```diff
+ eslint.config.mjs              ← ESLint 9 flat config (detecta Next.js)
+ tsconfig.json                  ← preset strict para tu stack
+ tsconfig.typecheck.json        ← preset CI
+ commitlint.config.js           ← conventional commits
+ .husky/pre-commit              ← lint-staged en cada commit
+ AGENTS.md                      ← reglas para IA (source of truth)
+ CLAUDE.md → AGENTS.md          ← symlink (Claude Code)
+ .cursorrules → AGENTS.md       ← symlink (Cursor)
+ .github/copilot-instructions.md → AGENTS.md
+ .gemini/styleguide.md → AGENTS.md
+ knowledge/                     ← guias + 11 ADRs de arquitectura
~ package.json                   ← prettier, lint-staged, prepare script
```

**No sobreescribe nada existente.** Si ya tienes `tsconfig.json`, lo respeta.

</details>

---

## Tabla de contenidos

<table>
<tr>
<td valign="top" width="33%">

**Empezar**

- [El problema](#-el-problema)
- [Inicio rapido](#-inicio-rapido)
- [Glosario express](#-glosario-express-para-todo-el-equipo)
- [Paquetes](#-paquetes)

</td>
<td valign="top" width="33%">

**Uso**

- [Uso de cada paquete](#-uso-de-cada-paquete)
- [Reglas incluidas](#-reglas-de-desarrollo-incluidas)
- [CLI `devground-init`](#-devground-init-cli)
- [Conceptos de arquitectura](#-conceptos-clave-de-arquitectura-para-todo-el-equipo)

</td>
<td valign="top" width="33%">

**Proyecto**

- [Arquitectura del monorepo](#-arquitectura-del-monorepo)
- [Desarrollo](#-desarrollo)
- [CI/CD](#-cicd)
- [FAQ](#-faq)
- [Cuando NO usar devground](#-cuando-no-usar-devground)
- [Como contribuir](#-como-contribuir)
- [Roadmap](#-roadmap)
- [Filosofia](#-filosofia)

</td>
</tr>
</table>

---

## <a name="-glosario-express-para-todo-el-equipo"></a>📖 Glosario express (para todo el equipo)

Si lees este README y no sos developer, esta tabla te da el "para que sirve cada cosa" en una linea. Sin jerga.

| Herramienta | Que hace | Analogia |
|-------------|----------|----------|
| **ESLint** | Detecta errores y malas practicas en el codigo | El **ortografo** del codigo: te marca lo mal escrito |
| **Prettier** | Da formato consistente al codigo (espacios, comillas, saltos de linea) | El **planchador**: deja todo prolijo y parejo |
| **TypeScript** | Agrega "tipos" al codigo para evitar errores antes de ejecutarlo | Las **etiquetas** en los productos: si esperas un numero y llega texto, avisa antes |
| **Commitlint** | Valida que los mensajes de commit sigan un formato estandar | El **portero del banco**: si no vienes con la documentacion bien, no entras |
| **Lint-staged** | Aplica linters solo a los archivos que vas a guardar | El **filtro de aduana**: revisa solo lo que pasa, no toda la valija |
| **Husky** | Ejecuta scripts automaticamente al hacer commit o push | El **timer del horno**: dispara acciones en el momento exacto |
| **Changesets** | Maneja versiones y changelogs de paquetes automaticamente | El **registro civil**: lleva el acta de cada cambio publicado |
| **pnpm** | Gestor de paquetes (instala las dependencias) | El **almacenero**: trae lo que necesitas, pero ocupando menos espacio que sus competidores |
| **AGENTS.md** | Archivo con reglas que leen los agentes de IA (Claude, Cursor, Copilot) | El **manual de la casa**: para que cada visita sepa como te gustan las cosas |
| **ADR** | Documento corto que explica por que se tomo una decision tecnica | El **acta de reunion**: deja registro de **por que** se decidio algo |

---

## <a name="-el-problema"></a>🎯 El problema

Cada nuevo proyecto empieza con la misma fricción: configurar ESLint, Prettier, TypeScript, git hooks, commit conventions... y después documentar las reglas de desarrollo para que todo el equipo (humanos y agentes de IA) las siga.

```
   ANTES (cada proyecto, semana 1)        DESPUES (con devground)
   ────────────────────────────────       ─────────────────────────
   ⏳ configurar ESLint     ~2h           ✓ npx devground-init
   ⏳ configurar Prettier   ~30min        ✓ ~ 60 segundos
   ⏳ configurar TS strict  ~1h           ✓ todo listo
   ⏳ husky + lint-staged   ~1h
   ⏳ commitlint            ~30min        9 estandares activos.
   ⏳ AGENTS.md a mano      ~2h           0 decisiones repetidas.
   ⏳ ADR template          ~1h
   ─────────────────────────
   ⌚ ~ 8h de fricción
```

**devground** resuelve esto empaquetando todo en paquetes npm reutilizables. Instala uno, instala todos, o deja que el CLI lo haga por ti.

---

## <a name="-inicio-rapido"></a>🚀 Inicio rapido

### Opcion 1: Instalacion rapida (recomendado)

Un solo paquete que trae todo. Dos comandos y listo.

```bash
pnpm add -D @devground/devground eslint prettier typescript husky lint-staged @commitlint/cli
npx devground-setup
```

El setup detecta tu stack, escribe las configs, configura git hooks y genera AGENTS.md con symlinks. **No sobreescribe archivos existentes.**

### Opcion 2: CLI interactivo

```bash
npx devground-init
```

El CLI detecta tu stack automaticamente (Next.js, React, Node.js), tu gestor de paquetes (pnpm, yarn, npm), y te permite elegir que instalar:

```
  devground v1.0.0

  Detectando stack...
  ✓ Detectado: Next.js 16, TypeScript, pnpm

  ¿Que quieres instalar?
  ◉ Prettier config
  ◉ ESLint config
  ◉ TypeScript configs
  ◉ Commitlint config
  ◉ Lint-staged config
  ◉ Husky pre-commit hooks
  ◉ AGENTS.md + symlinks
  ◉ Architecture Guide (knowledge base + ADRs)

  Instalando...
  ✓ @devground/prettier-config
  ✓ @devground/eslint-config (Next.js)
  ✓ @devground/tsconfig (next + typecheck)
  ✓ @devground/commitlint-config
  ✓ @devground/lint-staged-config
  ✓ Husky configurado con pre-commit hook
  ✓ AGENTS.md + symlinks para Claude, Cursor, Copilot, Gemini
  ✓ knowledge/ + docs/adr/ con plantillas

  ✓ Listo. 8 estandares de desarrollo activos.
```

### Opcion 3: Todo sin preguntas

```bash
npx devground-init --yes
```

### Opcion 4: Solo reglas para agentes de IA

```bash
npx devground-init --preset agents-only
```

---

## <a name="-paquetes"></a>📦 Paquetes

El monorepo contiene **9 paquetes** independientes. Cada uno se puede instalar por separado o todos juntos via el CLI.

| | Paquete | Version | Descripcion |
|---|---------|---------|-------------|
| 🎁 | [`@devground/devground`](#devgrounddevground) | `1.0.0` | **Todo en uno** — instala y configura todos los paquetes |
| 💅 | [`@devground/prettier-config`](#devgroundprettier-config) | `1.0.0` | Configuracion compartida de Prettier |
| 🔍 | [`@devground/eslint-config`](#devgroundeslint-config) | `1.0.0` | ESLint Flat Config v9 (base + Next.js) |
| 🧬 | [`@devground/tsconfig`](#devgroundtsconfig) | `1.0.0` | Presets de TypeScript (base, next, CI, node) |
| ✍️ | [`@devground/commitlint-config`](#devgroundcommitlint-config) | `1.0.0` | Commits convencionales con commitlint |
| 🧹 | [`@devground/lint-staged-config`](#devgroundlint-staged-config) | `1.0.0` | Reglas de linting para archivos staged |
| 🪝 | [`@devground/husky-config`](#devgroundhusky-config) | `1.0.0` | Setup de git hooks con Husky |
| 🤖 | [`@devground/agents-md`](#devgroundagents-md) | `1.0.0` | AGENTS.md + symlinks multi-agente |
| 🏛️ | [`@devground/architecture-guide`](#devgroundarchitecture-guide) | `1.0.0` | **Knowledge base** de arquitectura + ADRs (BD, patrones, sistemas) |
| ⚡ | [`devground-init`](#devground-init-cli) | `1.0.0` | CLI para scaffolding completo |

---

## <a name="-uso-de-cada-paquete"></a>🛠️ Uso de cada paquete

### `@devground/devground`

El meta-paquete que trae todo. Ideal para proyectos nuevos o cuando quieres adoptar todos los estandares de una vez.

```bash
pnpm add -D @devground/devground eslint prettier typescript husky lint-staged @commitlint/cli
npx devground-setup
```

**Que configura automaticamente:**

| Herramienta | Accion |
|-------------|--------|
| Prettier | Activa `@devground/prettier-config` en package.json |
| ESLint | Escribe `eslint.config.mjs` (detecta Next.js) |
| TypeScript | Escribe `tsconfig.json` + `tsconfig.typecheck.json` (Next.js) |
| Commitlint | Escribe `commitlint.config.js` |
| Lint-staged | Activa `@devground/lint-staged-config` en package.json |
| Husky | Inicializa + escribe `.husky/pre-commit` |
| AGENTS.md | Copia template + symlinks a CLAUDE.md, .cursorrules, copilot, gemini |

**No sobreescribe archivos existentes.** Si ya tienes un `tsconfig.json` o `eslint.config.mjs`, los respeta.

---

### `@devground/prettier-config`

Configuracion de formateo consistente.

```bash
pnpm add -D @devground/prettier-config prettier
```

En tu `package.json`:

```json
{
  "prettier": "@devground/prettier-config"
}
```

**Reglas incluidas:**

| Regla | Valor |
|-------|-------|
| Semicolons | `true` |
| Single quotes | `true` |
| Trailing commas | `es5` |
| Print width | `100` |
| Tab width | `2` |

---

### `@devground/eslint-config`

ESLint Flat Config (v9+) con dos presets: **base** (framework-agnostic) y **Next.js**.

```bash
# Next.js
pnpm add -D @devground/eslint-config eslint eslint-config-next

# Base (sin framework)
pnpm add -D @devground/eslint-config eslint
```

**Next.js** — `eslint.config.mjs`:

```js
import nextConfig from '@devground/eslint-config/next';

export default nextConfig();
```

**Base** — `eslint.config.mjs`:

```js
import baseConfig from '@devground/eslint-config';

export default baseConfig();
```

**Con ignores personalizados:**

```js
import nextConfig from '@devground/eslint-config/next';

export default nextConfig({
  ignores: ['.next/**', 'node_modules/**', 'custom-dir/**'],
});
```

---

### `@devground/tsconfig`

Cuatro presets de TypeScript para diferentes contextos:

```bash
pnpm add -D @devground/tsconfig typescript
```

| Preset | Uso | `strict` | `incremental` |
|--------|-----|----------|---------------|
| `base.json` | Proyectos generales | `true` | `true` |
| `next.json` | Next.js (dev) | `false` | `true` |
| `next-typecheck.json` | Next.js (CI) | hereda | `false` |
| `node.json` | Servidores Node.js | `true` | `true` |

**Ejemplo** — `tsconfig.json`:

```json
{
  "extends": "@devground/tsconfig/next.json",
  "compilerOptions": {
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

**Para CI** — `tsconfig.typecheck.json`:

```json
{
  "extends": "@devground/tsconfig/next-typecheck.json",
  "include": ["app/**/*.ts", "lib/**/*.ts", "components/**/*.ts"]
}
```

---

### `@devground/commitlint-config`

Enforce de commits convencionales via [commitlint](https://commitlint.js.org/).

```bash
pnpm add -D @devground/commitlint-config @commitlint/cli
```

`commitlint.config.js`:

```js
module.exports = { extends: ['@devground/commitlint-config'] };
```

**Tipos permitidos:**

| Tipo | Descripcion |
|------|-------------|
| `feat:` | Nueva feature |
| `fix:` | Bug fix |
| `test:` | Tests nuevos o cambios en tests |
| `docs:` | Documentacion |
| `refactor:` | Cambios sin alterar comportamiento |
| `chore:` | Tareas sin impacto en codigo (deps, config) |
| `style:` | Formateo, whitespace |
| `perf:` | Mejoras de rendimiento |
| `ci:` | Cambios en CI/CD |
| `revert:` | Revertir un commit previo |

**Reglas:**
- Tipo obligatorio, en minusculas
- Subject obligatorio, sin punto final
- Header maximo 100 caracteres

---

### `@devground/lint-staged-config`

Reglas de linting que se ejecutan en pre-commit sobre archivos staged.

```bash
pnpm add -D @devground/lint-staged-config lint-staged eslint prettier
```

En tu `package.json`:

```json
{
  "lint-staged": "@devground/lint-staged-config"
}
```

**Reglas:**

| Patron | Acciones |
|--------|----------|
| `*.{ts,tsx}` | `eslint --fix` + `prettier --write` |
| `*.{json,md,css}` | `prettier --write` |

---

### `@devground/husky-config`

Configura git hooks con [Husky](https://typicode.github.io/husky/). Instala un pre-commit hook que ejecuta lint-staged.

```bash
pnpm add -D @devground/husky-config husky lint-staged
npx devground-husky
```

**Que hace:**
1. Inicializa Husky (`npx husky init`)
2. Escribe `.husky/pre-commit` con `pnpm exec lint-staged`
3. Agrega `"prepare": "husky"` a tu `package.json`

---

### `@devground/agents-md`

El paquete estrella. Genera un archivo `AGENTS.md` con **10 reglas de desarrollo** y crea symlinks para que **todos los agentes de IA** lean las mismas reglas.

```bash
npx @devground/agents-md
```

**Que genera:**

```
proyecto/
├── AGENTS.md                              ← source of truth
├── CLAUDE.md → AGENTS.md                  ← Claude Code
├── .cursorrules → AGENTS.md               ← Cursor
├── .github/
│   └── copilot-instructions.md → AGENTS.md  ← GitHub Copilot
└── .gemini/
    └── styleguide.md → AGENTS.md          ← Gemini CLI
```

**Un archivo, todos los agentes.** Cuando editas `AGENTS.md`, Claude, Cursor, Copilot y Gemini ven los cambios automaticamente via symlinks.

**Prompt universal:** El paquete tambien incluye `PROMPT.md` — un prompt optimizado para copiar y pegar como **system prompt** o **custom instructions** en cualquier agente de IA (ChatGPT, Claude web, Gemini, etc.). Util cuando trabajas con agentes que no leen archivos del proyecto.

```bash
cat node_modules/@devground/agents-md/PROMPT.md
```

**Compatibilidad Windows:** En sistemas sin soporte de symlinks, el setup copia el archivo en lugar de linkear.

---

### `@devground/architecture-guide`

> Una **biblioteca de decisiones tecnicas** que se instala en tu proyecto con un comando.

Antes de empezar a programar, hay decisiones que marcan los proximos años del proyecto: ¿que base de datos uso?, ¿monolito o microservicios?, ¿cuando agrego cache?, ¿como escalo cuando llegan 10x usuarios? Equivocarse aqui cuesta meses de refactor.

Este paquete trae **una guia escrita, organizada y con plantillas** para responder esas preguntas con criterio — no improvisando.

```bash
pnpm add -D @devground/architecture-guide
npx devground-architecture
```

**Que copia en tu proyecto:**

```
tu-proyecto/
└── knowledge/
    ├── README.md                        ← indice general
    ├── 01-database-architecture.md      ← guia de bases de datos
    ├── 02-architectural-patterns.md     ← monolito, microservicios, hexagonal, CQRS
    ├── 03-systems-design.md             ← cache, queues, replicas, circuit breakers
    ├── BEST-PRACTICES.md                ← checklist de 6 pasos para arrancar
    ├── CASE-STUDY-devground.md          ← caso real aplicado
    └── adr/
        ├── 0001-elegir-tipo-de-base-de-datos.md
        ├── 0002-normalizar-vs-denormalizar.md
        ├── 0003-cuando-usar-indices.md
        ├── 0004-monolito-vs-microservicios.md
        ├── 0005-cuando-aplicar-clean-hexagonal.md
        ├── 0006-cuando-aplicar-cqrs.md
        ├── 0007-serverless-vs-servidor-dedicado.md
        ├── 0008-estrategia-de-cache.md
        ├── 0009-read-replicas-vs-cache.md
        ├── 0010-queues-y-workers-para-escrituras.md
        └── 0011-timeouts-y-circuit-breakers.md
```

**Que es un ADR:** un **Architecture Decision Record** es un documento corto que captura **por que** se tomo una decision tecnica (no solo *que* se decidio). Cuando alguien nuevo entra al equipo seis meses despues y pregunta "¿por que usamos Postgres y no Mongo?", el ADR responde con contexto, alternativas evaluadas y consecuencias asumidas. Es memoria del equipo.

**Crear un nuevo ADR:**

```bash
npx devground-adr new "Use Postgres for transactional data"
# → Crea docs/adr/0001-use-postgres-for-transactional-data.md
```

El comando detecta el siguiente numero disponible, slugifica el titulo y crea el archivo con el template de [Michael Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) pre-poblado (Context → Decision → Consequences → Alternatives).

**Filosofia del paquete:**

> "No existe arquitectura, BD ni patron mejor en abstracto — solo decisiones contextuales."

La guia no te dice **que** hacer. Te da el **marco** para decidir con criterio y dejar registro.

---

## <a name="-conceptos-clave-de-arquitectura-para-todo-el-equipo"></a>🏛️ Conceptos clave de arquitectura (para todo el equipo)

Esta seccion explica en lenguaje simple los conceptos que cubre `@devground/architecture-guide`. Util si trabajas con desarrolladores, lideras producto, o simplemente quieres entender de que habla el equipo tecnico.

### Que es una base de datos

Es un programa especializado en **guardar y consultar informacion a gran escala**. Hay distintos tipos porque distintos problemas necesitan distintas garantias.

```
   APP  ───┐
           │  "dame el usuario 42"
           ▼
   ┌───────────────────┐
   │   BASE DE DATOS   │   ◄── guarda, ordena, indexa, responde
   └───────────────────┘
           │
           ▼  usuario 42 → { nombre, email, ... }
```

### Tipos de base de datos

| Tipo | Ejemplo | Para que sirve | Analogia |
|------|---------|----------------|----------|
| **Relacional (SQL)** | PostgreSQL, MySQL | Datos con reglas estrictas: pagos, ordenes, contabilidad | Una **planilla Excel** gigante con columnas fijas y reglas |
| **Documental (NoSQL)** | MongoDB | Datos flexibles que aun no sabes como van a evolucionar | Una **carpeta de fichas** donde cada ficha puede tener campos distintos |
| **Clave-Valor** | Redis, DynamoDB | Velocidad extrema: cache, sesiones, leaderboards | Un **diccionario** gigante: pides una palabra, te dan la definicion al instante |
| **Grafos** | Neo4j | Relaciones complejas: redes sociales, recomendaciones | Un **mapa de amistades** que sabe encontrar caminos entre personas |
| **Columnar / Time-series** | Cassandra, ClickHouse | Millones de eventos: metricas, telemetria, logs | Un **libro de bitacora** infinito optimizado para escribir y resumir |

> **Aclaracion clave:** "SQL" es solo el **lenguaje** para preguntar. No define el tipo. DynamoDB acepta SQL y NO es relacional. El **modelo de datos** es lo que importa, no la sintaxis.

### ¿Por que no uso una sola BD para todo?

Las empresas reales **combinan varias**. Cada problema con la herramienta correcta.

```
   Netflix
   ├── MySQL          → metadatos rigidos (catalogo, suscripciones)
   └── Cassandra      → actividad masiva (que viste, cuando, por cuanto tiempo)

   Uber
   ├── PostgreSQL     → relaciones criticas (pagos, viajes)
   └── Redis          → tiempo real (ubicacion del conductor, cache)
```

### Indices: el truco para que las consultas sean rapidas

Sin indice, la base de datos lee **fila por fila** hasta encontrar lo que pides. Con 1 millon de usuarios, eso es lentisimo.

Un indice funciona como el **indice de un libro**: en vez de leer todas las paginas, vas al final, buscas el tema, te dice "pagina 247". Saltas directo.

```
   SIN INDICE                        CON INDICE
   ──────────                        ──────────
   pagina 1   ¿es?                   indice
   pagina 2   ¿es?                   ─────────
   pagina 3   ¿es?                   "Juan"  → fila 47.213
   ...                               "Maria" → fila 89.001
   pagina 247 ¡SI!                   "Pedro" → fila 12.998
   (247 lecturas)                    (1 lectura, vas directo)
```

**Trampa:** los indices **aceleran lecturas** pero **ralentizan escrituras** (cada vez que insertas datos, hay que actualizar el indice tambien). Por eso no se indexa todo: se indexa lo que se consulta seguido.

### Normalizacion: evitar repetir datos

Si en cada pedido guardas el email del cliente, y el cliente cambia el email, tienes que actualizarlo en **miles de pedidos**. Riesgo enorme de inconsistencia.

**Normalizar** = separar la informacion en tablas relacionadas. El cliente vive en **una sola tabla**. Los pedidos solo guardan una **referencia** al cliente.

```
   SIN NORMALIZAR (mal)                  NORMALIZADO (bien)
   ───────────────────                  ──────────────────
   Pedido 1: Ana — ana@x.com            Clientes               Pedidos
   Pedido 2: Ana — ana@x.com            ────────               ───────
   Pedido 3: Ana — ana@x.com            id=7  Ana, ana@x.com   id=1  cliente=7
   Pedido 4: Ana — ana@x.com                                   id=2  cliente=7
                                                               id=3  cliente=7
   (si Ana cambia email,                (si Ana cambia email,
    actualizas 4 lugares)                actualizas 1 lugar)
```

> En bases NoSQL a veces se hace lo opuesto (**desnormalizar**): se duplica info a proposito para que las lecturas sean rapidas. Cada modelo tiene su filosofia.

### Sharding: partir la base de datos en pedazos

Cuando una sola maquina no aguanta, **partimos los datos por reglas**: ej. usuarios de America en un servidor, usuarios de Europa en otro, etc.

```
   ANTES (1 servidor saturado)         DESPUES (sharding)
   ──────────────────────              ──────────────────
                                       ┌──────────────┐
   ┌──────────────┐                    │ Servidor A   │ usuarios A-H
   │  Servidor    │ ◄── todos          ├──────────────┤
   │  saturado    │                    │ Servidor B   │ usuarios I-P
   └──────────────┘                    ├──────────────┤
                                       │ Servidor C   │ usuarios Q-Z
                                       └──────────────┘
```

La **shard key** (la regla por la que partes los datos) hay que elegirla bien **desde el inicio** — cambiarla despues es carisimo.

### Teorema CAP: no podes tener todo a la vez

En sistemas distribuidos solo puedes garantizar **dos** de tres:

- **C** Consistencia — todos los nodos ven el mismo dato a la vez
- **A** Disponibilidad — el sistema siempre responde
- **P** Tolerancia a particiones — sobrevive a fallos de red

> Es como "bueno, bonito y barato": elige dos.

```
                   CONSISTENCIA
                       /\
                      /  \
                     /    \
                    /      \
                   /  CAP   \
                  /          \
                 /            \
                /              \
   DISPONIBILIDAD ──────────── PARTICIONES
```

### Patrones de arquitectura: como organizas el codigo

| Patron | Cuando aplica | Analogia |
|--------|---------------|----------|
| **Monolito modular** | Equipo chico, producto en validacion | Una **casa grande** con habitaciones separadas pero un solo techo |
| **Microservicios** | Equipos grandes, dominios independientes a escala | Un **barrio**: cada casa funciona sola, conectadas por calles (red) |
| **Arquitectura hexagonal / Clean** | Logica de negocio compleja que debe sobrevivir cambios de framework | Una **central electrica**: el corazon no depende de que enchufe uses |
| **CQRS** | Lecturas y escrituras tienen necesidades muy distintas | **Dos ventanillas** en un banco: una para depositar, otra para consultar — optimizadas distinto |
| **Serverless** | Trafico variable, prototipos, eventos esporadicos | **Taxi a demanda**: pagas cuando lo usas, no tienes que mantener el auto |

> **Regla de oro del proyecto:** empezar con **monolito modular**. Sumar complejidad **solo cuando el dolor sea real**, no por moda. Esto esta documentado en `knowledge/adr/0004-monolito-vs-microservicios.md`.

### Diseño de sistemas: como escalas cuando crece

| Concepto | Que resuelve | Analogia |
|----------|--------------|----------|
| **Cache** | Lecturas repetidas a la misma info | Memoria de corto plazo: no vuelves a abrir la nevera para el mismo huevo |
| **Read replicas** | Muchas lecturas saturan la BD principal | **Fotocopias** del libro original para que muchos lectores no peleen |
| **Queues + Workers** | Picos de escritura que la BD no aguanta | **Cola del banco**: en vez de atender todos a la vez, se procesa de a uno con orden |
| **Circuit breaker** | Un servicio externo caido tumba todo el sistema | **Interruptor automatico**: si hay sobrecarga, corta antes de que se queme la casa |
| **Timeouts** | Esperar indefinidamente a un servicio lento | **Limite de paciencia**: si no responde en X segundos, cortas y sigues |

> Estos patrones estan en `knowledge/03-systems-design.md` con ejemplos y trade-offs concretos.

---

## <a name="-reglas-de-desarrollo-incluidas"></a>📋 Reglas de desarrollo incluidas

El `AGENTS.md` contiene **10 reglas** de desarrollo probadas en produccion:

<table>
<tr>
<td>1️⃣ TDD estricto</td>
<td>2️⃣ Commits atomicos</td>
<td>3️⃣ Doc continua</td>
<td>4️⃣ Piramide testing</td>
<td>5️⃣ Zero dead code</td>
</tr>
<tr>
<td>6️⃣ Error handling</td>
<td>7️⃣ ADRs</td>
<td>8️⃣ READMEs</td>
<td>9️⃣ Tokens semanticos</td>
<td>🔟 Helper <code>cn()</code></td>
</tr>
</table>


### 1. TDD estricto
Ciclo obligatorio: **Red** (test que falla) → **Green** (implementacion minima) → **Refactor**. Ninguna feature se considera completa sin tests.

### 2. Commits convencionales + atomicos
Prefijos estandar (`feat:`, `fix:`, `test:`, etc.). Cada commit = una idea completa. Facilita reviews, `git bisect` y rollbacks.

### 3. Documentacion continua
Documentar siempre: comentarios en codigo, JSDoc en funciones publicas, mensajes de commit descriptivos, docs/ para features complejas.

### 4. Piramide de testing
Muchos unit tests rapidos en la base, pocos E2E lentos en la punta. Mantener el equilibrio.

### 5. Zero dead code
Borrar, nunca comentar. Confiar en `git log` para recuperar. Sin archivos, funciones, variables o imports sin usar.

### 6. Error handling consistente
Try-catch en API routes, errores descriptivos en servicios, nunca silenciar errores sin documentar por que.

### 7. ADR (Architecture Decision Records)
Documentar el **por que** de cada decision arquitectonica en `docs/ADR/`. Context → Decision → Consequences → Alternatives.

### 8. READMEs en directorios complejos
`README.md` en carpetas con logica no obvia para facilitar onboarding.

### 9. Tokens semanticos en UI
Nunca hardcodear colores. Usar tokens como `bg-card`, `text-foreground`, `border-border`. Siempre dark mode compatible.

### 10. Helper `cn()` obligatorio
Usar `cn()` (clsx + tailwind-merge) para combinar clases CSS. Sin concatenacion fragil de strings.

---

## <a name="-devground-init-cli"></a>⚡ devground-init (CLI)

El CLI que orquesta todo.

```bash
npx devground-init [opciones]
```

| Opcion | Descripcion |
|--------|-------------|
| `--preset full` | Instalar todo sin preguntas |
| `--preset agents-only` | Solo AGENTS.md + symlinks |
| `-y, --yes` | Skip prompts, instalar todo |
| `-V, --version` | Mostrar version |
| `-h, --help` | Mostrar ayuda |

**Deteccion automatica de stack:**

| Detecta | Como |
|---------|------|
| Framework | `next` en deps → Next.js, `react` sin `next` → React, otro → Node.js |
| TypeScript | `typescript` en devDependencies |
| Package manager | `pnpm-lock.yaml` / `yarn.lock` / `package-lock.json` |

La deteccion determina que preset de ESLint y TSConfig usar automaticamente.

---

## <a name="-arquitectura-del-monorepo"></a>🏗️ Arquitectura del monorepo

```
devground/
├── .changeset/             # Versionado independiente por paquete
├── .github/workflows/      # CI (PRs) + Release automatico (merge a main)
├── knowledge/              # Knowledge base de arquitectura (fuente)
│   └── adr/                # 11 ADRs derivados
├── docs/adr/               # ADRs propios del proyecto devground
├── packages/
│   ├── prettier-config/      # JSON puro, sin build
│   ├── eslint-config/        # ESM (.mjs), sin build
│   ├── tsconfig/             # JSON puro, sin build
│   ├── commitlint-config/    # CJS, sin build
│   ├── lint-staged-config/   # CJS, sin build
│   ├── husky-config/         # Script Node.js, sin build
│   ├── agents-md/            # Markdown + script, sin build
│   ├── architecture-guide/   # Knowledge base + ADR generator, sin build
│   └── cli/                  # TypeScript → tsc → dist/
├── package.json            # pnpm workspaces
└── pnpm-workspace.yaml
```

**Solo el CLI necesita build** (`tsc`). El resto son archivos estaticos listos para publicar.

---

## <a name="-desarrollo"></a>💻 Desarrollo

### Requisitos

- Node.js >= 20
- pnpm >= 10

### Setup

```bash
git clone https://github.com/elkisdm/devground.git
cd devground
pnpm install
pnpm build
```

### Comandos

```bash
pnpm build              # Compilar el CLI
pnpm test               # Ejecutar tests del CLI
pnpm changeset          # Crear un changeset para nueva version
pnpm publish-packages   # Publicar paquetes (usado por CI)
```

### Versionado

Usamos [Changesets](https://github.com/changesets/changesets) para versionado independiente por paquete:

1. Hacer cambios en un paquete
2. `pnpm changeset` → seleccionar paquete(s) afectado(s) + tipo de bump (patch/minor/major)
3. Commit + push
4. GitHub Actions crea un PR "Version Packages"
5. Al mergear ese PR, se publican automaticamente en npm

---

## <a name="-cicd"></a>🚦 CI/CD

| Workflow | Trigger | Que hace |
|----------|---------|----------|
| **CI** | Pull Request a `main` | Install → Build → Test |
| **Release** | Push a `main` | Install → Build → Changesets publish |

El `NPM_TOKEN` se configura como secret en GitHub (Settings → Secrets → Actions).

---

## <a name="-faq"></a>❓ FAQ

### ¿Sobreescribe mis archivos de configuracion existentes?

**No.** El setup detecta archivos existentes (`tsconfig.json`, `eslint.config.mjs`, `.prettierrc`, etc.) y los respeta. Si ya tienes una config, devground la deja intacta y solo agrega lo que falta.

### ¿Funciona en monorepos?

**Si**, especialmente bien con **pnpm workspaces** y **Turborepo**. Cada paquete puede consumir las configs de devground de forma independiente o compartirlas en el root.

### ¿Funciona en proyectos legacy?

**Si, con criterio.** Si tu proyecto ya tiene convenciones consolidadas hace años, devground puede generar mas fricción que valor. Recomendado: instalar **solo el `agents-md`** primero (para los agentes de IA), y evaluar el resto despues.

### ¿Por que pnpm y no npm o yarn?

devground **funciona con los tres**. Internamente el monorepo usa pnpm por velocidad y eficiencia de disco (un solo store compartido), pero las dependencias publicadas son compatibles con cualquier gestor. El CLI detecta tu `lock` file y usa el gestor que ya tengas.

### ¿Como personalizo una regla de ESLint sin perder los presets?

ESLint Flat Config (v9) permite **extender y sobreescribir**:

```js
import nextConfig from '@devground/eslint-config/next';

export default [
  ...nextConfig(),
  {
    rules: {
      'no-console': 'off',           // tu override
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
```

### ¿Puedo usar solo ESLint y nada mas?

Si. Cada paquete es **independiente**. Instalas el que quieras y nada mas:

```bash
pnpm add -D @devground/eslint-config eslint eslint-config-next
```

### ¿Como desinstalo devground?

```bash
pnpm remove @devground/devground @devground/eslint-config @devground/tsconfig ...
```

Los archivos generados (`eslint.config.mjs`, `tsconfig.json`, `AGENTS.md`, etc.) **quedan en tu repo** porque son tuyos. Editalos o borralos a mano segun necesites.

### ¿Por que no genera un solo archivo `.devgroundrc`?

Filosofia: cada herramienta usa **su archivo nativo**. ESLint usa `eslint.config.mjs`, Prettier usa `package.json`, TypeScript usa `tsconfig.json`. Asi tu proyecto sigue siendo **portable** — si mañana sacas devground, las herramientas siguen funcionando.

### ¿El paquete `architecture-guide` instala codigo?

**No.** Solo copia documentacion (`knowledge/` con guias y ADRs). No agrega dependencias de runtime ni modifica tu codigo. Es **conocimiento como artefacto versionado**.

### ¿devground reemplaza a Biome / xo / neostandard?

**No compite con ellos.** devground es una **capa de orquestacion**: une ESLint + Prettier + TS + commitlint + hooks + ADRs en una sola decision. Si prefieres Biome, podes reemplazar el modulo de ESLint/Prettier y mantener el resto.

---

## <a name="-cuando-no-usar-devground"></a>🚫 ¿Cuando NO usar devground?

Ser honesto sobre el alcance importa. **devground no es para todos los casos.**

| Situacion | Por que no |
|-----------|------------|
| **Proyecto con 2+ años y convenciones consolidadas** | Instalarlo genera ruido y choques con tu config. Mejor adoptar **solo `agents-md`** si te interesa la parte de IA |
| **Stack muy especifico no cubierto** (Deno, Bun-only, Rust, Go) | Los presets estan pensados para Node/TypeScript/Next.js. Otros stacks tienen sus propios estandares |
| **Equipo que ya usa Biome / xo como linter unico** | Hay solape directo. Elige uno |
| **Proyecto puramente de configuracion / scripts cortos** | Si tu repo son 3 scripts de bash, ESLint + Husky + commitlint es overkill |
| **No quieres opiniones impuestas** | devground es **opinado a proposito**. Si necesitas neutralidad total, no es el toolkit indicado |

**Caso donde si vale la pena:**
- Empezas un proyecto nuevo Node/TS/React/Next.
- Equipo de 2+ personas que necesita convenciones compartidas.
- Trabajas con agentes de IA y querias un `AGENTS.md` ya armado.
- Querias documentar decisiones tecnicas (ADRs) pero nunca arrancaste.

---

## <a name="-como-contribuir"></a>🤝 Como contribuir

Las contribuciones son bienvenidas. Antes de abrir un PR:

### 1. Abre un issue primero (para cambios no triviales)

Antes de invertir tiempo en una feature grande, abre un issue describiendo:
- **Problema** que resuelve
- **Propuesta** de solucion
- **Alternativas** consideradas

Esto evita PRs que no encajan con la filosofia del proyecto.

### 2. Setup local

```bash
git clone https://github.com/elkisdm/devground.git
cd devground
pnpm install
pnpm build
pnpm test
```

### 3. Convenciones obligatorias

- **Commits convencionales** (`feat:`, `fix:`, `docs:`, etc.) — el repo dogfooding su propio `commitlint-config`.
- **Tests** para todo cambio en el CLI (no se aceptan PRs sin tests).
- **Changeset** por cada cambio publicable: `pnpm changeset` y describi el cambio + bump.

### 4. Tipos de contribucion bienvenidas

| Tipo | Que esperamos |
|------|----------------|
| **Bug fix** | Test que reproduce el bug + fix. PR vinculado a issue. |
| **Nuevo paquete** | Issue previo aceptado + paquete con README + tests + changeset |
| **Mejora de doc** | Si es solo README o docs, PR directo sin issue esta OK |
| **Nuevo ADR template** | Sigue el formato de los existentes en `packages/architecture-guide/knowledge/adr/` |
| **Traduccion** | Bienvenidas, pero coordinamos por issue antes para no duplicar esfuerzos |

### 5. Codigo de conducta

Discusiones tecnicas, no personales. Critica al codigo, no a quien lo escribio. Sin esto, no hay comunidad.

### 6. Que NO aceptamos

- PRs sin issue previo para features grandes.
- Cambios que rompen retrocompatibilidad sin un changeset `major` justificado.
- "Estilo personal" como motivacion (ej. "yo prefiero tabs"). Las decisiones son comunitarias.
- Dependencias nuevas sin justificacion clara (cada dep es deuda).

---

## <a name="-roadmap"></a>🗺️ Roadmap

| Estado | Item |
|:------:|------|
| 🔜 | `@devground/github-actions` — Workflows de CI reutilizables |
| 🔜 | `@devground/vscode-settings` — Configuracion compartida de VS Code |
| 💡 | Presets de AGENTS.md por stack (React, Angular, Go, Python) |
| 💡 | Plugin de ESLint para tokens semanticos (detectar hardcoded colors) |
| 💡 | `@devground/testing-config` — Presets de Vitest / Jest / Playwright |
| 💡 | Modo `--dry-run` en el CLI para previsualizar cambios sin escribir |

---

## <a name="-filosofia"></a>💭 Filosofia

<table>
<tr>
<td width="20%" align="center"><h3>📐</h3><b>Conceptos sobre codigo</b></td>
<td>Entender los fundamentos antes de implementar. Quien no sabe que problema resuelve un patron, no deberia aplicarlo.</td>
</tr>
<tr>
<td align="center"><h3>🧱</h3><b>Fundamentos solidos</b></td>
<td>Patrones de diseno, arquitectura y testing antes de frameworks. El framework cambia, los fundamentos no.</td>
</tr>
<tr>
<td align="center"><h3>⏳</h3><b>Sin atajos</b></td>
<td>La calidad real requiere esfuerzo y tiempo. No hay forma de saltarse el aprendizaje.</td>
</tr>
<tr>
<td align="center"><h3>🤖</h3><b>IA es una herramienta</b></td>
<td>Los humanos dirigen, la IA ejecuta. El criterio nunca se delega.</td>
</tr>
<tr>
<td align="center"><h3>🎯</h3><b>Decisiones contextuales</b></td>
<td>No existe la "mejor BD" ni la "mejor arquitectura" en abstracto — solo la adecuada para el problema.</td>
</tr>
</table>

---

## Licencia

[MIT](LICENSE) — Usa, modifica y distribuye libremente.

---

<div align="center">

**hecho con criterio** &nbsp;·&nbsp; **mantenido por** [@elkisdm](https://github.com/elkisdm)

<sub>si te ahorra una hora la primera vez que lo usas, considera regalarle una ⭐ al repo</sub>

</div>
