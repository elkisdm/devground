# @devground/rueditas

**Modo rueditas para Claude Code.** Una skill que guía a quien construye su primer producto: lo lleva por 5 etapas (definir, diseñar, construir, comprobar y publicar, validar con alguien), explica cada concepto la primera vez que aparece y guarda el avance en `.devground/rueditas.md`.

## Instalar

En el proyecto actual:

```bash
npx @devground/rueditas
# -> .claude/skills/rueditas
```

O con Devground completo: `devground-init --preset rueditas`.

Para todos tus proyectos: `npx @devground/rueditas --global` (va a `~/.claude/skills/`).

Nunca sobrescribe archivos existentes: tus ediciones se conservan.

## Apagar

Dile a Claude «quita las rueditas». Confirma y borra `.claude/skills/rueditas/`. Tu progreso en `.devground/rueditas.md` no se borra. Para volver a encenderlo: `npx @devground/rueditas`.

## Presupuesto de tokens

Pensado para el plan más económico de Claude, y verificado por tests (`pnpm test`):

- `SKILL.md`: 6 KB como máximo.
- Cada archivo de etapa: 2 KB como máximo; solo se carga el de la etapa actual.
- Glosario: una línea por término (240 caracteres como máximo), consultada con grep, nunca leída entera.
