# Trabajo por builds

> Estado: **Propuesto** ([ADR-0038](adr/0038-trabajo-por-builds-con-gate-verificable.md)).
> Piloto en paralelo en Claudia IA y Atlas Engine; esta guía se corrige con lo que salga de ellos.

Un **build** es lo que tiene que estar listo, en conjunto, para que algo salga a producción y
mueva una métrica de negocio. spec-flow ordena cada cambio; el build ordena el conjunto y pone el
gate de salida. Se despliega solo cuando sus **criterios de salida** están al **100 %**.

## Qué tiene un build

| Campo             | Qué es                                                         | Ejemplo (Claudia)                                               |
| ----------------- | -------------------------------------------------------------- | --------------------------------------------------------------- |
| Código            | `B` + número, único en el repo                                 | `B1`                                                            |
| Nombre            | Dos o tres palabras                                            | Asistencia                                                      |
| Objetivo          | El resultado de negocio, en una frase                          | Que más clientes lleguen a la reunión que Claudia agendó        |
| Métrica de salida | **Una** métrica medible por el verificador, con meta           | ≥ 35 % de las reuniones con veredicto se hacen (últimos 7 días) |
| Límite de métrica | Qué **no** mide la métrica (obligatorio si es un proxy)        | Solo cuenta reuniones con veredicto; las de GoHighLevel no      |
| Desplegables      | Las piezas que tienen que llegar a producción                  | API, web, MCP                                                   |
| Dueño             | Quien aprueba las metas, despliega, vigila la métrica y cierra | —                                                               |
| Criterios         | De salida (forman el %) y de despliegue (no suman al %)        | Ver abajo                                                       |

## Criterios

Hay dos grupos, medidos con el mismo verificador y el mismo contrato:

- **De salida**: forman el porcentaje del build y son el gate para desplegar. % = criterios de
  salida cumplidos / total de criterios de salida. Todos pesan igual.
- **De despliegue** (`<b>-desplegado` y, si aplica, `<b>-interruptor`): **no suman al %**.
  Definen la transición `listo → desplegado`: el build está desplegado cuando se cumplen todos.

Cada criterio es de uno de dos tipos:

- **Automático**: lo mide el verificador contra producción, con una función del **mismo id**.
  Si no se pudo medir, o el verificador no tiene permiso para leer lo que mide, queda `sin_dato`,
  que cuenta como no cumplido. **Nunca se marca a mano.**
- **Manual**: requiere juicio o una aprobación externa (plantillas aprobadas por Meta, una regla
  de negocio firmada). Lo marca una persona con el formato fijo de la columna Estado (ver la
  plantilla), y la evidencia (enlace, captura, PR) va en su columna.

Además:

- **Cada criterio enlaza lo que lo cumple**: la spec de spec-flow o el PR.
- **Dependencias entre builds**: se escriben como un criterio de salida sobre el **estado** del
  otro build, no sobre su porcentaje ("B1 desplegado" o "B1 cerrado"). Estar al 100 % no significa
  que la pieza esté en producción.

### Criterios comunes (obligatorios en todo build)

| id                 | Grupo      | Tipo       | Criterio                                                                                            |
| ------------------ | ---------- | ---------- | --------------------------------------------------------------------------------------------------- |
| `<b>-dueno`        | salida     | manual     | Dueño asignado, metas aprobadas y primera medición de la métrica revisada                           |
| `<b>-volver-atras` | salida     | manual     | Forma de volver atrás escrita (qué se revierte y cómo)                                              |
| `<b>-ci`           | salida     | automático | CI en verde en `main` (ver "CI caído por causas externas")                                          |
| `<b>-metrica`      | salida     | automático | La métrica de salida se puede medir con el verificador                                              |
| `<b>-desplegado`   | despliegue | automático | Cada desplegable corre `commit_salida` o un commit posterior, verificado por su endpoint de versión |
| `<b>-interruptor`  | despliegue | automático | Interruptor encendido en producción (solo si el build sale detrás de uno)                           |

La métrica de salida **no** necesita estar en meta para desplegar (se evalúa después, en
`vigilado`); lo que se exige antes de salir es que se pueda medir. Cualquier cambio de meta se
anota en "Decisiones y excepciones".

**Una métrica puede verse medible y estar rota.** `<b>-metrica` solo comprueba que el verificador
devuelva un número, no que ese número tenga sentido. Por eso, antes de fijar la meta, la métrica se
mide una vez contra datos reales y el dueño revisa que el valor sea plausible; esa primera medición
y su revisión quedan en "Decisiones y excepciones" y son parte de `<b>-dueno`. Ejemplo del piloto
de Atlas: la contactabilidad leída desde un campo que se sobrescribe (`status_changed_at` del
espejo del CRM) daba 0 de 429; leída desde `first_contact_at` daba 76 de 429.

## Ciclo de vida

```
abierto ──salida al 100 %──▶ listo ──criterios de despliegue cumplidos──▶ desplegado ──▶ vigilado ──▶ cerrado
   ▲                                                                                        │
   └────────────────── reabierto (la métrica cae bajo la meta durante 7 días) ◀──────────────┘
descartado: con una decisión escrita en el .md
```

