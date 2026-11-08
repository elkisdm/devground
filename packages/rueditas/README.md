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

## Seguir sin guía o apagar

Dile a Claude «quita las rueditas» y te ofrece dos opciones:

- **Seguir sin guía**: se van las etapas, las explicaciones y el ir de a una cosa. Se mantienen las reglas que te protegen: confirmar antes de gastar o de hacer algo irreversible, detenerse si el mismo error vuelve dos veces, mostrar las cosas funcionando y no saltarse los bloqueos del commit. Para volver al modo guiado: «pon las rueditas».
- **Quitar todo**: borra `.claude/skills/rueditas/`. Para volver a encenderlo: `npx @devground/rueditas`.

En los dos casos tu progreso en `.devground/rueditas.md` no se borra.

### ¿Cuándo dejarlas?

No hace falta adivinarlo. Desde la segunda vuelta por las etapas, si cierras una etapa sin que Claude haya tenido que explicarte ningún concepto nuevo, te propone seguir sin guía. Puedes decir que no y seguir guiado.

### ¿Atrasan?

Un poco, a propósito: plan antes de construir, una cosa a la vez y evidencia antes de pasar de etapa. A cambio, cada concepto se explica una sola vez y, si un error se repite, se para a replantear en vez de probar a ciegas, que es donde más tiempo se pierde al empezar.

## Presupuesto de tokens

Pensado para el plan más económico de Claude, y verificado por tests (`pnpm test`):

- `SKILL.md`: 6 KB como máximo.
- Cada archivo de etapa: 2 KB como máximo; solo se carga el de la etapa actual.
- Glosario: una línea por término (240 caracteres como máximo), consultada con grep, nunca leída entera.
