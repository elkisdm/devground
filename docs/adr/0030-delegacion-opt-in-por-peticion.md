# ADR-0030: La delegación a subagentes es opt-in por petición, no un default de sesión

- **Estado**: Aceptado
- **Fecha**: 2026-07-27
- **Decisor**: edaza
- **Aplica a**: `~/.claude/CLAUDE.md` (regla viva), `@devground/sdd` (capa `orchestration/`), flujo de trabajo con agentes en Claude Code

## Contexto

Cinco días después de apagar los hooks, el sistema seguía delegando 58 veces por día sin
que nadie lo pidiera.

[ADR-0028](0028-orquestacion-opt-in-desactivada-por-defecto.md) declaró la capa de
orquestación opt-in y desregistró sus hooks el 2026-07-22. Lo hizo bien: hoy ni
`~/.claude/settings.json`, ni `settings.local.json`, ni el `.claude/` de ningún proyecto
registran `orchestrator-gate.sh` u `orchestrator-context.sh`, y `MODO ORQUESTADOR ACTIVO`
—la marca que ese hook inyectaba— no aparece en ningún transcript posterior al corte.

Lo que ese ADR no tocó fue la instrucción en `CLAUDE.md`, y ahí estaba el disparador real.
Conteo sobre los transcripts del 23 al 27 de julio:

| Subagente | Lanzamientos en 4 días |
|---|---|
| `ejecutor` | 183 |
| `planner` | 33 |
| `planner-deep` | 16 |
| **Total** | **232** |

Concentrados en HCLP (200), Redify web (13), sesiones desde `~` (11) y atlasengine (6).
Ninguno pedido por el usuario.

El mecanismo es el que el propio ADR-0028 aceptó a conciencia en sus consecuencias
negativas —"la disciplina vuelve a depender de la instrucción en `CLAUDE.md`"— sin prever
que la instrucción no dependía de la disciplina de nadie: es una orden imperativa
(`la EJECUCIÓN siempre es de subagentes`) en el archivo **global**, que se carga en todos
los proyectos y se activa por el **modelo de sesión**, no por lo que el usuario pide. Con
Opus como modelo habitual, la condición se cumple siempre.

El pendiente #3 de ADR-0028 —"sacar Tier 0-1 de la delegación obligatoria"— quedó sin
hacer. Este ADR va más lejos que ese pendiente: el problema no es qué tier se delega, sino
**quién decide delegar**.

## Decisión

La delegación a `planner`, `planner-deep` y `ejecutor` se lanza **solo cuando el usuario la
pide**, o cuando el modelo la propone y el usuario acepta. El modelo de sesión deja de ser
condición de nada.

`spec-flow` sigue siendo la puerta de entrada de toda petición de cambio: clasificar,
asignar tier, producir el brief. Lo que cambia es que el tier vuelve a graduar la
**ceremonia de la spec** en vez de rutear agentes.

El cambio es de texto, en los dos lugares donde vive la regla:

| Artefacto | Cambio |
|---|---|
| `~/.claude/CLAUDE.md` (regla viva) | La cláusula de ruteo por tier a subagentes se reemplaza por delegación bajo pedido. |
| `packages/sdd/orchestration/CLAUDE.rule.md` (extracto distribuido) | Se parte en dos bullets: el **base**, que pega cualquiera y no delega; y el **add-on**, que solo pega quien activó la capa a propósito y conserva el ruteo por tier de ADR-0027. |

El add-on conserva Tier 0-1 en la delegación —el pendiente #3 de ADR-0028 sigue abierto—
porque cerrarlo ahí no es un cambio de texto: `orchestrator-gate.sh` deniega todo
`Edit`/`Write` en el main loop sin mirar el tier, así que prometer "Tier 0-1 los ejecuta el
orquestador" produciría denials en vez de ahorro. Ese pendiente exige tocar el script, y
este ADR no lo hace.

No se toca el código de la capa: `orchestrator-gate.sh`, `orchestrator-context.sh` y los
tres agentes siguen versionados, testeados y sin registrar. Quien active la capa a
propósito obtiene el comportamiento de ADR-0027; quien no la active no hereda nada.

## Consecuencias

**Positivas**
- Los lanzamientos no pedidos bajan a cero por construcción: no hay condición automática
  que los dispare.
- El tier recupera su significado original —cuánta spec merece el cambio— en vez de servir
  de tabla de ruteo de agentes.
- El flujo por defecto deja de depender de la capa: quien no la active nunca la ve, y el
  extracto distribuido dice cuál de los dos bullets le corresponde.

**Negativas / Trade-offs**
- Un cambio Tier 3 (migración, contrato externo, seguridad) puede ejecutarse en el main
  loop sin el plan previo de `planner-deep`. Antes eso estaba forzado. La mitigación es
  que el modelo lo **proponga** ante un cambio riesgoso; la decisión queda en el usuario,
  que es exactamente el punto de este ADR.
- Se pierde el ahorro de correr Sonnet en cambios mecánicos largos, salvo que el usuario lo
  pida. ADR-0028 ya midió que ese ahorro no era neto (+10% por turno), así que la pérdida
  esperada es menor que el ruido que elimina.
- Los tres defectos abiertos de ADR-0028 (redirecciones `>` denegadas sin validar destino;
  `orchestrator-context.sh` desplazando a `spec-flow`; Tier 0-1 sin rentabilidad) siguen
  igual, y ahora sin presión para arreglarlos: nadie ejercita los scripts. Quedan como
  deuda declarada de la capa, no del flujo por defecto.

## Alternativas consideradas

1. **Delegar automáticamente solo Tier 2-3** (el pendiente #3 tal cual): descartada.
   Reduce el volumen pero no el problema: sigue delegando sin que el usuario lo pida, y
   deja el juicio de tier en manos del mismo modelo que decide delegar.
2. **Mantener la regla, pero solo en los proyectos que la quieren** (p. ej. HCLP, que
   concentra el 86% de los lanzamientos): descartada. Dos defaults distintos según el
   directorio multiplican la superficie de sorpresa, que es justo la queja de origen.
3. **No hacer nada**: descartada por los 232 lanzamientos de la tabla.
4. **Eliminar la capa del paquete**: descartada por la misma razón que en ADR-0028 —
   reintroduce el bus factor 1 sobre artefactos que funcionan.

## Referencias

- [ADR-0028 — La capa de orquestación es opt-in y queda desactivada por defecto](0028-orquestacion-opt-in-desactivada-por-defecto.md) (sucedido en la parte de `CLAUDE.md`: apagó los hooks, este ADR apaga la instrucción)
- [ADR-0027 — Empaquetar la regla de orquestación en `@devground/sdd`](0027-empaquetar-regla-de-orquestacion.md) (sigue vigente para quien active la capa)
- [ADR-0022 — Jerarquía de orquestación de agentes en sesiones interactivas](0022-jerarquia-de-orquestacion.md)
- [ADR-0016 — spec-flow se distribuye como `@devground/sdd`](0016-spec-flow-como-paquete-sdd.md)
