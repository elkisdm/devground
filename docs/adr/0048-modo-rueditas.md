# ADR-0048: Modo rueditas (guía opt-in para quien empieza)

- **Estado**: Aceptado
- **Fecha**: 2026-11-08
- **Decisor**: elkisdm
- **Aplica a**: `@devground/rueditas` (nuevo), preset `rueditas` de `devground-init`, `packages/cli/src/installers/rueditas.ts`
- **Extiende**: [ADR-0028](0028-orquestacion-opt-in-desactivada-por-defecto.md) (opt-in por defecto), [ADR-0046](0046-nucleo-publico-y-capa-de-organizacion.md) (capa de organización)

## Contexto

Builder Labs necesita guiar a personas que nunca programaron para que construyan su primer producto con Claude. Muchas de ellas tendrán el plan más económico de Claude, así que cada mensaje cuenta.

El estándar de Devground ya carga reglas para agentes en `AGENTS.md`, y ese archivo pesa 11,5 KB. Se lee completo en cada mensaje, así que cualquier guía que se agregue ahí se paga en cada turno, incluso en proyectos de personas que no la necesitan.

Quien usa Devground de forma avanzada no quiere que una guía para principiantes se active en sus proyectos. Y quien ya terminó el recorrido necesita poder apagarla sin dejar costo.

## Decisión

**Una skill de proyecto opt-in, con 5 etapas, presupuesto de tamaños comprobado por test y apagado por borrado.**

1. **Skill de proyecto, no global ni en `AGENTS.md`.** Se instala con el preset `rueditas` (`devground-init --preset rueditas`, que es todo lo de `full` más la skill) o con `npx devground-rueditas`, en `.claude/skills/rueditas/`. Que la carpeta exista significa que el modo está encendido. No se agrega nada a `AGENTS.md`.
2. **Opt-in estricto.** El preset `rueditas` no entra en `full`, `--yes`, ni en el valor por defecto sin TTY. En el menú interactivo aparece desmarcada.
3. **5 etapas**: definir, diseñar, construir, comprobar y publicar, validar con alguien. Cada una tiene su archivo en `references/etapa-N.md` y deja un archivo verificable en `producto/` del proyecto del usuario (`ficha.md`, `recorrido.md`, `evidencia.md`, `validacion.md`; la etapa 3 deja commits). Termina con «Listo cuando», donde cada punto lleva una marca: `[revisas]` (lo comprueba Claude), `[evidencia]` (lo muestra la persona) o `[decide]` (lo elige la persona).
4. **Presupuesto de tokens comprobado por test** (`packages/rueditas/test/contenido.test.js`): `SKILL.md` ≤ 6 KB, cada etapa ≤ 2 KB y cada línea del glosario ≤ 240 caracteres. Solo se carga la etapa actual y el glosario se consulta por término con grep, nunca entero.
5. **Conceptos vistos en `.devground/rueditas.md`.** Cada concepto se explica una sola vez, la primera vez que aparece, y queda registrado en el progreso.
6. **Apagar = borrar `.claude/skills/rueditas/` y conservar el progreso.** Ante «quita las rueditas», la skill pide confirmación, borra su propia carpeta y explica cómo volver a encenderla. `.devground/rueditas.md` no se toca, así que reinstalar retoma donde se quedó.

## Consecuencias

**Positivas**

- Costo cero por mensaje en proyectos sin el modo: no hay texto en `AGENTS.md` ni skill global que se cargue.
- Los límites de tamaño son un contrato verificado en CI, no una intención escrita.
- Apagar es simétrico a encender (borrar y copiar la misma carpeta) y no pierde progreso.

**Negativas / Trade-offs**

- Hay que recordar el preset `rueditas` explícitamente; `full` no lo instala. Es intencional, pero una persona nueva que use `--yes` no recibirá la guía. Mitigación: el README y la ayuda de `--preset` lo dicen.
- El contenido está en español neutro, así que no sirve a quien trabaja en inglés sin traducirlo (fuera de alcance de esta decisión).
- Los presupuestos de bytes son un proxy de tokens: un archivo de 2 KB en español pesa en tokens lo que pesa, pero no se mide con el tokenizador real.

## Alternativas consideradas

1. **Reglas en `AGENTS.md`.** Descartada: el costo se paga en cada mensaje de cada proyecto, incluidos los de usuarios avanzados, y `AGENTS.md` ya pesa 11,5 KB.
2. **Skill global (`~/.claude/skills/`).** Descartada: se activaría en todos los proyectos, incluidos los de usuarios avanzados, y no se podría apagar por proyecto.
3. **Modo con bandera en un archivo (por ejemplo `.devground/rueditas.on`).** Descartada: la skill seguiría cargándose apagada, así que el costo de descripción se pagaría igual. Con borrar la carpeta, apagado significa costo cero.

## Referencias

- [ADR-0028](0028-orquestacion-opt-in-desactivada-por-defecto.md), [ADR-0046](0046-nucleo-publico-y-capa-de-organizacion.md)
- Spec: `docs/specs/modo-rueditas.md`
