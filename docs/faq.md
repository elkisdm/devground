# FAQ

Preguntas frecuentes sobre devground. Para uso detallado de cada paquete, ver [docs/usage.md](usage.md).

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

## ¿Cuando NO usar devground?

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

[← Volver al README](../README.md)
