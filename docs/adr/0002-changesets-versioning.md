# ADR-0002: Changesets para versionado y publicación

- **Estado**: Aceptado
- **Fecha**: 2026-05-13 (documentado retroactivamente)
- **Decisor**: edaza
- **Aplica a**: workflow de release del monorepo

## Contexto

Con 9 paquetes publicables (8 configs + 1 meta `@devground/devground` + CLI), versionar manualmente es:
- Propenso a error: olvidar bump de un paquete dependiente.
- Tedioso: editar 9 `package.json` y 9 changelogs por release.
- Frágil: SemVer mal aplicado rompe a usuarios sin aviso.

Opciones: versionado manual, `lerna`, `nx release`, `changesets`, `semantic-release`.

## Decisión

Usar **Changesets** (`@changesets/cli`).

Workflow:
1. Por cada PR con cambio publicable: ejecutar `pnpm changeset` y describir el cambio + tipo de bump (patch/minor/major) por paquete afectado.
2. Cuando se quiera releasear: `pnpm changeset version` consolida los changesets en bumps + changelogs.
3. `pnpm publish-packages` (definido en `package.json`) ejecuta `changeset publish` que publica solo los paquetes con bump pendiente.

## Consecuencias

**Positivas**
- Cada cambio publicable obliga a un changeset explícito → no se publica nada accidentalmente.
- Changelogs generados automáticamente por paquete (formato Keep a Changelog).
- Soporte nativo para monorepos: detecta dependencias internas y bumpea en cascada.
- Modelo "PR-based": el changeset vive en el PR y queda en el historial.
- Sin acoplamiento a commits convencionales (que también usamos, pero por commitlint, no por release).

**Negativas / Trade-offs**
- Requiere disciplina: olvidar `pnpm changeset` en un PR significa que el cambio no se publica hasta que se añada manualmente.
- Curva de aprendizaje breve para colaboradores.
- No es 100% automático como `semantic-release` (que infiere de los commits) — pero esa explicitud es intencional.

## Alternativas consideradas

1. **semantic-release**: 100% automático, infiere bump de mensajes de commit. Descartado: en monorepos su configuración es compleja y el modelo "un commit = un release" choca con PRs que tocan varios paquetes.
2. **lerna publish**: estándar histórico. Descartado: en mantenimiento limitado tras Nx adoptarlo, y `changesets` es más simple para nuestro caso.
3. **Versionado manual**: descartado por las razones del Contexto.

## Referencias

- [Changesets docs](https://github.com/changesets/changesets)
