# ADR-0005: Husky + lint-staged para git hooks

- **Estado**: Aceptado
- **Fecha**: 2026-05-13 (documentado retroactivamente)
- **Decisor**: edaza
- **Aplica a**: `@devground/husky-config`, `@devground/lint-staged-config`

## Contexto

Garantizar calidad en cada commit requiere ejecutar lint + format antes de que el código entre a git. Opciones de implementación:

1. **Husky** (npm classic) + **lint-staged**: estándar de facto.
2. **simple-git-hooks**: alternativa más ligera, sin dependencias.
3. **Hooks manuales en `.git/hooks/`**: nativos pero no versionados (cada dev debe instalarlos).
4. **Solo CI**: confiar en GitHub Actions para validar.

devground necesita una solución que: se instale automáticamente al hacer `pnpm install`, sea fácil de configurar para proyectos consumidores, y maneje correctamente solo los archivos staged (no toda la base de código).

## Decisión

Combinar **Husky 9** + **lint-staged**:

- `@devground/husky-config` provee el setup de hooks (`prepare` script, `.husky/pre-commit`).
- `@devground/lint-staged-config` provee las reglas: qué corre sobre qué archivos.

`.husky/pre-commit` ejecuta `pnpm lint-staged`, que a su vez corre Prettier + ESLint solo sobre los archivos modificados.

## Consecuencias

**Positivas**
- Hooks versionados en el repo (cualquier `pnpm install` los instala).
- Solo procesa archivos staged → rápido incluso en repos grandes.
- Husky 9 es minimalista y sin sorpresas (versiones anteriores eran más invasivas).
- Composable con commitlint (otro hook): `commit-msg` valida el mensaje.

**Negativas / Trade-offs**
- Husky añade una dependencia más al proyecto.
- Hooks de git pueden ser saltados con `--no-verify` — protección de "buen comportamiento", no de seguridad.
- Si lint-staged falla en un archivo, el commit completo se cancela (esperado, pero a veces frustra).
- Requiere `prepare` script en `package.json` del proyecto consumidor → documentado en CLI.

## Alternativas consideradas

1. **simple-git-hooks**: más ligero pero menos features. Descartado: Husky 9 ya es minimal y tiene más adopción/ecosistema.
2. **Solo CI sin hooks locales**: descartado. CI es la última línea de defensa; los hooks locales ahorran round-trips de "push, ver fallar CI, fix, push de nuevo".
3. **No usar lint-staged, lintear todo en cada commit**: descartado. En repos medianos esto añade segundos por commit y degrada UX.

## Referencias

- Husky 9: https://typicode.github.io/husky/
- lint-staged: https://github.com/okonet/lint-staged
