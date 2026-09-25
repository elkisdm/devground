# ADR-0038: Agrupar el trabajo en builds con un gate de salida verificable

- **Estado**: Propuesto
- **Fecha**: 2026-09-24
- **Decisor**: elkisdm
- **Aplica a**: cualquier proyecto que despliegue a producción con devground (piloto en paralelo: Claudia IA y Atlas Engine)
- **Extiende**: [ADR-0030](0030-delegacion-opt-in-por-peticion.md) (spec-flow por petición), [ADR-0036](0036-review-como-definition-of-done.md) (review en la Definition of Done)

## Contexto

spec-flow ordena cada **cambio**: lo clasifica, le asigna un tier y produce un brief antes del
código. Lo que no ordena es el nivel de arriba: **qué tiene que estar listo, en conjunto, para
que algo salga a producción y mueva una métrica de negocio**. Sin ese nivel, en Claudia IA pasó
lo siguiente en una sola semana (24-sep-2026):

- Se construyó rápido y se agendaron 256 reuniones a US$4 cada una, pero lo que decide el negocio
  (que el cliente asista y que reserve) quedó a medias: la recuperación de no-shows detrás de un
  interruptor, 0 de 1.352 plantillas de WhatsApp con acuse de entrega y el 81,5 % de los
  recordatorios saliendo.
- La operación se cortó sin aviso: ElevenLabs sin créditos dos veces, Twilio suspendido y el CI
  bloqueado por facturación de GitHub desde el 10-sep sin que ningún gate lo notara.
- Había cambios "terminados" (mergeados) que no estaban realmente en producción, o que estaban
  en producción con el interruptor apagado.

El 24-sep se probó en Claudia un nivel macro: **builds** con criterios verificables contra
producción y un porcentaje que tiene que llegar a 100 % antes de desplegar (tablero y verificador
en `~/.claude/ops/claudia/builds/`). En su primera corrida, el verificador encontró cosas que
nadie sabía: un interruptor que se creía apagado estaba encendido, el cron de saldos de
proveedores había dejado de registrar y solo el 58 % de las ventas del CRM tenía monto. El mismo
día el usuario pidió aplicarlo también en Atlas y volverlo estándar de devground. Atlas aporta
lo que Claudia no tiene: varios desplegables por build (API, web, MCP con despliegue manual),
interruptores que se encienden aparte y la falta de una forma de verificar qué commit corre.

## Decisión

**Todo trabajo que va a producción pertenece a un build. Un build se despliega solo cuando el
100 % de sus criterios verificables se cumple, y su registro vive en el repo.**

1. **Qué es un build.** Un contenedor macro con código (`B1`, `B2`…), nombre, objetivo de
   negocio, **una** métrica de salida medible (con su meta, aprobada por el dueño, y lo que la
   métrica **no** mide cuando es un proxy) y sus criterios. La definición completa y la plantilla
   están en [docs/metodologia-builds.md](../metodologia-builds.md).
2. **El registro es el repo.** Cada build es `docs/builds/<codigo>.md`, con el estado del ciclo
   de vida en el frontmatter y la historia en git. El verificador vive versionado en el mismo
   repo. Cualquier tablero (por ejemplo, un artifact) es una **vista** generada desde el repo,
   nunca el registro.
3. **Criterios, en dos grupos.** Los **de salida** forman el porcentaje y son el gate para
   desplegar. Los **de despliegue** (`<b>-desplegado` y, si aplica, `<b>-interruptor`) no suman
   al porcentaje: definen el paso de `listo` a `desplegado`. Cada criterio es automático (una
   función del verificador con el mismo id, que mide contra producción) o manual (juicio o
   aprobación, con un formato fijo de estado, nombre, fecha y evidencia). Todos pesan igual. Un
   automático que no se pudo medir, o que el verificador no tiene permiso de leer, queda
   `sin_dato`: cuenta como no cumplido y nunca se marca a mano.
4. **Criterios comunes obligatorios** en todo build. De salida: dueño asignado, metas aprobadas y primera medición de la métrica revisada (un número medible puede estar roto), forma de volver atrás escrita, CI en verde y métrica de salida medible. De
   despliegue: cada desplegable en producción exponiendo su commit, e interruptor encendido
   cuando el build sale detrás de uno.
5. **"Desplegado" significa que todas las piezas están en producción**: mergeado, cada
   desplegable corriendo el commit de salida del build o uno posterior (el build anota
   `commit_salida` al pasar a `listo`; el verificador comprueba que contenga el merge de cada PR
   del build y que sea ancestro del commit que expone cada desplegable) e interruptor encendido.
   Mergear no es desplegar.
6. **Ciclo de vida:** `abierto` → `listo` (criterios de salida al 100 %) → `desplegado`
   (criterios de despliegue cumplidos) → `vigilado` (la métrica de
   salida se sigue midiendo) → `cerrado`, o `reabierto` si la métrica cae bajo la meta durante
   una semana. También `descartado`, con una decisión escrita.
7. **Relación con spec-flow.** El build es el gate de salida; no reemplaza a spec-flow. Cada
   cambio dentro de un build sigue pasando por spec-flow con su tier (el tier gradúa la spec del
   cambio, no el build). El brief declara a qué build pertenece, y el criterio del build enlaza
   la spec o el PR que lo cumple. No hay worktree por build: cada cambio sigue en su rama o
   worktree y su PR.
