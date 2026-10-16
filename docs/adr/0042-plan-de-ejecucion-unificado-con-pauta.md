# ADR-0042: Plan de ejecución unificado con Pauta

- **Estado**: Aceptado
- **Fecha**: 2026-10-15
- **Decisor**: edaza
- **Aplica a**: skill spec-flow (Paso 3.5 y Paso 4), skill `casos`, hooks de devlog y CHANGELOG, proyectos registrados en Pauta (hoy `ATL` y `CLA`)
- **Extiende**: [ADR-0040](0040-plan-de-ejecucion-por-agentes-y-contexto-acotado.md) (plan de ejecución por agentes)
- **Reemplaza en parte**: [ADR-0038](0038-trabajo-por-builds-con-gate-verificable.md) (builds): la estructura de Builds y sprints pasa a Pauta; ver "Qué se conserva del ADR-0038"

## Contexto

Desde el 15-oct-2026 el trabajo de desarrollo de Atlas y Claudia IA se registra en Pauta
(pauta-ci.netlify.app), el registro de desarrollo que usa el equipo de Hubix. Pauta modela el trabajo
como **ítems** con clave (`ATL-12`), con un **destino por plataforma** (api, web, mcp…), cada uno con
su estimación, su responsable y su cierre con evidencia; los agrupa en **Épicas** y **Builds**
(sprints) y pondera el avance por el tiempo estimado.

devground ya resuelve parte de lo mismo de otra forma: spec-flow produce el brief y, en Tier 2–3, una
tabla `### Ejecución` que asigna cada tarea a un agente y un modelo según su naturaleza (ADR-0040).
Los ADR viven en el repo. El piloto de builds (ADR-0038) agrega un gate de salida verificable contra
producción.

El usuario decidió el 15-oct:

1. El brief vive en el ítem como informe adjunto, con la estructura de spec-flow.
2. La fuente principal de las decisiones es el ADR del repo; en Pauta se registra como decisión.
3. Se adopta la estructura de Builds y sprints de Pauta.
4. El plan de ejecución, los destinos y las estimaciones se mezclan: lo mejor de los dos.
5. Los hooks deben poder escribir en Pauta.

Lo que este ADR resuelve es el punto 4 y cómo se conectan los demás, sin registrar dos veces lo mismo.

## Decisión

**Un cambio de spec-flow es un ítem de Pauta. Pauta lleva qué se hace, cuánto pesa y dónde quedó;
devground lleva cómo se hace y con qué agente.**

### 1. Unidad de trabajo

| Tier | En Pauta                                                                                                                                                                        |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | Sin ítem. Si el cambio toca un ítem existente, un comentario en él                                                                                                              |
| 1    | Ítem con el brief corto en su texto                                                                                                                                             |
| 2–3  | Ítem con el brief completo como informe adjunto (`adjuntar_informe`, título `Brief · <título>`); si el brief cambia, `proponer_version_de_documento` (la spec se mueve primero) |

Si el pedido ya tiene ítem, se usa ese; no se crea otro.

### 2. Tabla de ejecución extendida

La tabla del Paso 3.5 suma dos columnas, **Destino** y **Estimación**:

