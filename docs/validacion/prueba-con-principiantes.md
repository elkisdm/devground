# Prueba con principiantes

Guía para observar a cinco principiantes instalando devground y completando un cambio con su agente de IA. Las pruebas automáticas dicen si devground funciona. Esta prueba dice si a un principiante le sirve: dónde se atasca, qué controles apaga y cuánta ayuda necesita.

## Qué queremos saber

1. ¿Puede instalarlo solo, siguiendo el README?
2. Cuando un control lo bloquea, ¿entiende qué pasó y lo resuelve sin apagarlo?
3. ¿Termina el cambio? ¿Cuánto tarda y cuánta ayuda pide?
4. ¿Siente que entiende mejor lo que construyó, o que el proceso le estorbó?

## Participantes

- **Cinco personas.** Con cinco ya aparecen la mayoría de los problemas de uso. Más personas repiten lo mismo.
- **Perfil:** construye o quiere construir con IA (Claude Code, Cursor u otro agente) y tiene poca o ninguna experiencia programando. Idealmente, menos de un año.
- **Que no te conozcan de cerca ni sepan qué es devground.** Así no intentan quedar bien.
- Mezcla: al menos dos que nunca hayan usado git desde la terminal.

## Preparación (una vez)

1. **Proyecto de partida.** Crea un proyecto Next mínimo (`npx create-next-app@latest`; cuando pregunte por el linter, elige ESLint), súbelo a un repo y deja en `app/page.tsx` un texto con comillas sin escapar, por ejemplo `<p>Bienvenido a "Mi tienda"</p>`. Ese es el **bloqueo sembrado**: cuando el participante edite esa página, el lint del pre-commit debería detener el commit.
2. **Ensayo obligatorio.** Haz tú la sesión completa en una máquina limpia. Confirma que el bloqueo sembrado aparece de verdad. Si no aparece, cambia el disparador antes de citar a nadie: la prueba depende de que cada participante vea al menos un bloqueo.
3. **Máquina de cada participante:** Node 22.22.1 o más nuevo, git y su agente de IA de siempre, con su propia cuenta. No instales devground: eso es parte de la prueba.
4. **Grabación:** pide permiso para grabar pantalla y voz. Sin grabación, toma notas con la hora de cada evento.

## La sesión (60 minutos)

| Minuto | Qué pasa                                                                                                                                                                                                     |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0–5    | Bienvenida. Explica que se prueba la herramienta y no a la persona, y pídele que piense en voz alta.                                                                                                         |
| 5–20   | **Tarea 1: instalar.** Le das el link del README de devground y el proyecto de partida. Le dices: «Instala esto en el proyecto».                                                                             |
| 20–45  | **Tarea 2: un cambio.** Le dices: «Cambia el texto de bienvenida de la página principal por uno tuyo y agrega un botón de contacto. Después guarda el cambio en git con un commit; el mensaje lo eliges tú». |
| 45–55  | Preguntas finales (abajo).                                                                                                                                                                                   |
| 55–60  | Cierre y agradecimiento.                                                                                                                                                                                     |

La tarea 2 provoca dos bloqueos naturales: el lint del texto sembrado y el formato del mensaje, si escribe uno libre como «cambios». No le avises que vienen.

### Reglas para quien observa

- **No ayudes.** Si te pregunta, devuélvele la pregunta: «¿Qué harías si yo no estuviera?».
- **Ayuda solo cuando lleve 5 minutos detenido sin avanzar.** Anota cada ayuda: la hora, qué dijiste y por qué.
- No expliques devground antes ni durante la sesión. Lo que haga falta explicar es justo lo que hay que medir.
- Si le pide al agente que desactive un control, **no lo detengas**: anótalo. Es el dato más importante de la prueba.

## Qué anotar

Por cada participante, completa esta hoja:

| Dato                                                                                                                     | Valor |
| ------------------------------------------------------------------------------------------------------------------------ | ----- |
| Instaló solo (sí / con ayuda / no)                                                                                       |       |
| Minutos hasta terminar la instalación                                                                                    |       |
| Bloqueos que vio (cuáles)                                                                                                |       |
| Por cada bloqueo: ¿entendió qué pasó? (sí / a medias / no)                                                               |       |
| Por cada bloqueo: ¿lo resolvió sin apagar el control?                                                                    |       |
| Controles que desactivó o intentó desactivar, y cómo (`--no-verify`, borrar el hook, apagar la regla, pedirle al agente) |       |
| ¿Usó el pedido sugerido en el mensaje del hook? (lo copió / lo parafraseó / no lo vio)                                   |       |
| Terminó la tarea 2 (sí / con ayuda / no)                                                                                 |       |
| Minutos totales                                                                                                          |       |
| Veces que pidió ayuda, y en qué momento                                                                                  |       |
| Frase textual más reveladora                                                                                             |       |

### Preguntas finales

1. ¿Qué crees que hizo devground en tu proyecto? (Respuesta libre: mide si entendió, no si lo usó.)
2. Cuando el commit se detuvo, ¿qué pensaste en ese momento?
3. ¿Hubo algo que te hizo sentir que ibas más lento de lo necesario?
4. Del 1 al 5, ¿qué tan seguro te sientes de que lo que construiste funciona? ¿Por qué?
5. ¿Lo volverías a instalar en tu próximo proyecto? ¿Qué tendría que cambiar para que sí?

## Cómo leer los resultados

Junta las cinco hojas en una tabla y busca lo que se repite. Un problema que aparece en dos personas o más es real. Uno que aparece en una sola es una pista.

Señales y qué hacer con cada una:

| Si ves esto                                         | Significa                                                          | Qué hacer                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Dos o más no logran instalarlo solos                | La entrada es demasiado difícil                                    | Simplificar la instalación antes de cualquier otra cosa                     |
| Dos o más desactivan un control                     | Ese bloqueo cuesta más de lo que el principiante entiende que vale | Reescribir ese mensaje, o ajustar el control al modo rueditas               |
| No usan el pedido sugerido del hook                 | El mensaje se pierde entre el error técnico                        | Moverlo, acortarlo o destacarlo                                             |
| Terminan, pero no saben explicar qué hizo devground | Funciona como caja negra                                           | Reforzar la explicación (rueditas, README)                                  |
| Todos terminan sin ayuda y sin apagar nada          | Va por buen camino                                                 | Repetir con un cambio más riesgoso (formulario con datos, inicio de sesión) |

Registra los resultados en `docs/validacion/resultados-AAAA-MM.md`: las cinco hojas, los problemas repetidos y las decisiones que tomaste a partir de ellos.
