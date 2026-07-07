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

<!-- render con: vhs demo/devground.tape -->
![demo](demo/devground.gif)

<p>
  <a href="https://www.npmjs.com/package/@devground/devground"><img src="https://img.shields.io/npm/v/@devground/devground?logo=npm&color=CB3837&label=npm" alt="npm version" /></a>
  <a href="https://github.com/elkisdm/devground/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/elkisdm/devground/ci.yml?branch=main&logo=github&label=CI" alt="CI status" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-44CC11" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/Node-%E2%89%A520-339933?logo=node.js&logoColor=white" alt="Node 20+" />
</p>

</div>

> **13 paquetes npm. Un solo comando.**
> devground empaqueta los estandares de desarrollo (TDD, linting, formateo, commits convencionales, git hooks, reglas para agentes de IA, knowledge base de arquitectura y metricas) en paquetes npm reutilizables.
> **Para quien:** equipos que arrancan proyectos Node / TypeScript / Next.js y no quieren reconfigurar las mismas herramientas en cada repo.

---

## Inicio rapido

Un paquete que trae todo. **Dos comandos y listo:**

```bash
pnpm add -D @devground/devground eslint prettier typescript husky lint-staged @commitlint/cli
npx devground-setup
```

¿Prefieres un asistente que detecte tu stack? Usa el CLI interactivo:

```bash
npx devground-init
```

<details>
<summary><b>Que pasa en esos 30 segundos</b></summary>

```diff
+ eslint.config.mjs              ← ESLint 9 flat config (detecta Next.js)
+ tsconfig.json                  ← preset strict para tu stack
+ tsconfig.typecheck.json        ← preset CI
+ commitlint.config.js           ← conventional commits
+ lint-staged.config.cjs         ← re-exporta @devground/lint-staged-config
+ .husky/pre-commit              ← lint-staged en cada commit
+ AGENTS.md                      ← reglas para IA (source of truth)
+ CLAUDE.md → AGENTS.md          ← symlink (Claude Code)
+ .cursorrules → AGENTS.md       ← symlink (Cursor)
+ .github/copilot-instructions.md → AGENTS.md
+ .gemini/styleguide.md → AGENTS.md
+ .codex/config.toml             ← Codex (lee AGENTS.md nativo, sin symlink)
+ knowledge/                     ← guias + 11 ADRs de arquitectura
~ package.json                   ← prettier, prepare script
```

**No sobreescribe tus configs.** Cada instalador de archivo de config (ESLint, TypeScript, Commitlint, lint-staged) respeta un archivo existente: lo deja intacto y no instala nada. Prettier respeta una clave `"prettier"` previa. Los instaladores que delegan (Husky, AGENTS.md, Architecture guide) ejecutan sus propios binarios.

</details>

**Mas formas de instalar:**

```bash
npx devground-init --yes              # todo, sin preguntas
npx devground-init --preset agents-only   # solo AGENTS.md + symlinks para IA
```

---

## ¿Que paquete necesito?

No tienes que instalar todo. Empieza por tu caso:

| Tu caso | Que instalar |
|---------|--------------|
| **App Next.js nueva** | `@devground/devground` + `npx devground-setup` (trae los 7 presets de config) |
| **Librería TS / paquete npm** | `@devground/tsconfig` + `@devground/eslint-config` + `@devground/prettier-config` |
| **Monorepo (pnpm / Turborepo)** | `@devground/devground` en cada paquete, o los presets compartidos en el root |
| **Solo quiero los git hooks** | `@devground/husky-config` + `@devground/lint-staged-config` + `@devground/commitlint-config` |
| **Solo reglas para agentes de IA** | `npx devground-init --preset agents-only` (genera `AGENTS.md` + symlinks) |
| **Documentar decisiones de arquitectura** | `@devground/architecture-guide` (standalone) |
| **Medir velocidad/calidad del equipo** | `@devground/dev-metrics` (standalone) |
| **Convertir peticiones vagas en specs right-sized** | `@devground/sdd` (`npx @devground/sdd`, skill spec-flow) |

Cada paquete es independiente: instala solo lo que necesitas. Detalle de uso en [docs/usage.md](docs/usage.md).

---

## Paquetes

El monorepo contiene **13 paquetes** independientes. Cada uno se instala por separado o todos juntos via el CLI. (Las versiones publicadas se ven en los badges de npm de cada paquete — no se listan aqui para evitar que queden desactualizadas.)

