# ADR-0001: pnpm workspace en lugar de npm/yarn

- **Estado**: Aceptado
- **Fecha**: 2026-05-13 (documentado retroactivamente)
- **Decisor**: edaza
- **Aplica a**: monorepo `devground-1`

## Contexto

devground es un monorepo con 9 paquetes publicables a npm. Necesita:
- Linkeo entre paquetes en desarrollo local (`@devground/cli` consume `@devground/eslint-config`).
- Dedupe agresivo de dependencias (8 paquetes comparten ESLint, TS, etc.).
- Lockfile reproducible para CI.
- Compatibilidad con publicación a npm sin fricción.

Opciones del ecosistema en 2024–2026: npm workspaces, yarn (classic/berry), pnpm workspace, bun workspaces.

## Decisión

Usar **pnpm workspace** (versión fijada `pnpm@10.15.1` vía `packageManager` en `package.json`).

Configuración mínima en `pnpm-workspace.yaml`:
```yaml
packages:
  - 'packages/*'
```

## Consecuencias

**Positivas**
- Symlinks estrictos: cada paquete solo accede a sus dependencias declaradas (vs npm que hace hoisting permisivo, ocultando bugs de dependencias faltantes).
- Disco: instalación 30–60% más pequeña por el content-addressable store global.
- Velocidad de instalación mediblemente superior a npm en cold installs.
- `pnpm --filter <pkg>` para ejecutar scripts en paquetes específicos (usado en `scripts.build`).
- Lockfile (`pnpm-lock.yaml`) determinista y legible.

**Negativas / Trade-offs**
- Algunos paquetes legacy mal empaquetados fallan con symlinks estrictos (típicamente librerías que asumen hoisting). Mitigación: `public-hoist-pattern` selectivo si aparece.
- Usuarios finales del paquete pueden no tener pnpm. Mitigación: README ofrece comandos para npm/yarn/pnpm; `packageManager` solo aplica al desarrollo del monorepo.
- Curva de aprendizaje para colaboradores acostumbrados a npm.

## Alternativas consideradas

1. **npm workspaces**: ubicuo, viene con Node. Descartado: hoisting permisivo y velocidad inferior.
2. **yarn berry (PnP)**: rápido y estricto, pero PnP rompe muchas herramientas (Jest, algunos linters). Descartado por riesgo de compatibilidad.
3. **bun workspaces**: prometedor pero el ecosistema npm-publishing aún era inmaduro en 2024. Re-evaluar en futuro.

## Referencias

- [knowledge/BEST-PRACTICES.md](../../knowledge/BEST-PRACTICES.md) — principio "Simplicidad > pureza" se cumple: pnpm es la herramienta que mejor encaja sin reinventar.
