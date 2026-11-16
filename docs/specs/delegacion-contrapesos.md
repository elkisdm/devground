# Agregar contrapesos a la medición de la delegación

**Classification**: feat · medium · low risk · known · toca `~/.claude/scripts/{delegacion-medicion,encargar}.py`
**Tier**: 2 — Standard
**Origen**: sigue a `docs/specs/delegacion-critico-y-externos.md` (ADR-0049)

## Goal

Que bajar la proporción del crítico no pueda esconder una caída de calidad, que las
revisiones genéricas en modelos caros sean visibles, y que `encargar.py disponibles` no
ofrezca un ejecutor que acaba de responder sin cupo.

## Contexto medido (2026-11-16, 7 días)

- Subagentes: 60 % de todos los tokens; `ejecutor-critico` 25 % del total; `general-purpose`
  8,5 %, casi todo revisiones y auditorías lanzadas con `opus` o `fable` explícito.
- Un solo lanzamiento genérico sin `model` desde el 2026-10-01: la regla G-1 no explica ese gasto.
- `disponibles` mostró «apto» a un ejecutor que segundos antes devolvió `cupo`.

## Parámetros (ya escritos en `~/.claude/delegacion.json`; no editarlo)

`medicion.patron_revision`, `medicion.patron_arreglo`, `medicion.patron_rechazo_critico`,
`medicion.arreglos_max_por_100_ejecutores`, y `ejecutores_externos_memoria_cupo_horas`. Si
faltan, cada script usa por defecto los mismos valores de ese archivo.

## Spec

### A — `delegacion-medicion.py`

**A-1 Revisiones genéricas.** Sección nueva «Revisiones y auditorías genéricas»: lanzamientos
de `general-purpose`, `claude` o sin tipo cuyo `description` calza con `patron_revision`, por
modelo pedido en la llamada; tokens de esos subagentes y su parte del total de tokens de
subagentes. Para unir lanzamiento y consumo se usa el `description` del `.meta.json` del
subagente (mismo criterio de patrón sobre `agentType` genérico).

**A-2 Contrapeso de calidad.** Sección nueva «Calidad»:
- Rondas de arreglo: lanzamientos de `ejecutor*` cuyo `description` calza con
  `patron_arreglo`; total, y por cada 100 lanzamientos de `ejecutor*`, contra
  `arreglos_max_por_100_ejecutores` («dentro» / «sobre el umbral»).
- Rechazos del crítico: subagentes `ejecutor-critico` cuyo último mensaje de texto del
  asistente calza con `patron_rechazo_critico`.
- Con cero lanzamientos de `ejecutor*` no divide ni marca umbral.

**A-3 Muestra de invariantes.** Opción `--invariantes`: imprime, uno por línea, fecha (hora de
Chile), proyecto y el texto de la línea que calzó con `gate.patron_invariante` de cada
lanzamiento de `ejecutor-critico` en la ventana. El informe normal muestra solo los 5 más
recientes bajo la sección del crítico.

**A-4 Caché y hook.** `--guardar` incluye las secciones nuevas. `--hook` agrega una segunda
causa de aviso: rondas de arreglo sobre su umbral («Delegación: N rondas de arreglo por cada
100 ejecutores (umbral M). Detalle: …»). Sigue imprimiendo a lo más una línea (prioridad: el
crítico), sin abrir transcripts y en menos de 1 s. Una caché sin las claves nuevas no falla.

Escenarios:
- GIVEN 3 genéricos «Revisión X» en opus y 1 «Buscar Y» en sonnet WHEN se mide THEN la sección
  de revisiones cuenta 3 en opus y no cuenta el de búsqueda.
- GIVEN 10 lanzamientos de ejecutores, 3 con «Corregir hallazgos» y umbral 20 WHEN se mide
  THEN informa 30 por cada 100 y «sobre el umbral»; con 1 de 10, «dentro».
- GIVEN un crítico cuyo último texto dice «no es una tarea crítica» WHEN se mide THEN cuenta 1
  rechazo; un crítico que lo dice en un mensaje intermedio y termina con otro texto no cuenta.
- GIVEN críticos con `Invariante: A → B` WHEN `--invariantes` THEN lista «A → B» con fecha y
  proyecto; sin críticos, no imprime filas y sale con 0.
