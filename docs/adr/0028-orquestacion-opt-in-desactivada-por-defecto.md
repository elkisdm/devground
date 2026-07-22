# ADR-0028: La capa de orquestación es opt-in y queda desactivada por defecto

- **Estado**: Propuesto
- **Fecha**: 2026-07-22
- **Decisor**: edaza
- **Aplica a**: `@devground/sdd` (capa `orchestration/`), flujo de trabajo con agentes en Claude Code

## Contexto

[ADR-0027](0027-empaquetar-regla-de-orquestacion.md) versionó la regla dura de
orquestación como capa instalable de `@devground/sdd` para eliminar el bus factor 1. Ese
objetivo se cumplió y no se revierte: los artefactos siguen versionados.

Lo que ADR-0027 no podía saber es si la regla **valía la pena en uso real**. Tras nueve
días de operación continua se midió el sistema completo: 678 transcripts de sesión más
4.730 de subagentes en `~/.claude/projects`, comparando sesiones con modelo orquestador
(Opus/Fable) antes y después de la activación de los hooks (corte 2026-07-14).

| Señal | Antes (n=434) | Después (n=213) |
|---|---|---|
| Sesiones que delegan | 53% | 92% |
| Invocaciones de `ejecutor` | 375 | 1.054 |
| Costo en subagentes | 18% | 46% |
| **Costo por turno de usuario** | **$8,23** | **$9,04** |
| **Invocaciones de `spec-flow`** | **173** | **7** |
| Denials del gate | 8 | 314 (en 62% de las sesiones) |

Lecturas:

1. **La delegación funciona mecánicamente.** El trabajo pesado sí migró de Opus a Sonnet.
2. **No hay ahorro demostrable.** El costo mediano por sesión bajó, pero es sesgo de
   composición: las sesiones post-corte tienen mediana de 1 turno de usuario contra 4
   antes. Normalizado por turno, el costo sube 10%. El ahorro de correr Sonnet se lo come
   el overhead de orquestación (brief + plan + revisión + re-lectura de contexto).
3. **La regla desplazó a la skill que decía respaldar.** `orchestrator-context.sh` inyecta
   una instrucción imperativa de ruteo por tier y menciona `spec-flow` solo como
   paréntesis; la instrucción fuerte gana. Los subagentes invocaron `spec-flow` una sola
   vez en todo el histórico.
4. **La fricción es medible.** 314 denials, mediana 1 por sesión afectada y máximo 15.
   195 fueron de Bash, con un falso positivo estructural: el gate deniega cualquier
   comando con `>` sin validar el destino de la redirección.

## Decisión

La capa de orquestación queda **opt-in y desactivada por defecto**.

- El código del paquete ya lo era: `npx @devground/sdd` instala solo la skill spec-flow,
  y `devground-orchestration` es un bin separado que copia archivos pero exige el merge
  manual del bloque de hooks. **Esto no cambia.**
- Lo que cambia es la **documentación**, que la presentaba como parte del paquete: el
  README de la raíz decía que `@devground/sdd` "además instala la capa de orquestación".
  Pasa a declararse explícitamente como extra opt-in desactivado por defecto, con las
  consecuencias medidas enlazadas desde el punto de instalación.
- La medición queda registrada en `orchestration/README.md` junto a los tres defectos
  abiertos, de modo que quien evalúe activarla decida con los números a la vista.

No se revierte ADR-0027 ni se despublica nada: la capa sigue versionada, testeada e
instalable. Se corrige su **encuadre**, de componente incluido a extra deliberado.

## Consecuencias

**Positivas**
- Quien instala `@devground/sdd` obtiene spec-flow sin heredar un control cuyo beneficio
  no está demostrado.
- Los defectos abiertos quedan documentados donde se toma la decisión de activar, no
  enterrados en un análisis de sesión.
- `spec-flow` recupera el camino de ejecución que el hook de contexto le estaba quitando.

**Negativas / Trade-offs**
- Vuelve el riesgo que ADR-0027 §Contexto quería mitigar: sin el gate activo, nada obliga
  mecánicamente a delegar, y la disciplina vuelve a depender de la instrucción en
  `CLAUDE.md`. Se acepta a conciencia: una regla que cuesta 10% más por turno y mata la
  skill que respalda no se sostiene por su enforcement.
- La capa queda en un estado intermedio (versionada pero no recomendada) hasta que se
  resuelvan los tres defectos abiertos.

## Trabajo pendiente antes de recomendar la activación

1. Validar el destino de las redirecciones en `orchestrator-gate.sh` con el mismo criterio
   de rutas que ya se aplica a `rm/mv/cp/mkdir/touch/chmod`, en vez de denegar todo `>`.
2. Rediseñar `orchestrator-context.sh` para que la clasificación con `spec-flow` sea el
   primer paso del ruteo, no un paréntesis dentro de él.
3. Sacar Tier 0-1 de la delegación obligatoria.

## Alternativas consideradas

1. **Mantener el gate activo y solo arreglar los defectos**: descartada por ahora. Los
   defectos son reales pero el problema de fondo — sin ahorro por unidad de trabajo — no
   se resuelve corrigiendo falsos positivos. Primero se mide sin el control, después se
   decide si vuelve.
2. **Eliminar la capa del paquete**: descartada. Revertiría ADR-0027 y reintroduciría el
   bus factor 1 sobre artefactos que funcionan y están testeados. El problema es el
   encuadre por defecto, no la existencia.
3. **Editar ADR-0027 en vez de suceder**: descartada por la convención de `docs/adr/README.md`
   (un cambio de decisión requiere un ADR nuevo).

## Referencias

- [ADR-0027 — Empaquetar la regla de orquestación en `@devground/sdd`](0027-empaquetar-regla-de-orquestacion.md) (matizado por este ADR: la capa sigue empaquetada, pero opt-in)
- [ADR-0022 — Jerarquía de orquestación de agentes en sesiones interactivas](0022-jerarquia-de-orquestacion.md)
- [ADR-0026 — Declarar el núcleo soportado y entrar en fase de consolidación](0026-fase-de-consolidacion-nucleo-soportado.md) (§4 bus factor, motivación original de ADR-0027)