8. **Verificador.** Credenciales solo por variables de entorno, con usuarios de solo lectura y
   consultas de solo lectura; nunca lee secretos desde archivos de otros repos. Corre con una
   identidad que pueda leer todo lo que mide: "sin permiso" es `sin_dato`. Devuelve, por
   criterio, `estado` (`cumple`, `no_cumple` o `sin_dato`), `valor`, `detalle` y
   `verificado_at`. Un test de paridad garantiza que cada criterio automático del `.md` tiene su
   función con el mismo id (y al revés), que cada build tiene sus criterios comunes y que los ids
   son únicos entre builds.
9. **Fuera de build.** Un arreglo urgente puede salir sin build y se registra después en
   `docs/builds/fuera-de-build.md` (fecha, PR, motivo, build al que habría pertenecido).
10. **Sin pesos.** Las dependencias entre builds se declaran como un criterio de salida sobre el
    **estado** del otro build ("B1 desplegado" o "B1 cerrado"), no sobre su porcentaje. Cierra
    el build su dueño.

## Consecuencias

**Positivas**

- "Listo para producción" deja de ser una opinión: es un número que cualquiera puede recalcular.
- La métrica de negocio queda atada al trabajo técnico y se sigue midiendo después del
  despliegue, así un cambio que no movió nada se reabre en vez de darse por terminado.
- Los cortes de operación (créditos, facturación, crons muertos) aparecen como criterios en rojo
  antes de que los note un cliente.
- El historial del build queda en git junto al código que lo cumple.

**Negativas / Trade-offs**

- **Ceremonia adicional.** Mitigación: la ceremonia vive en el build, no en cada cambio; spec-flow
  sigue igual y un Tier 0 no toca el build salvo para enlazar su PR.
- **"CI en verde" puede volverse imposible por causas externas** (GitHub Actions bloqueado por
  facturación en Claudia desde el 10-sep y en Atlas desde el 21-sep). El corte no siempre se ve
  como `sin_dato`: los jobs pueden terminar en `failure` sin ejecutar pasos, y el verificador no
  distingue ese rojo de uno real. Regla: `<b>-ci` bloquea en `no_cumple` y en `sin_dato`. La
  única salida es una excepción escrita en el `.md` del build, con vencimiento de 7 días como
  máximo, aprobada por el dueño, con la **causa externa demostrada** (anotación del run o estado
  de facturación) y evidencia de la suite corrida en local (comando, commit y resultado).
  Confirmado por el usuario el 24-sep-2026.
- **Todo desplegable necesita un endpoint de versión** que exponga el commit que corre. Sin él,
  `<b>-desplegado` queda en `sin_dato` y el build no puede pasar a `desplegado`. Hoy ninguno de
  los dos pilotos lo cumple del todo: la API de Atlas responde `version="dev"` en `/health`, la web
  de Atlas (Netlify) no tiene endpoint de versión, y Claudia no expone su commit de forma
  confiable (`/api/version` se escribe a mano).
- **Claudia debe migrar su modelo:** hoy su tablero es el registro. Pasa a `docs/builds/` en su
  repo, y el tablero se regenera desde ahí.
- **El verificador de Claudia incumple el punto 8**: hoy lee un token desde el `.env` de otro
  repo. Hay que moverlo a variables de entorno con usuarios de solo lectura.

## Consecuencias a implementar (fuera de este ADR)

- Agregar a spec-flow la línea `**Build**: Bn` en el brief y el campo `build` en el evento de la
  spec. Se propone como un cambio aparte, cuando este ADR se acepte.
- Distribuir la plantilla y el test de paridad con `devground-init` para proyectos nuevos.
- Generar la vista (tablero) desde `docs/builds/` en lugar de mantenerla a mano.

## Alternativas consideradas

1. **Solo spec-flow por cambio, sin nivel macro**: es lo que había, y es lo que dejó cambios
   mergeados que no estaban en producción y métricas de negocio sin dueño.
2. **El tablero como registro** (el modelo inicial de Claudia): se ve bien y lo usa gente sin
   acceso al repo, pero pierde el historial, no se revisa en un PR y se desincroniza del código.
   Queda como vista.
3. **Criterios con peso**: se descartó porque invita a discutir pesos en vez de cumplir
   criterios, y un gate a 100 % no necesita ponderación.
4. **Checklist manual sin verificador**: más simple, pero el porcentaje dependería de que alguien
   lo mantenga, y ya se vio que lo que nadie mide termina roto sin aviso.

## Referencias

- Guía y plantilla: [docs/metodologia-builds.md](../metodologia-builds.md)
- Piloto en Claudia IA: `~/.claude/ops/claudia/builds/` (verificador y guía), memoria del proyecto `builds-de-claudia-gates`.
- Piloto en Atlas: sesión `atlas-c6`, 24-sep-2026 (worktree `atlas/core-wt-builds`, rama `chore/builds-piloto`): registro en el repo, varios desplegables, interruptores, criterios de salida y de despliegue, CI que falla por facturación, permisos del verificador, métricas proxy.
- [ADR-0030](0030-delegacion-opt-in-por-peticion.md), [ADR-0036](0036-review-como-definition-of-done.md), [ADR-0037](0037-premortem-en-la-spec-y-cota-al-ciclo-de-revision.md)
