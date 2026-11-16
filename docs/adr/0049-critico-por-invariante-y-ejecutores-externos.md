# ADR-0049: El ejecutor crítico se gana con un invariante; carril de ejecutores externos

- **Estado**: Aceptado
- **Fecha**: 2026-11-16
- **Decisor**: edaza
- **Aplica a**: skill spec-flow 0.10 (Paso 3.5), agente `ejecutor-critico`, hook `PreToolUse` de delegación, medición semanal (`@devground/sdd`)
- **Enmienda**: [ADR-0040](0040-plan-de-ejecucion-por-agentes-y-contexto-acotado.md) (la fila del crítico en la tabla de asignación) y [ADR-0044](0044-gobierno-de-agentes-seguridad-costo-y-modelos.md) (punto 1: el esfuerzo de `ejecutor` puede subirse en la llamada)
- **Extiende**: [ADR-0031](0031-modelo-explicito-al-delegar.md), [ADR-0046](0046-nucleo-publico-y-capa-de-organizacion.md)

## Contexto

Medido el 2026-11-16 sobre los transcripts desde el 2026-10-01:

- 811 lanzamientos de `ejecutor-critico` contra 2.071 de `ejecutor` y 123 de
  `ejecutor-mecanico`: 1 de cada 4 ejecutores es crítico. Cada crítico corre ~184 turnos
  contra ~78 de un `ejecutor`.
- Por título de tarea: 28 % nombra un riesgo real, 14 % claramente no lo es (interfaz, SEO,
  «corregir hallazgos», «resolver mezcla con main»), 56 % no se distingue.
- `general-purpose`: 468 de 726 lanzamientos en Opus o Fable, pese a ADR-0031.
- Ejecutores externos por suscripción: ninguna mención en spec-flow, sus referencias ni los
  ADR-0030 a 0044; solo recetas sueltas por máquina.

Causas en el texto: el criterio del crítico era una lista de temas («auth, dinero, migración,
contrato externo, concurrencia») que describe casi todo backend; no había escalón entre
sonnet·medium y opus·high; la regla «más de 5 tareas → fusiona las chicas» mandaba paquetes
enteros al crítico; las rondas de arreglo y las mezclas iban al crítico; nada medía la
proporción.

## Decisión

### 1. El crítico se gana con un invariante, no con un tema

Una fila de `### Ejecución` solo puede nombrar `ejecutor-critico` si bajo la tabla hay una
línea `Invariante (fila N): <qué debe cumplirse siempre> → <prueba que lo rompe>`, y esa misma
línea `Invariante: …` va en el encargo del agente. El crítico recibe el núcleo (la migración,
el guard, el cálculo), no el paquete. Nunca van al crítico interfaz, documentación, pruebas
sin lógica nueva, rondas de arreglo de hallazgos ni resolver mezclas. Presupuesto: una fila
crítica en Tier 2, dos en Tier 3; más se justifica en una línea. Al fusionar tareas por el
tope de 5 agentes, solo se fusionan las de la misma naturaleza.

### 2. Escalón `ejecutor` con `effort: "high"`

Para lógica delicada (estado con varios caminos, cruce de módulos, concurrencia recuperable)
se llama a `ejecutor` con `effort: "high"` en la llamada: sonnet·high, entre sonnet·medium y
opus·high. No se crea un agente nuevo.

### 3. Carril de ejecutores externos

Una fila puede nombrar un ejecutor externo (otra herramienta de agentes con su propio cupo)
solo si el overlay de la organización lo declara y la tarea es autocontenida, de archivos
disjuntos, verificable por pruebas que corre el orquestador y sin secretos ni acciones hacia
afuera. Nunca va afuera una fila crítica ni una que necesite credenciales, base de datos real
o MCP. Cada fila externa nombra su respaldo interno (`codex → ejecutor`) y, sin cupo, sin
informe o sin cambios, el orquestador lo despacha sin reintentar afuera. El encargo sale por
un script único (`encargar.py`) que crea el árbol de trabajo, bloquea el push, comprueba el
cupo y devuelve estado, informe y parche. El trabajo externo es dato hasta que el orquestador
lo verifica (informe, `diffstat`, pruebas de la fila) y cuenta dentro del tope de 5 agentes.
Qué ejecutores existen lo dice el overlay y `delegacion.json`, no el núcleo (ADR-0046).

### 4. El gate es un hook con modo configurable y falla abierta

`delegacion-gate.py` (`PreToolUse`, matcher `Agent|Task`) niega un `ejecutor-critico` sin
línea `Invariante:` y un agente genérico (`general-purpose`, `Explore`, `claude` o sin tipo)
sin `model`, con un mensaje que dice cómo corregirlo. `gate.modo` en `delegacion.json` admite
`bloquear`, `avisar` y `apagado`; `DELEGACION_GATE=off` equivale a `apagado`. Cualquier error
del hook deja pasar: es un control de costo, no de seguridad.

### 5. Medición semanal con umbrales parametrizables

`delegacion-medicion.py` informa por agente lanzamientos, turnos y tokens, la proporción del
crítico contra sus umbrales, críticos con y sin invariante, agentes genéricos por modelo,
encargos externos por estado y decisiones del gate. Al abrir sesión (`SessionStart`) avisa en
una línea si el crítico pasa los umbrales, leyendo una caché. Umbrales, modo del gate, precios
y registro de ejecutores viven en `~/.claude/delegacion.json`, no en el código.

### Dónde vive

- Punto 1 y 3 (regla): Paso 3.5 de spec-flow 0.10 y `agents/ejecutor-critico.md`.
- Puntos 3 a 5 (mecanismo): `packages/sdd/orchestration/scripts/{encargar,delegacion-gate,delegacion-medicion}.py`,
  su extracto en `settings.hooks.json` y `delegacion.example.json`.

## Consecuencias

**Positivas**

- El crítico baja al núcleo de riesgo real; el resto del paquete corre en `ejecutor`.
- Hay un escalón intermedio y un carril que usa cupos ya pagados sin tocar secretos.
- La proporción deja de ser invisible: se mide y avisa.

**Negativas / Trade-offs**

- El gate negará la primera llamada de cada sesión que no traiga la línea `Invariante:`
  (ninguno de los 813 encargos críticos históricos la usaba). Reversa inmediata:
  `gate.modo = "apagado"`.
- Un ejecutor externo no ve MCP ni secretos y su cupo es finito: por eso es opcional y con
  respaldo.
- La línea `Invariante:` la escribe el orquestador; el hook comprueba su presencia, no su
  calidad.

## Alternativas consideradas

1. **Un cuarto agente `ejecutor-senior`**: otra definición que mantener para algo que
   resuelve un parámetro (`effort` en la llamada).
2. **Mandar todo lo no crítico afuera**: el cupo semanal no alcanza y un ejecutor externo no
   ve MCP ni secretos.
3. **Solo regla escrita, sin hook**: las reglas escritas de ADR-0031 no evitaron 468
   lanzamientos genéricos en modelos caros.

## Referencias

- [ADR-0031](0031-modelo-explicito-al-delegar.md), [ADR-0040](0040-plan-de-ejecucion-por-agentes-y-contexto-acotado.md), [ADR-0044](0044-gobierno-de-agentes-seguridad-costo-y-modelos.md), [ADR-0046](0046-nucleo-publico-y-capa-de-organizacion.md)