| | Paquete | Descripcion |
|---|---------|-------------|
| 🎁 | [`@devground/devground`](packages/devground#readme) | **Todo en uno** — instala y configura los presets de config |
| 💅 | [`@devground/prettier-config`](packages/prettier-config#readme) | Configuracion compartida de Prettier |
| 🔍 | [`@devground/eslint-config`](packages/eslint-config#readme) | ESLint Flat Config (base + Next.js), con `max-lines` y `no-explicit-any` |
| 🧬 | [`@devground/tsconfig`](packages/tsconfig#readme) | Presets de TypeScript (base strict, next, next-loose, CI, node) |
| ✍️ | [`@devground/commitlint-config`](packages/commitlint-config#readme) | Commits convencionales con commitlint |
| 🧹 | [`@devground/lint-staged-config`](packages/lint-staged-config#readme) | Reglas de linting para archivos staged |
| 🪝 | [`@devground/husky-config`](packages/husky-config#readme) | Git hooks con Husky (pre-commit con gitleaks + commit-msg) |
| 🤖 | [`@devground/agents-md`](packages/agents-md#readme) | AGENTS.md + symlinks multi-agente (Claude, Cursor, Copilot, Gemini) + config nativo para Codex |
| 🏛️ | [`@devground/architecture-guide`](packages/architecture-guide#readme) | **Knowledge base** de arquitectura + ADRs (BD, patrones, sistemas) |
| 📊 | [`@devground/dev-metrics`](packages/dev-metrics#readme) | CLI de metricas de desarrollo con agentes (velocidad, calidad, eficiencia) + impacto de spec-flow y costo de orientación — standalone |
| 📐 | [`@devground/sdd`](packages/sdd#readme) | **spec-flow** — skill de intake SDD instalable (clasifica, enriquece y rutea cualquier cambio al proceso mínimo que merece) |
| 🪵 | [`@devground/logger`](packages/logger#readme) | Logger minimalista compartido (sin dependencias) |
| 🧪 | [`@devground/vitest-config`](packages/vitest-config#readme) | Config Vitest compartida (entorno node, cobertura v8) |
| ⚡ | [`devground-init`](packages/cli#readme) | CLI para scaffolding completo |

> **Alcance del agregador:** `@devground/devground` **solo** agrupa los 7 presets de config (prettier, eslint, tsconfig, commitlint, lint-staged, husky, agents-md). Los paquetes `@devground/architecture-guide`, `@devground/dev-metrics`, `@devground/logger` y `@devground/vitest-config` son **standalone**: no forman parte del bundle y se instalan por separado segun se necesiten. Esto es intencional — la documentacion, las metricas y las utilidades no son configuracion que un proyecto deba heredar automaticamente.

---

## 🧪 Experimental

Capacidades en incubacion dentro del repo. **Aun no se publican a npm** — estan en validacion antes de definir su forma de entrega. Se documentan aqui para que sean visibles, pero hoy no se instalan como paquete.

| | Que es | Estado |
|---|--------|--------|
| 🔬 [`@devground/deepcheck`](packages/deepcheck#readme) | Verificacion profunda **multi-agente** (QA · Validacion · Auditoria) que audita un flujo en paralelo por dimensiones, confirma cada hallazgo de forma **adversarial** (refutadores con lentes distintas) y **destila una skill de auditoria** que se vuelve mas afilada en cada corrida. No es un linter: razona sobre el flujo y acumula conocimiento para no re-descubrir lo mismo. | Piloto privado |
| 🌙 [`@devground/dreaming`](packages/dreaming#readme) | Consolidacion de memoria **out-of-band** para Claude Code: revisa los transcripts recientes de un proyecto contra su memory store y propone un **diff revisado** (fusionar duplicados, deprecar memorias obsoletas/contradichas, sumar patrones y feedback no capturados, arreglar la deriva del indice). Harness Python determinista para el gather (sin tokens) + skill que razona y propone con evidencia por cambio. **Nada se escribe sin aprobacion; nunca borra en duro.** | Piloto privado |
| 🧭 [skill `cimientos`](.claude/skills/cimientos/SKILL.md) | Flujo **guiado** de decisiones de arquitectura para proyectos nuevos: entrevista fase por fase, razona con la knowledge base (ADRs 0001–0011) y escribe las decisiones como ADRs (status Propuesto) + un `DECISIONS.md`. Garantiza bases solidas sin sobre-ingenieria. | Skill del repo (Claude Code) |
| ⚖️ [`model-orchestrator`](tools/model-orchestrator#readme) | Harness de **routing de modelos por complejidad**: tras `spec-flow`, asigna a cada tarea el modelo y esfuerzo optimos (Opus / Sonnet / Haiku) para balancear **precio/calidad**, presenta un plan con costo estimado y despacha sub-agentes. Reglas de piso declarativas + un juez barato que ajusta ±1 nivel; las **invariantes se imponen en codigo** (`engine.mjs`, 30/30 tests), nunca en el juicio del modelo barato. Reconcilia costo real vs estimado. | Tool del repo (Claude Code) |

> deepcheck nacio **auditando el propio CLI de devground** y cazo bugs reales que hoy estan corregidos (ver el changeset de `devground-init`). Su [README](packages/deepcheck#readme) detalla los 3 roles ortogonales y el ciclo de aprendizaje.

---

## Documentacion

| Tema | Donde |
|------|-------|
| **Uso detallado por paquete** | [docs/usage.md](docs/usage.md) → indice a cada README de paquete |
| **Reglas de desarrollo (10) + estandares de seguridad (ADR 0007–0012)** | [docs/usage.md](docs/usage.md#reglas-de-desarrollo-incluidas) |
| **Conceptos de arquitectura** (BD, indices, sharding, CAP, patrones) | [docs/architecture-concepts.md](docs/architecture-concepts.md) |
| **Glosario** (para no-developers) | [docs/glossary.md](docs/glossary.md) |
| **Preguntas frecuentes** + cuando NO usar devground | [docs/faq.md](docs/faq.md) |
| **ADRs del proyecto devground** | [docs/adr/](docs/adr/) |

Cada paquete tiene su README con instalacion, configuracion y reglas completas — empieza por la tabla de [Paquetes](#paquetes) o por [docs/usage.md](docs/usage.md).

---

## Arquitectura del monorepo

```
devground/
├── .changeset/             # Versionado independiente por paquete
├── .github/workflows/      # CI (PRs) + Release automatico (merge a main)
├── knowledge/              # Knowledge base de arquitectura (fuente)
│   └── adr/                # 11 ADRs derivados
├── docs/                   # Documentacion del README: usage, faq, glossary, conceptos
│   └── adr/                # ADRs propios del proyecto devground
├── demo/                   # Tape VHS + GIF de demostracion del CLI
├── packages/               # 15 paquetes (13 publicados + deepcheck y dreaming en incubacion)
├── package.json            # pnpm workspaces
└── pnpm-workspace.yaml
```

**Solo el CLI necesita build** (`tsc`). El resto son archivos estaticos listos para publicar.

---

## Desarrollo

**Requisitos:** Node.js >= 20, pnpm >= 10.

```bash
git clone https://github.com/elkisdm/devground.git
cd devground
pnpm install
pnpm build              # Compilar el CLI
pnpm test               # Ejecutar tests del CLI
pnpm changeset          # Crear un changeset para nueva version
```

**Versionado** con [Changesets](https://github.com/changesets/changesets): haces cambios, corres `pnpm changeset` (eliges paquete + bump), commiteas; GitHub Actions abre un PR "Version Packages" y, al mergearlo, publica en npm.

**CI/CD:**

| Workflow | Trigger | Que hace |
|----------|---------|----------|
| **CI** | Pull Request a `main` | Install → Build → Test (Node 20 y 22) |
| **Release** | Push a `main` | Install → Build → Changesets publish |
| **Demo** | Push a `main` que toca `demo/*.tape` | Re-renderiza el GIF (no bloqueante) |

---

## Como contribuir

Las contribuciones son bienvenidas. Lo esencial:

- **Issue primero** para cambios no triviales (problema → propuesta → alternativas). Mejoras de solo doc pueden ir como PR directo.
- **Commits convencionales** (`feat:`, `fix:`, `docs:`, …) — el repo dogfooding su propio `commitlint-config`.
- **Tests** para todo cambio en el CLI (no se aceptan PRs sin tests).
- **Changeset** por cada cambio publicable: `pnpm changeset`.

Detalle completo en [CONTRIBUTING.md](CONTRIBUTING.md) y [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Politica de seguridad en [SECURITY.md](SECURITY.md).

---

## Roadmap

| Estado | Item |
|:------:|------|
| 🔜 | `@devground/github-actions` — Workflows de CI reutilizables |
| 🔜 | `@devground/vscode-settings` — Configuracion compartida de VS Code |
| 💡 | Presets de AGENTS.md por stack (React, Angular, Go, Python) |
| 💡 | Plugin de ESLint para tokens semanticos (detectar hardcoded colors) |
| 💡 | `@devground/testing-config` — Presets de Vitest / Jest / Playwright |
| 💡 | Modo `--dry-run` en el CLI para previsualizar cambios sin escribir |

---

## Filosofia

- **📐 Conceptos sobre codigo** — entender los fundamentos antes de implementar.
- **🧱 Fundamentos solidos** — patrones, arquitectura y testing antes de frameworks.
- **⏳ Sin atajos** — la calidad real requiere esfuerzo y tiempo.
- **🤖 IA es una herramienta** — los humanos dirigen, la IA ejecuta. El criterio nunca se delega.
- **🎯 Decisiones contextuales** — no existe la "mejor BD" ni la "mejor arquitectura" en abstracto, solo la adecuada para el problema.

---

## Licencia

[MIT](LICENSE) — Usa, modifica y distribuye libremente.

---

<div align="center">

**hecho con criterio** &nbsp;·&nbsp; **mantenido por** [@elkisdm](https://github.com/elkisdm)

<sub>si te ahorra una hora la primera vez que lo usas, considera regalarle una ⭐ al repo</sub>

</div>
