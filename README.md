<p align="center">
  <img src="https://img.shields.io/badge/pnpm-workspace-F69220?logo=pnpm&logoColor=white" alt="pnpm workspace" />
  <img src="https://img.shields.io/badge/ESLint-v9%20Flat%20Config-4B32C3?logo=eslint&logoColor=white" alt="ESLint v9" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white" alt="TypeScript strict" />
  <img src="https://img.shields.io/badge/Changesets-versioning-26A69A" alt="Changesets" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License" />
</p>

# devground

**Estándares de desarrollo como paquetes npm instalables.** Un solo comando para configurar TDD, linting, formateo, commits convencionales y reglas de agentes de IA en cualquier proyecto.

```bash
# Instalacion rapida — todo en dos comandos
pnpm add -D @devground/devground eslint prettier typescript husky lint-staged @commitlint/cli
npx devground-setup
```

```bash
# O con el CLI interactivo
npx devground-init
```

---

## El problema

Cada nuevo proyecto empieza con la misma fricción: configurar ESLint, Prettier, TypeScript, git hooks, commit conventions... y después documentar las reglas de desarrollo para que todo el equipo (humanos y agentes de IA) las siga.

**devground** resuelve esto empaquetando todo en paquetes npm reutilizables. Instala uno, instala todos, o deja que el CLI lo haga por ti.

---

## Inicio rapido

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

  Instalando...
  ✓ @devground/prettier-config
  ✓ @devground/eslint-config (Next.js)
  ✓ @devground/tsconfig (next + typecheck)
  ✓ @devground/commitlint-config
  ✓ @devground/lint-staged-config
  ✓ Husky configurado con pre-commit hook
  ✓ AGENTS.md + symlinks para Claude, Cursor, Copilot, Gemini

  ✓ Listo. 7 estandares de desarrollo activos.
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

## Paquetes

El monorepo contiene **8 paquetes** independientes. Cada uno se puede instalar por separado o todos juntos via el CLI.

| Paquete | Version | Descripcion |
|---------|---------|-------------|
| [`@devground/devground`](#devgrounddevground) | `1.0.0` | **Todo en uno** — instala y configura todos los paquetes |
| [`@devground/prettier-config`](#devgroundprettier-config) | `1.0.0` | Configuracion compartida de Prettier |
| [`@devground/eslint-config`](#devgroundeslint-config) | `1.0.0` | ESLint Flat Config v9 (base + Next.js) |
| [`@devground/tsconfig`](#devgroundtsconfig) | `1.0.0` | Presets de TypeScript (base, next, CI, node) |
| [`@devground/commitlint-config`](#devgroundcommitlint-config) | `1.0.0` | Commits convencionales con commitlint |
| [`@devground/lint-staged-config`](#devgroundlint-staged-config) | `1.0.0` | Reglas de linting para archivos staged |
| [`@devground/husky-config`](#devgroundhusky-config) | `1.0.0` | Setup de git hooks con Husky |
| [`@devground/agents-md`](#devgroundagents-md) | `1.0.0` | AGENTS.md + symlinks multi-agente |
| [`devground-init`](#devground-init-cli) | `1.0.0` | CLI para scaffolding completo |

---

## Uso de cada paquete

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

## Reglas de desarrollo incluidas

El `AGENTS.md` contiene 10 reglas de desarrollo probadas en produccion:

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

## devground-init (CLI)

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

## Arquitectura del monorepo

```
devground/
├── .changeset/             # Versionado independiente por paquete
├── .github/workflows/      # CI (PRs) + Release automatico (merge a main)
├── packages/
│   ├── prettier-config/    # JSON puro, sin build
│   ├── eslint-config/      # ESM (.mjs), sin build
│   ├── tsconfig/           # JSON puro, sin build
│   ├── commitlint-config/  # CJS, sin build
│   ├── lint-staged-config/ # CJS, sin build
│   ├── husky-config/       # Script Node.js, sin build
│   ├── agents-md/          # Markdown + script, sin build
│   └── cli/                # TypeScript → tsc → dist/
├── package.json            # pnpm workspaces
└── pnpm-workspace.yaml
```

**Solo el CLI necesita build** (`tsc`). El resto son archivos estaticos listos para publicar.

---

## Desarrollo

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

## CI/CD

| Workflow | Trigger | Que hace |
|----------|---------|----------|
| **CI** | Pull Request a `main` | Install → Build → Test |
| **Release** | Push a `main` | Install → Build → Changesets publish |

El `NPM_TOKEN` se configura como secret en GitHub (Settings → Secrets → Actions).

---

## Roadmap

- [ ] `@devground/github-actions` — Workflows de CI reutilizables
- [ ] `@devground/vscode-settings` — Configuracion compartida de VS Code
- [ ] Presets de AGENTS.md por stack (React, Angular, Go, Python)
- [ ] Plugin de ESLint para tokens semanticos (detectar hardcoded colors)

---

## Filosofia

> **Conceptos sobre codigo.** Entender los fundamentos antes de implementar.
>
> **Fundamentos solidos.** Patrones de diseno, arquitectura y testing antes de frameworks.
>
> **Sin atajos.** La calidad real requiere esfuerzo y tiempo.
>
> **IA es una herramienta.** Los humanos dirigen, la IA ejecuta.

---

## Licencia

[MIT](LICENSE) — Usa, modifica y distribuye libremente.