- **listo**: criterios de salida al 100 %.
- **desplegado**: criterios de despliegue cumplidos: mergeado + cada desplegable corriendo el
  commit de salida del build o uno posterior (no alcanza con mergear; un MCP que se despliega a
  mano cuenta aparte) + interruptor encendido. Cambiar una variable de entorno no redespliega
  solo: el criterio mira lo que corre, no lo que se configuró.
- **Commit de salida**: al pasar a `listo`, el build anota en su frontmatter el commit de `main`
  que contiene todo su trabajo (`commit_salida`). `<b>-desplegado` verifica que el commit que
  expone cada desplegable **tenga a `commit_salida` como ancestro** (es ese mismo commit o uno
  posterior). Así, un merge de otro build no deja este en rojo, y un desplegable que quedó en un
  commit anterior sí queda en rojo.
- **`commit_salida` se valida, no se confía.** Se escribe a mano, y un commit de `main` anterior a
  los PR del build daría "cumple" aunque esos PR no estén en producción. Por eso el verificador
  comprueba que `commit_salida` contenga el merge commit de **cada PR enlazado en la columna
  Evidencia** (con la misma comparación de ancestros). Si alguno falta, `<b>-desplegado` queda en
  `no_cumple`.
- **Sin endpoint de versión no hay despliegue verificable**: todo desplegable necesita exponer el
  commit que corre. Si no lo expone, `<b>-desplegado` queda en `sin_dato` y el build no puede
  pasar a `desplegado` hasta que se agregue.
- **vigilado**: la métrica de salida se mide a diario durante la ventana que fije el build
  (por defecto 14 días).
- **cerrado**: la métrica se sostuvo en meta durante la ventana. Lo cierra el dueño.
- **reabierto**: la métrica cayó bajo la meta durante 7 días seguidos. Vuelve a `abierto` con
  un criterio nuevo que explique qué se va a corregir.

## Reglas

1. **Nada entra a producción fuera de un build**, salvo un arreglo urgente, que se registra
   después en `docs/builds/fuera-de-build.md` (fecha, PR, motivo, build al que habría pertenecido).
2. **Un build se despliega con sus criterios de salida al 100 %.** Si un criterio no se puede
   cumplir, se saca con una decisión escrita en el `.md`; nunca se marca cumplido.
3. **Un criterio automático no se marca a mano.**
4. **El registro es el repo**: `docs/builds/<codigo>.md`, con historia en git. Cualquier tablero
   es una vista generada desde ahí.
5. **La métrica se sigue midiendo después del despliegue**; si cae, el build se reabre.

### CI caído por causas externas

`<b>-ci` bloquea tanto si queda `no_cumple` como `sin_dato`. Un corte externo (por ejemplo, la
facturación de GitHub) puede verse de las dos formas: los jobs a veces terminan en `failure` sin
ejecutar ningún paso. La única salida es una **excepción** escrita en el `.md` del build:

