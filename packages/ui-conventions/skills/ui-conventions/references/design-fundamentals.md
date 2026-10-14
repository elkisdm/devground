# Fundamentos de diseño de producto — capa universal

## 0. Cómo usar este documento

`base.md` cuida que la UI sea **correcta** (semántica, foco, errores). Este documento cuida que
sea **intencional**: que cada decisión visual tenga un trabajo y que el producto se lea como un
sistema y no como una suma de pantallas.

Son principios y reglas, **no una estética**. No fijan colores, tipografías ni radios concretos:
esos valores los pone el sistema de diseño del proyecto, declarado en su overlay
(`docs/ui-conventions.md`). Un proyecto sin overlay aplica estos fundamentos con los tokens que ya
tenga, sin importar un estilo de otro proyecto.

Precedencia: los **valores** del overlay siempre ganan. Un **principio** de este documento solo se
deja de aplicar si el overlay lo declara como excepción explícita, con su motivo.

## 1. El sistema antes que la pantalla

La IA aprende de lo que encuentra: si encuentra cinco formas de resolver lo mismo, replica la
inconsistencia; si encuentra un sistema, lo escala. Por eso:

- **Consume nombres de token y componentes aprobados; no decidas valores.** Nunca escribas un hex,
  un tamaño, un radio o un espaciado suelto si existe un token. Si no existe, no lo inventes:
  declara un **SYSTEM GAP** en tu respuesta (qué faltó y qué valor provisorio usaste) para que un
  humano lo resuelva en el sistema.
- **Un valor existe una sola vez y se nombra por su uso**, no por su apariencia: `decide`,
  `señala`, `superficie`, en vez de `blue-600` o `gray-light`. Dos valores que se ven iguales y
  son distintos en el código son dos valores para el sistema: unifícalos.
- **Ninguna distancia a ojo.** El espaciado sale de una escala (típicamente múltiplos de 4) y los
  radios, de un conjunto corto. Un `13px` o un `mt-[7px]` es una decisión no tomada.
- **Diagnostica antes de rediseñar.** Para ordenar UI existente, primero cuenta lo que hay
  (colores, espaciados, radios y tamaños de texto distintos; patrones repetidos; fricciones) y
  clasifica cada patrón en **conservar / adaptar / dejar**, con evidencia y no por gusto. Un patrón
  pasa a ser regla común cuando lo confirman dos contextos de tipo distinto.

## 2. Cada recurso tiene un trabajo

- **Nada es decorativo ni está por defecto.** Si un color, un gradiente, una sombra, un borde o una
  métrica no ayuda a comprender, decidir o actuar, no va.
- **El color se asigna por rol**, y cada rol tiene un solo significado en todo el producto. El
  color de la acción que decide no se reutiliza para decorar.
- **La marca vive en su zona**: entrada, portadas y zona de marca. Los gradientes y luces de marca
  **nunca van detrás de un dato ni comunican un estado.**
- **Estado = indicador + palabra, nunca solo color** («● Sin respuesta», no un punto naranja
  solo).

## 3. Jerarquía: una decisión por contexto

- **Una sola acción primaria por contexto**: la que cambia algo. Crear, exportar, cancelar y
  navegar no deciden; van en el estilo secundario o neutro.
- **Una sola región de énfasis máximo por vista**: el bloque que concentra lo que requiere
  decisión ahora (p. ej. «42 requieren tu decisión» con su acción). Si hay dos, ninguna lo es.
- **La profundidad la dan el tono y el material, no la acumulación de efectos.** Lo que requiere
  atención se acerca (más contraste, superficie de trabajo); lo que acompaña se aleja (capa más
  tenue). Evita apilar sombras, bordes y cápsulas para separar cosas.
- **La selección es un tono, no un objeto.** Reposo: nada compite. Hover: sube el tono. Selección:
  tono, peso y trazo. Foco: un anillo, solo con teclado (`focus-visible`). No agregues iconos,
  barras ni badges extra para marcar lo activo; un filtro activo se marca con tono.

## 4. Precisión en los datos

- **Ninguna cifra suelta.** Toda métrica dice de qué está hecha y cuándo se midió: «477 asignados ·
  59 % de respuesta · meta 70 % · medido 09:14».
- **Declara lo que muestras.** Entorno, fuente, período y filtros activos se ven siempre (un
  selector que dice «producción» sobre datos de sandbox es un defecto). Un estado que no dice
  cuándo se midió no es un estado.
- **Las cifras se alinean.** Usa numerales tabulares (`font-variant-numeric: tabular-nums`) y
  alinea por columna horas, IDs, montos y estados.
- **El valor que decide va junto a la lista**, no escondido en un detalle. Usa maestro-detalle
  (lista + panel) para no perder contexto al abrir un registro.
- **No repitas enlaces genéricos.** Un «Ver detalle» en cada fila es ruido: la fila entera es el
  destino, o el enlace dice a dónde lleva.

## 5. Espacio con propósito

- **El espacio agrupa.** Separa lo que decide de lo que acompaña y de lo que pasa en segundo plano;
  la cercanía comunica relación.
- **Lo que nombra es grande y liviano; lo operativo es denso.** Títulos y cifras protagonistas con
  tamaño grande y peso bajo; tablas y listas compactas.
- **Aire, no vacío.** Simplificar no es dejar huecos porque sí. Tampoco cargar la vista: con más de
  tres filtros, el panel nace plegado y deja a la vista los frecuentes.

## 6. La interfaz habla con personas

- **Voz directa, precisa y cercana, sin ser blanda.** Habla a la persona, no a la base de datos.
  Mal: «revisar last_error en inbound_events». Bien: «Este lead no llegó al CRM; reintentamos a las
  10:30».
- **Las personas aparecen con nombre y cara** (avatar o iniciales), no con un ID.
- **Estado vacío = causa + paso siguiente** («Aún no hay reservas este mes · Crear reserva»).
- **El aviso confirma y deja deshacer** en las acciones reversibles («Proyecto reasignado a A. Soto
  · Deshacer»), en vez de pedir confirmación previa.

## 7. Familias de productos: misma gramática, distintas voces

Cuando varios productos conviven en una suite, no deben verse iguales, pero quien cambia de
producto no debe aprender otro idioma:

- **Comparten la gramática**: la misma estructura de navegación, el mismo selector de producto en
  el mismo lugar, la misma búsqueda global, los mismos estados de interacción y las mismas piezas
  (pastillas, filtros, avisos).
- **Varía la voz**, y solo a través de tokens: densidad, tonalidad y forma propias de cada
  producto, nunca reglas distintas para lo mismo.

## 8. Antipatrones (el look genérico de la IA)

- Bordes, cápsulas, sombras y radios grandes en todo, para «separar» lo que el espacio y el tono ya
  separan.
- Botones en píldora y varias acciones de color primario compitiendo en la misma vista.
- La «tecnología que grita»: fondos negros con neones y azul eléctrico; o el extremo opuesto,
  minimalismo vacío que esconde la información.
- Tarjetas de KPI con cifras sin contexto ni fecha, puestas porque «se ven bien».
- Gradientes sin función, sobre todo detrás de datos.
- Mensajes de sistema en lenguaje técnico y personas identificadas por ID.
