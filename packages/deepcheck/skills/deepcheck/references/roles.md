# Los 3 roles de deepcheck y sus dimensiones

> Este documento es la **rúbrica legible**. El ejecutable es
> `workflows/deepcheck.workflow.js`. Si cambias dimensiones aquí, refléjalo allá
> (y viceversa) — deben mantenerse en sincronía.

Los tres roles son **ortogonales** a propósito: si se solapan, el sistema hace
trabajo redundante y diluye la señal. Cada uno responde una pregunta distinta.

| Rol | Pregunta | Naturaleza |
|-----|----------|------------|
| **QA** | ¿La feature **funciona**? | Comportamiento observable: caminos, edge cases, errores. |
| **Validación** | ¿Es lo que se **pedía**? | Intención: contra requisitos, contratos, reglas de negocio. |
| **Auditoría** | ¿Está **bien construida**? | Calidad interna: seguridad, performance, deuda, conformidad con ADRs. |

---

## QA — ¿funciona?

| Dimensión | Qué revisa |
|-----------|-----------|
| `qa-happy` | El camino feliz de cada modo de uso produce el resultado esperado. |
| `qa-edge` | Casos límite: entradas vacías, ausentes, límites, estados raros. |
| `qa-errors` | Manejo de errores y códigos de salida: ¿falla con gracia? ¿mensajes claros? ¿exit codes correctos? |

## Validación — ¿es lo que se pedía?

| Dimensión | Qué revisa |
|-----------|-----------|
| `val-requirements` | El comportamiento real cumple lo que el README/docs prometen (claims explícitos). |
| `val-contracts` | Contrato externo: flags, opciones, versión reportada, forma de la salida — coherentes y honestos. |

## Auditoría — ¿está bien construida?

Usa los **ADRs de devground** como rúbrica de cumplimiento.

| Dimensión | Qué revisa | ADR base |
|-----------|-----------|----------|
| `aud-security` | Inyección de comandos, path traversal, manejo de secretos, validación de entrada. | 0007–0009 |
| `aud-perf` | I/O bloqueante innecesario, trabajo redundante, complejidad algorítmica. | — |
| `aud-limits` | Tamaño de módulo/función; complejidad excesiva. | 0010 |
| `aud-types` | `any` en fronteras externas; tipos laxos en límites. | 0011 |
| `aud-tests` | Cobertura de tests en rutas críticas. | 0012 |

---

## Verificación adversarial (no opcional)

Cada hallazgo de cualquier dimensión pasa por **refutadores independientes** con
lentes distintas antes de confirmarse. Un hallazgo solo entra al reporte como
**confirmado** si la mayoría de refutadores NO logra refutarlo. Los demás van a
**descartados** con la razón — nunca se ocultan.

Esto existe porque un auditor que reporta falsos positivos se vuelve ruido y se
abandona. El filtro adversarial es el corazón del sistema, no un adorno.

## Auto-mejora (Fase 2 — destilación)

Al cerrar una corrida, un agente destilador escribe/actualiza
`.claude/skills/audit-<flujo>/SKILL.md` con: invariantes confirmadas, falsos
positivos ya descartados (con fecha + razón), y edge cases descubiertos. La
próxima corrida arranca desde ese piso.

**Anti-ceguera:** las supresiones llevan fecha y razón; el destilador re-valida
las supresiones viejas en vez de confiar en ellas indefinidamente. Una skill que
solo acumula "ignora esto" termina ciega a regresiones reales.