- vencimiento de 7 días como máximo, aprobada por el dueño;
- **la causa externa demostrada**: la anotación del run (por ejemplo, _"The job was not started
  because recent account payments have failed"_) o el estado de facturación;
- evidencia de la suite corrida en local: comando, commit y resultado.

Con la excepción vigente, `<b>-ci` cuenta como cumplido. Cuando vence, vuelve a bloquear.
_Punto a confirmar en el piloto._

### Qué checks mide `<b>-ci`

GitHub publica como check el nombre del **job**, no el del workflow, y un mismo nombre (`test`,
`typecheck`) puede existir en varios workflows; exigirlo por nombre no prueba que corrió el CI
correcto. Además, un workflow con filtro por ruta deja bloqueado un check requerido que nunca
corre. Por eso, **cada workflow de CI expone un job agregador con nombre único que corre
siempre** (sin filtro por ruta) y depende de los demás jobs. `<b>-ci` mide esos agregadores.

## Relación con spec-flow, tiers y worktrees

- **El build es el gate de salida; spec-flow sigue igual.** Cada cambio pasa por spec-flow con su
  tier. El tier gradúa la ceremonia de la spec del cambio, no la del build.
- **El brief declara el build**: `**Build**: B1`. El criterio del build enlaza la spec o el PR.
  _(El cambio al skill spec-flow está pendiente; ver ADR-0038, "Consecuencias a implementar".)_
- **Un build agrupa varios cambios** de distintos tiers. Un Tier 0 dentro de un build solo enlaza
  su PR.
- **No hay worktree por build.** Cada cambio sigue en su rama o worktree y su PR.

## Verificador

- Vive en el repo del proyecto (por ejemplo, `scripts/builds/verificar.*`) y se corre a pedido o
  por cron.
- **Identidad con permiso de lectura sobre todo lo que mide.** "Sin permiso" es `sin_dato`, nunca
  `no_cumple` ni `cumple`. Ojo: algunas APIs responden igual a "sin permiso" y a "no existe" (por
  ejemplo, GitHub devuelve 404 al leer la protección de una rama sin permiso de administrador);
  en ese caso el criterio queda `sin_dato`.
- **Credenciales solo por variables de entorno**, con usuarios de solo lectura. Nunca lee secretos
  desde archivos de otros repos.
- **Solo lectura en la base**: envolver las consultas en `begin read only; … rollback;` (con
  `psql`: `-c "begin read only" -c "<consulta>" -c "rollback"`), que funciona siempre. Abrir la
  sesión con `PGOPTIONS="-c default_transaction_read_only=on"` también sirve con conexión directa,
  pero **falla detrás del pooler de Supabase en modo transacción** (puerto 6543), que rechaza el
  parámetro de arranque `options`.
- **Contrato de salida**, uno por criterio automático:

  ```json
  {
    "b1-recordatorios": {
      "estado": "no_cumple",
      "valor": "81,5 %",
      "detalle": "132 de 162 recordatorios salieron (meta ≥ 95 %)",
      "verificado_at": "2026-09-24 21:40"
    }
  }
  ```

  `estado ∈ { cumple, no_cumple, sin_dato }`; `sin_dato` = no cumple.

- Cada criterio automático escribe en `detalle` la evidencia con números ("132 de 162"), no solo
  el veredicto.
- **Test de paridad**:
  1. cada criterio automático de los `.md` tiene su función con el mismo id en el verificador, y
     cada función corresponde a un criterio existente;
  2. cada build tiene todos los criterios comunes que le corresponden;
  3. los ids son únicos entre todos los builds.

  Si validas los tests rompiendo el código a propósito, desactiva las cachés de compilación (por
  ejemplo, `PYTHONDONTWRITEBYTECODE=1` en Python): un cambio del mismo largo en el mismo segundo
  puede reutilizar el archivo compilado viejo, y el test "pasa" con el código original.

## Artefactos

```
docs/builds/
  B1.md                 # un archivo por build (plantilla abajo)
  B2.md
  fuera-de-build.md     # arreglos urgentes que salieron sin build
scripts/builds/
  verificar.*           # funciones por criterio automático + contrato JSON
  verificar.test.*      # test de paridad
```

### Plantilla: `docs/builds/<codigo>.md`

```markdown
---
codigo: B1
nombre: Asistencia
estado: abierto # abierto | listo | desplegado | vigilado | cerrado | reabierto | descartado
dueno: ''
metrica_salida: 'Reuniones con veredicto que se hacen, últimos 7 días'
meta: '≥ 35 %'
limite_metrica: 'Solo cuenta reuniones con veredicto; las de GoHighLevel no tienen veredicto'
ventana_vigilancia_dias: 14
desplegables: [api, web] # piezas que tienen que estar en producción
interruptor: '' # nombre del interruptor, si el build sale detrás de uno
commit_salida: '' # commit de main con todo el trabajo del build; se anota al pasar a listo
abierto_el: 2026-09-24
---

# B1 · Asistencia

**Objetivo**: que más clientes lleguen a la reunión que Claudia agendó.

## Criterios de salida (forman el %)

| id                 | Tipo   | Criterio                                           | Evidencia (spec / PR) | Estado    |
| ------------------ | ------ | -------------------------------------------------- | --------------------- | --------- |
| b1-recordatorios   | auto   | ≥ 95 % de los recordatorios salen                  |                       | —         |
| b1-plantillas-meta | manual | Plantillas aprobadas por Meta                      |                       | pendiente |
| b1-dueno           | manual | Dueño, metas aprobadas y primera medición revisada |                       | pendiente |
| b1-volver-atras    | manual | Forma de volver atrás escrita                      |                       | pendiente |
| b1-ci              | auto   | CI en verde en main                                |                       | —         |
| b1-metrica         | auto   | La métrica de salida se puede medir                |                       | —         |

## Criterios de despliegue (no suman al %)

| id            | Tipo | Criterio                                             | Evidencia | Estado |
| ------------- | ---- | ---------------------------------------------------- | --------- | ------ |
| b1-desplegado | auto | Cada desplegable corre commit_salida o uno posterior |           | —      |

<!-- Estado de un criterio manual, con formato fijo para que el % se recalcule por máquina:
     "pendiente" o "cumple AAAA-MM-DD <quién>". La evidencia va en su columna.
     Los automáticos muestran "—": su estado lo escribe el verificador. -->

## Decisiones y excepciones

<!-- criterios sacados del build, excepciones de CI con vencimiento y causa, cambios de meta -->

## Historial

<!-- fecha · cambio de estado · quién -->
```

## Lo que sigue en borrador

- La regla de CI caído por causas externas (excepción de 7 días).
- La ventana de vigilancia por defecto (14 días) y el umbral de reapertura (7 días bajo la meta).
- Cómo se genera la vista (tablero) desde `docs/builds/`.
- El cambio a spec-flow (`**Build**: Bn` en el brief y el campo `build` en el evento de la spec).
- La distribución con `devground-init`.