- GIVEN caché vieja sin claves nuevas WHEN `--hook` THEN sale con 0 sin error.

Invariantes: **M-5** la sección de revisiones nunca cuenta agentes no genéricos (`ejecutor`,
`Explore`, `planner`). **M-6** el contrapeso de calidad con cero ejecutores no divide por cero.

### B — `encargar.py disponibles`

Un ejecutor es `apto` solo si, además de lo actual, su última fila en `$ENCARGOS_REGISTRO`
dentro de las últimas `ejecutores_externos_memoria_cupo_horas` horas no tiene estado `cupo`
ni `no-responde`. Si la tiene, muestra «no apto · sin cupo en el último encargo (<fecha en
hora de Chile>)» y en `--json` agrega `ultimo_estado` y `ultimo_fecha`. Una fila posterior
`ok` lo vuelve apto. Registro ausente, vacío o con filas mal formadas → se ignora.

Escenarios:
- GIVEN última fila de `x` = `cupo` hace 1 h WHEN `disponibles` THEN `x` no apto con la fecha.
- GIVEN esa misma fila hace 30 h (memoria 24 h) THEN apto.
- GIVEN `cupo` y después `ok` THEN apto.
- GIVEN registro corrupto THEN no falla y decide como antes.

Invariante: **E-6** `lanzar` no consulta esta memoria: siempre intenta su sonda o su lectura
de cupo real (la memoria solo informa a `disponibles`).

## Pre-mortem

- **Caminos**: informe en texto, `--json`, `--guardar`, `--hook`, `--invariantes` → cubiertos.
- **Fallas**: patrón inválido en el JSON → usar el valor por defecto y seguir; `.meta.json`
  ausente → ese subagente no entra en revisiones.
- **Invariantes**: M-5, M-6, E-6 con su prueba, verificados en ambos sentidos.
- **Simetrías**: los umbrales nuevos se leen igual que los del crítico.
- **Reutilización**: el lector de lanzamientos, de consumo y del registro ya existen en cada script.
- **Consumidores**: la caché la lee solo `--hook`; el `--json` no tiene otros lectores.
- **Datos reales**: títulos en español e inglés mezclados («Re-review», «Revisión»): el patrón
  cubre ambos; un título vacío no calza.
- **Variantes**: `DELEGACION_CONFIG`, `ENCARGOS_REGISTRO`, `CLAUDE_PROJECTS`.
- **Afirmaciones**: README de orquestación (sección «Delegación medida») → agregar una línea
  por pieza nueva; lo hace el orquestador.

## Ejecución

| # | Tarea | Agente | Modelo · esfuerzo | Archivos | Entrega |
|---|-------|--------|-------------------|----------|---------|
| 1 | Revisiones, calidad e invariantes en la medición (A) | ejecutor | sonnet · medium | `~/.claude/scripts/delegacion-medicion.py`, `delegacion-medicion.test.py` | pruebas verdes |
| 2 | Memoria de cupo en `disponibles` (B) | ejecutor | sonnet · medium | `~/.claude/scripts/encargar.py`, `encargar.test.py` | pruebas verdes |

Sin fila crítica (no hay invariante de auth, dinero, dato irreversible ni contrato externo) y
sin fila externa (Codex y Cursor sin cupo hoy).

## Out of scope

- Pasar las revisiones genéricas por el hook (decisión pendiente del usuario; hoy solo se miden).
- Cambiar G-1.

## Closing check

- A-1 a A-4 y M-5, M-6 → `delegacion-medicion.test.py` (65 pruebas; M-5 y M-6 vistos fallar sin su guard).
- B y E-6 → `encargar.test.py` (50 pruebas; el filtro de memoria y E-6 vistos fallar al mutarlos).
- Corrida real (7 días al 2026-11-16): 106 revisiones genéricas (62 en opus, 42 en fable, 2 en sonnet), 6,7 % de los tokens de subagentes; 44 rondas de arreglo, 7,3 por cada 100 ejecutores (umbral inicial 20); 0 rechazos del crítico. `disponibles` real marca no aptos a los dos ejecutores que devolvieron `cupo` ese día.
- `npm test` de `packages/sdd` en verde. No se corrió la suite completa del monorepo.
- Desviaciones: `--invariantes` separa con tabuladores y nombra el proyecto por su carpeta de transcripts; el umbral de arreglos del hook se lee de la configuración.