```
### Ejecución
| # | Tarea | Destino | Estimación | Agente | Modelo · esfuerzo | Archivos | Entrega |
|---|-------|---------|------------|--------|-------------------|----------|---------|
| 1 | Migración + modelo | api | 2h | ejecutor-critico | opus · high | `db/0042_*.sql` | diff + tests |
| 2 | Endpoint | api | 2h | ejecutor | sonnet · medium | `api/users.ts` | diff + tests |
| 3 | Pantalla | web | 1d | ejecutor | sonnet · medium | `app/users/*` | diff + tests |
```

- **Destino** es la plataforma del proyecto en Pauta. Cada tarea pertenece a un solo destino; un
  destino puede tener varias tareas.
- **Estimación** se pone por tarea. La del destino es la suma de sus tareas y es la que se informa a
  Pauta (`estimar`). Ver "Escala de estimación".
- **Agente y modelo** quedan solo en el brief. Pauta no ve los subagentes: el responsable del
  destino en Pauta es la sesión orquestadora (agente `claude`) o una persona. Así no se mezcla el
  costo y la calidad, que decide devground, con la visibilidad, que da Pauta.
- En Tier 1 (sin tabla) se estima cada destino directamente.

### 3. Ciclo de vida

| Momento                             | spec-flow     | Pauta                                                                                                                                               |
| ----------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brief listo                         | Paso 3        | `crear_item` (o reutilizar), `adjuntar_informe` (Tier 2–3), `estimar` por destino, `asignar` a `claude`, `agregar_al_sprint` si hay un Build activo |
| Se despacha una tarea               | Paso 3.5      | `cambiar_estado` del destino a `in_progress`                                                                                                        |
| Se integra una tarea                | Paso 4        | `comentar`: una línea por tarea (qué, tests, desvío si lo hubo)                                                                                     |
| Decisión durante el cambio          | —             | `registrar_decision` (ver punto 5)                                                                                                                  |
| PR abierto o mergeado sin desplegar | —             | comentario con el PR; el destino sigue abierto                                                                                                      |
| Destino en producción               | Closing check | `cerrar_destino` con el nivel real alcanzado                                                                                                        |

### 4. Nivel de evidencia al cerrar

Se cierra con el nivel comprobado, nunca con el deseado:

| Nivel de Pauta     | Cuándo                                                                                                |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| `minor_change`     | Tier 0 o un cambio de texto o estilo (nunca un error)                                                 |
| `compiles`         | Solo typecheck o build                                                                                |
| `measured_in_code` | Closing check completo con la suite en verde                                                          |
| `tested`           | Además, probado funcionando: E2E, QA local o staging                                                  |
| `measured_in_prod` | Además, verificado en producción, en el dominio real que usa el usuario, con el interruptor encendido |

En plataformas de entrega continua (api, web, mcp) se cierra sin Build con la referencia del PR o el
commit.

### 5. Decisiones

El ADR se escribe en el repo con el flujo de siempre. Cuando pasa a **Aceptado**, se registra en
Pauta con `registrar_decision` (título `ADR-NNNN: <título>`, qué, por qué, medición si la tiene y las
claves de los ítems que la originan). Un ADR que reemplaza a otro registra la decisión nueva con
`reemplaza_a`. Una decisión menor que no amerita ADR se registra solo en Pauta.

### 6. Nomenclatura

La clave del ítem va en la rama (`feat/ATL-12-slug`), en cada commit (`feat(api): … (ATL-12)`) y en
el título del PR. Es lo que permite al hook saber a qué ítem pertenece un commit, y coincide con lo
que ya pide el CRM (N-115).

### 7. Hooks

Los hooks de commit (PostToolUse) y de inicio de sesión (SessionStart; el de cierre no puede inyectar contexto porque la sesión ya terminó) **no llaman a Pauta directamente**: detectan la clave en la
rama o el commit e inyectan en el contexto la instrucción de comentar en ese ítem, y la sesión lo
hace por el MCP (que ya está autenticado). Así no hace falta guardar una credencial de Pauta en un
script. Implementación: `~/.claude/scripts/pauta-item-context.sh`.

### 8. Qué se conserva del ADR-0038

La estructura (Builds, sprints, avance ponderado) pasa a Pauta. Se conservan tres principios:

- **Mergear no es desplegar**: un destino de api, web o mcp no se cierra hasta estar en producción
  (punto 3).
- **La métrica de negocio**: una Épica de Pauta declara en su objetivo la métrica de salida y su meta.
- **El verificador contra producción**: pasa a ser el criterio de cierre de una Épica con métrica
  de negocio. La Épica se cierra cuando el verificador confirma la meta en producción; un criterio
  sin dato cuenta como no cumplido, igual que en el ADR-0038.

### 9. Escala de estimación

Escala fija ligada al tamaño que spec-flow ya clasifica, para que las estimaciones sean comparables
entre sesiones: **XS = 30m, S = 2h, M = 1d, L = 3d** (un día = 8 h, como en Pauta). Una tarea más
grande que L se divide antes de despachar.

Las cuatro decisiones abiertas (escala, momento del cierre, verificador y mecanismo de los hooks) las
tomó el usuario el 15-oct con la opción propuesta.

## Consecuencias

- Giovanni y el equipo ven en Pauta el avance real de Atlas y Claudia sin pedir reportes.
- El brief deja de vivir solo en el repo o en la conversación: queda versionado en el ítem.
- spec-flow agrega dos columnas y unas llamadas al MCP; el costo por cambio sube poco y solo desde
  Tier 1.
- Si Pauta deja de estar disponible, el trabajo sigue: el brief y los ADR siguen en el repo, y lo
  que faltó registrar se completa después.

## Alternativas descartadas

- **Que cada subagente reporte a Pauta**: arrancan sin el contexto del ítem y repartirían el registro
  entre varios agentes; el orquestador ya integra los resúmenes (ADR-0040).
- **Mantener los builds del ADR-0038 en paralelo a los de Pauta**: dos tableros para lo mismo.
- **Mover los ADR a Pauta**: los ADR viven junto al código que los aplica, y el código gana.
