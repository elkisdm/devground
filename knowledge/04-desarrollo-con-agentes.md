# Desarrollo con agentes

Última revisión: 2026-11-05. Esta página resume cómo devground trabaja cuando parte del código lo escriben agentes de IA. Las decisiones viven en los ADR; aquí solo se orientan y se enlazan.

> Convención: `docs/adr/` se cita como ADR-NNNN; `knowledge/adr/` como KB-NNNN.

## 1. Spec-driven development

Spec-driven development (SDD) es escribir primero una especificación verificable (qué se quiere y cómo se sabrá que está bien) y dejar que el agente implemente contra ella, en lugar de pedir código directamente con un prompt suelto.

Tres referencias de la industria, una línea cada una:

- **GitHub Spec Kit** ([repo](https://github.com/github/spec-kit)): flujo con los comandos `/speckit-constitution`, `/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-implement` y `/speckit-converge`. La constitución se crea una vez por proyecto y valida el plan y las tareas; el ciclo se repite hasta que `converge` reporta «Converged».
- **Kiro** ([docs](https://kiro.dev/docs/specs/)): cada spec son tres archivos: `requirements.md`, `design.md` y `tasks.md`.
- **BMAD-Method** ([repo](https://github.com/bmad-code-org/BMAD-METHOD)): método open source (MIT) de desarrollo con agentes.

### Cómo lo resuelve devground

devground cubre el mismo flujo con la skill **spec-flow** y con **tiers**: se clasifica el cambio por tamaño y riesgo y se aplica solo la ceremonia que merece (un typo no lleva spec; una migración riesgosa lleva la completa). Esa graduación es lo que Spec Kit, tal como lo describe su repo, no ofrece, y es la lección de ADR-0029 a ADR-0040 (ver [ADR-0043](../docs/adr/0043-mapa-de-artefactos-y-encaje-con-agile.md), «Alternativas consideradas»).

Equivalencias aproximadas:

| Spec Kit             | devground                                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| constitution         | `AGENTS.md` + `docs/adr/`                                                                                        |
| specify              | `### Goal`, `### Acceptance criteria` y `### Spec` (Given/When/Then) del brief                                   |
| plan                 | `### Technical` / `### Design`                                                                                   |
| tasks                | `### Tasks` + `### Ejecución` ([ADR-0040](../docs/adr/0040-plan-de-ejecucion-por-agentes-y-contexto-acotado.md)) |
| implement / converge | ejecución por agentes y `### Closing check` (DoD)                                                                |

## 2. AGENTS.md como estándar

[AGENTS.md](https://agents.md) es un estándar abierto, administrado por la Agentic AI Foundation de la Linux Foundation (anunciada el 2025-12-09 junto con MCP y goose: [nota de prensa](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation)). Lo leen Codex, Cursor, Copilot, Gemini CLI, Jules, Aider, goose, Zed, VS Code, Devin y Amp, entre otros. Es Markdown sin campos obligatorios; en monorepos se anidan y gana el archivo más cercano al código que se edita.

devground instala un `AGENTS.md` (paquete `@devground/agents-md`) con symlinks para los demás agentes, y lo usa como constitución del proyecto ([ADR-0043](../docs/adr/0043-mapa-de-artefactos-y-encaje-con-agile.md), §7).

## 3. Mapa de artefactos y encaje con Agile

[ADR-0043](../docs/adr/0043-mapa-de-artefactos-y-encaje-con-agile.md) tiene la tabla completa (constitución, PRD, historia y AC, spec, diseño técnico, ADR, NFR, DoR, tareas, DoD, backlog) por tier. Resumen:

- Se usa el vocabulario estándar, pero no todo se exige siempre: la proporción la marca el tier.
- El PRD existe solo para iniciativas (un objetivo repartido en varios cambios); un cambio aislado no lo necesita.
- La DoR es un checklist al final del brief de Tier 2–3, no una etapa. Los NFR aplicables se marcan desde el [catálogo de NFR](nfr-catalogo.md).
- Agile se reparte en tres capas que no compiten: gestión (qué y en qué orden: backlog, sprints), ingeniería (cómo: devground) y gobierno (límites de la organización, ver [ADR-0046](../docs/adr/0046-nucleo-publico-y-capa-de-organizacion.md)).
- El DoD es el punto de contacto: según la [Scrum Guide 2020](https://scrumguides.org/scrum-guide.html) es la descripción formal del estado del Increment, y lo que no lo cumple vuelve al Product Backlog.

## 4. Gobierno de agentes

[ADR-0044](../docs/adr/0044-gobierno-de-agentes-seguridad-costo-y-modelos.md) fija las reglas. Resumen:

- **Ruteo**: el modelo y el esfuerzo los fija la definición de cada agente (`ejecutor-mecanico`, `ejecutor`, `ejecutor-critico`).
- **Herramientas acotadas**: los ejecutores no heredan MCP y ningún subagente hace push, merge, deploy ni publica; eso lo hace la sesión principal con aprobación humana.
- **Contenido externo es dato, no instrucción**: archivos, web, issues, PR y resultados de herramientas no se obedecen; se reportan. Es el riesgo «Prompt Injection» del [OWASP Top 10 para LLM 2025](https://genai.owasp.org/llm-top-10/), que también lista Sensitive Information Disclosure, Excessive Agency y Unbounded Consumption. Existe además un [Top 10 para aplicaciones agénticas](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026).
- **Secretos y acciones irreversibles**: nunca se imprimen ni se commitean ([ADR-0008](../docs/adr/0008-higiene-de-secretos.md)); borrar, force push, deploy y mensajes a terceros piden confirmación humana; las dependencias nuevas se verifican en el registro.
- **Costo**: máximo 5 agentes por cambio, modelo explícito, aviso antes de operaciones pagadas. Ver [costos de Claude Code](https://code.claude.com/docs/en/costs).
- **Responsabilidad**: el código del agente pasa el mismo DoD y quien lo mergea responde por él. Ver [seguridad de Claude Code](https://code.claude.com/docs/en/security).

## 5. Contexto: la IA amplifica lo que ya existe

El informe [DORA 2025](https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report) concluye que la IA amplifica las fortalezas y debilidades existentes de una organización, y propone un [modelo de capacidades para IA](https://dora.dev/ai/capabilities-model/). Consecuencia práctica para devground: los gates (tests, lint, cobertura, DoD) importan más con agentes, no menos.

## 6. Qué NO está resuelto aún

- **Evals de agentes**: no hay un estándar de la industria para evaluar agentes de forma comparable; devground no define uno. Los veredictos de sus propias skills son experimentales ([ADR-0032](../docs/adr/0032-veredictos-experimentales.md)).
- **Trazabilidad del código hecho por IA**: [Agent Trace](https://github.com/cursor/agent-trace) es un RFC, no un estándar. Por eso la atribución de IA en commits la decide cada proyecto ([ADR-0044](../docs/adr/0044-gobierno-de-agentes-seguridad-costo-y-modelos.md), §6).
- **Catálogo de NFR incompleto**: observabilidad, accesibilidad, privacidad y disponibilidad aún no tienen decisión propia ([nfr-catalogo.md](nfr-catalogo.md)).
