# ADR-0023: Convenciones de UI como contexto antes de generar

- **Estado**: Propuesto
- **Fecha**: 2026-07-11
- **Decisor**: edaza
- **Aplica a**: `packages/ui-conventions/`

## Contexto

Las convenciones de interfaz (componentes propios vs. primitivas del navegador, formateo
de inputs, accesibilidad, estados de error/carga, microinteracciones, y reglas regionales
como RUT/teléfono/moneda en Chile) se venían aplicando como una auditoría posterior e
iterativa: el código se generaba primero y se corregía después contra una checklist. Esto
produce ida y vuelta evitable — la mayoría de las desviaciones son mecánicas y conocidas de
antemano (falta `aria-label` en un botón icon-only, `type="number"` en vez de
`inputMode="numeric"`, RUT sin validar el dígito verificador).

## Decisión

Empaquetar las convenciones de UI como una skill solo-instalable (`@devground/ui-conventions`,
mismo patrón de empaquetado que `packages/design-taste/`) que se carga como contexto
**antes** de generar o editar UI, no después.

La skill tiene dos capas:

1. Una base universal (`references/base.md`) con reglas válidas para cualquier stack.
2. Un overlay opcional por proyecto (`docs/ui-conventions.md` en el repo consumidor), que
   el usuario puede minar del código real con `references/mining-prompt.md`. Cuando existe,
   el overlay tiene **precedencia** sobre la base: sus tokens, componentes propios y
   helpers concretos sustituyen la regla genérica.

Las reglas se aplican durante la generación del código, no como paso de limpieza posterior.
Un design-audit posterior sigue existiendo como red de seguridad, pero debería tener cada
vez menos que corregir.

## Consecuencias

**Positivas**
- Menos ciclos de corrección post-generación para patrones de UI mecánicos y conocidos.
- La base universal es reutilizable en cualquier proyecto sin acoplarse a un stack
  específico; el overlay captura lo específico de cada repo sin contaminar la base.

**Negativas / Trade-offs**
- El overlay requiere minado explícito por proyecto (no es automático); si no se genera,
  la skill opera solo con la capa base, más genérica.
- Mantener base.md y overlay-template.md sincronizados en estructura (mismo orden de
  secciones) es responsabilidad manual de quien edite la skill.

## Alternativas consideradas

1. **Seguir solo con auditoría posterior**: descartada porque no reduce el costo de
   corrección — el mismo patrón se repite generación tras generación en vez de resolverse
   una vez como contexto previo.
2. **Meter las reglas dentro de `design-taste`**: descartada porque mezclaría dos
   preocupaciones distintas — `design-taste` es estética (layout, tipografía, motion,
   spacing taste), mientras que estas reglas son de corrección y consistencia (semántica
   de inputs, accesibilidad, manejo de foco). Mantenerlas separadas permite que cada skill
   se cargue y evolucione independientemente.

## Referencias

- `packages/design-taste/` como patrón de empaquetado de skills solo-instalables.
- `packages/ui-conventions/skills/ui-conventions/references/base.md`
