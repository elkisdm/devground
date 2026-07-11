# Convenciones de UI — capa base

## 0. Cómo usar este documento

Esta es la capa universal: reglas válidas para cualquier proyecto, independientemente del
stack o sistema de diseño. Si el proyecto tiene un overlay (`docs/ui-conventions.md`), ese
overlay tiene precedencia sobre lo que dice aquí.

## 1. Componentes propios vs. primitivas del navegador

- Usa siempre el componente propio del proyecto (botón, input, modal) en vez de HTML nativo
  estilizado a mano. Un `<button>` o `<input>` nativo con clases sueltas reimplementa algo
  que el sistema de componentes ya resuelve, y diverge con el tiempo.
- Combina clases con el helper de composición de clases del proyecto (equivalente a
  `cn`/`twMerge`), nunca concatenando template strings. Antipatrón: `` `btn ${variant} ${size}` ``
  en vez de `cn('btn', variant, size)`.
- No introduzcas una librería nueva (toaster, motion, date-picker) sin una decisión
  explícita (ADR o equivalente). Si el proyecto no tiene toaster, usa feedback inline; si
  no tiene motion, usa transiciones CSS.
- Reutiliza el modal/dialog del proyecto para overlays — ya resuelve el trap de foco, el
  cierre con Escape y el bloqueo de scroll. No reimplementes esa lógica con un portal
  ad-hoc por componente.

## 2. Formateo de inputs (semántica universal)

- Usa `type`, `inputMode` y `autoComplete` semánticos según el campo:
  - Email → `type="email"` `inputMode="email"` `autoComplete="email"` `spellCheck={false}`
    `autoCapitalize="none"`.
  - Teléfono → `type="tel"` `inputMode="tel"` `autoComplete="tel"`.
  - Montos o identificadores numéricos de texto libre → `inputMode="numeric"`, sin
    `type="number"` (que introduce spinners y bloquea el formateo visual).
- Para campos con formato visual (RUT, teléfono, montos), aplica la máscara en el
  `onChange` pero persiste siempre el valor limpio o normalizado, no el string
  formateado. Ejemplo genérico:

  ```tsx
  function handleChange(raw: string) {
    const formatted = formatForDisplay(raw);
    setDisplayValue(formatted);
    setCleanValue(clean(raw));
  }
  ```

- Valida en el boundary con un schema (p. ej. zod), no con lógica inline dentro del
  componente. El componente muestra el error; no decide si el valor es válido.

## 3. Accesibilidad y estados de foco

- Todo botón icon-only lleva `aria-label` (dinámico si el estado que representa cambia,
  p. ej. "Expandir menú" / "Minimizar menú").
- Todo campo tiene `label` asociado con `htmlFor` + `id` (usa un generador de id estable,
  como `useId()`, en componentes reutilizables para no colisionar entre instancias).
- Los errores de un campo se asocian con `aria-invalid` + `aria-describedby` apuntando al
  id del mensaje de error, y el mensaje lleva `role="alert"` o `role="status"` para que un
  lector de pantalla lo anuncie.
- El anillo de foco usa el token de foco del proyecto y se dispara con `focus-visible`, no
  con `focus:` a secas (que también dispara con click de mouse) ni con un color
  hardcodeado.
- Los overlays (modal, dropdown, dialog) cierran con Escape, atrapan el foco dentro
  mientras están abiertos, y restauran el foco al elemento que los abrió al cerrarse.
- Los SVG puramente decorativos llevan `aria-hidden="true"`.
- Los colores se aplican por token semántico del proyecto, nunca como clase de color cruda
  (`gray-*`, `red-*`) ni hex suelto en el JSX.

## 4. Manejo de errores y carga

- Las rutas con carga asíncrona muestran un skeleton fiel al layout real (mismo header,
  mismas filas o secciones), nunca un spinner de página completa.
- Durante el envío de un formulario: el botón queda `disabled`, muestra un spinner, y su
  label cambia a gerundio ("Enviando…", "Guardando…").
- Los errores de formulario se muestran inline junto al campo que falló, no solo en un
  banner genérico, y se anuncian por ARIA. En formularios largos, mueve el foco al primer
  mensaje de error tras un submit fallido.
- Nunca silencies un error de red o de submit: siempre mapéalo a un mensaje legible para
  el usuario y regístralo (`console.error` o equivalente). Un `catch` vacío o que solo
  cambia estado sin loguear es un antipatrón.
- Los estados vacíos (empty states) son un componente dedicado con copy accionable, no un
  `null` o una tabla sin filas sin explicación.
- Los estados de éxito son una vista o tarjeta dedicada, no solo la desaparición del
  formulario.
- Toda ruta que hace fetching que puede fallar tiene un error boundary (`error.tsx` o
  equivalente del framework) con una acción de reintento.

## 5. Microinteracciones

- El hover y el active de un control viven en la primitiva (el componente base), no se
  duplican en cada lugar que lo usa.
- `prefers-reduced-motion` se respeta siempre: si la animación es CSS, usa el prefijo o
  gate correspondiente (`motion-safe:` o un override global en `prefers-reduced-motion:
  reduce`); si la animación es JS/imperativa, verifica la preferencia del sistema antes de
  animar (equivalente a `useReducedMotion()`).
- El cierre animado de un overlay dispara el `onClose` real cuando termina la animación de
  salida (`onAnimationEnd` o equivalente), nunca antes — si no, el contenido desaparece
  antes de que termine la transición.
- Para acciones tipo "copiar al portapapeles": intercambia el label a un estado de
  confirmación ("¡Copiado!") por ~2 segundos y envuelve la llamada al portapapeles en
  `try/catch` (el acceso al portapapeles puede estar bloqueado por el navegador).
- Las animaciones en cascada (listas, grids) usan un delay proporcional al índice del
  elemento, no todos animan al mismo tiempo.
- Los keyframes nuevos se declaran en el theme o en el CSS global del proyecto, no inline
  por componente.

## 6. Región: Chile (es-CL)

> Si el proyecto no tiene helpers propios de RUT/teléfono/moneda, usa o instala
> `@devground/chile-formats` en vez de reimplementarlos; si ya tiene un helper, respétalo.

- **RUT**: usa un único helper de formateo (puntos y guion) y de validación (módulo 11);
  aplica la máscara en el `onChange` pero persiste siempre el valor limpio, sin puntos ni
  guion. El mensaje de error debe mencionar el dígito verificador ("RUT inválido, verifica
  el dígito verificador"). Nunca reimplementes el algoritmo de módulo 11 dentro de un
  componente.
- **Teléfono**: muestra el formato visual `+56 9 XXXX XXXX`, con `inputMode="tel"` y
  `autoComplete="tel"`; normaliza el valor antes de persistirlo (no guardes el string tal
  como el usuario lo tipeó).
- **Moneda, UF y fechas**: usa `Intl.NumberFormat("es-CL")` e `Intl.DateTimeFormat("es-CL")`
  centralizados en un único helper compartido del proyecto. Nunca uses `toLocaleString` ad
  hoc dentro de un componente, ni reimplementes el formateador en más de un lugar.
