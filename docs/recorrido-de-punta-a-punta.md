# Recorrido de punta a punta antes de publicar

> Estado: **Propuesto** ([ADR-0050](adr/0050-recorrido-de-punta-a-punta-antes-de-publicar.md)).
> Nació en el CRM v2 de Capital (CRM-32, 19–20 nov 2026) y se repite en el panel nuevo de Atlas
> (ATL-114). Esta guía se corrige con lo que salga de ellos.

Las pruebas unitarias dicen que cada pieza hace lo que su autor pensó. No dicen si **cada acción
del producto existe, funciona para cada rol y se ve bien** a todos los anchos. El recorrido responde
eso: un inventario de todos los casos del producto, ejecutado en un navegador real contra un entorno
con datos, con evidencia por caso y un veredicto de publicación.

Úsalo cuando un rediseño o un módulo grande va a pasar de «opcional / solo para mí» a «para todos»,
o cuando nadie puede decir con certeza qué acciones tiene el producto.

## Las cinco fases

| Fase                   | Qué sale                                                       | Quién                                       |
| ---------------------- | -------------------------------------------------------------- | ------------------------------------------- |
| 1. Inventario          | `casos.yaml` + `COBERTURA.md`                                  | un agente que **lee** el código, no ejecuta |
| 2. Entorno             | entornos aislados por bloque, perfiles y dobles                | un agente, una vez                          |
| 3. Reproducción        | guiones por bloque + `resultados-<n>.json` + capturas          | un agente por bloque, en paralelo           |
| 4. Matriz              | página con cada caso, su estado, capturas y defectos           | el orquestador                              |
| 5. Arreglo y veredicto | commits por defecto, casos re-corridos, suite verde, veredicto | ejecutores + orquestador                    |

El orquestador (la sesión principal) no implementa: reparte, hace el QA en navegador con criterio
propio, decide lo que es de producto y entrega el veredicto.

## 1. Inventario: el contrato de casos

Un caso = una comprobación observable. Se arma **leyendo** rutas, componentes, acciones del
servidor, endpoints, semillas, dobles y prototipos. Campos por caso (todos presentes, `null` si no
aplica):

| Campo               | Qué es                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| `id`                | `AREA-NN`, estable; los guiones lo citan en ok/falla                                                      |
| `area`, `pantalla`  | área funcional y ruta (con variante)                                                                      |
| `rol`               | perfil concreto, o «falta perfil: …»                                                                      |
| `existe`            | `si` · `parcial` · `no` (solo en el prototipo: brecha a documentar)                                       |
| `accion`            | id de la acción o server action que ejercita                                                              |
| `estado`            | con datos, vacío, error, solo lectura, bandera apagada…                                                   |
| `pasos`, `esperado` | pasos cortos; lo observable (texto, URL, consulta SQL, código HTTP)                                       |
| `datos`, `bandera`  | semilla que lo habilita; variable o preferencia que lo condiciona                                         |
| `prototipo`         | artboard del diseño aprobado, para comparar                                                               |
| `anchos`            | viewports (1440, 390; 320 donde aplique)                                                                  |
| `cubierto_por`      | guion existente que ya lo comprueba, o `null`                                                             |
| `riesgo`            | `alto` escribe, reasigna o toca permisos · `medio` alcance, privacidad, exporta · `bajo` lectura o visual |

Cubre siempre, además de lo feliz: cada rol (también **solo lectura** y **sin permisos**), estados
vacío y error, fuente externa caída, banderas apagadas, acceso sin sesión (páginas y API), rutas
inexistentes y **dos espacios o entornos** (con uno solo no aparecen los fallos de alcance).

`COBERTURA.md` reparte las áreas en 3 bloques independientes (por datos que mutan, no por tamaño).

## 2. Entorno

- Copia **sintética** de producción, nunca la base real. Producción es de solo lectura para todo el
  recorrido.
- Un entorno por bloque (`levantar-bloque.sh <n>`, proyecto de Docker y puerto propios; `--semillas`
  restablece datos entre corridas; `bajar-bloque.sh <n>` al terminar).
- Un perfil por rol y por caso borde (cuenta sin terminar, sin equipo, sin enlazar, lectura…).
- Dobles para cada servicio externo, con escenarios elegibles por dato (p. ej. por teléfono:
  rica, vacía, caída). Nada sale a un servicio real.
- Login por la vía real del producto (código por correo leído de un buzón local, no atajos).

## 3. Reproducción: el corredor

Un módulo común (`correr-casos.mjs`) y un guion por bloque. Cada caso termina en exactamente uno:

- **ok** — se probó y cumple.
- **falla** — con esperado vs obtenido, paso y captura.
- **info** — prototipo sin código, o falta un doble: se documenta.
- **no-existe** — el contrato decía `existe: no` y se confirmó.

`t.pantalla(page, ruta)` captura a cada ancho (y la del prototipo) y corre los chequeos automáticos:
textos `undefined`/`NaN`/`null` visibles, scroll horizontal, errores de consola y de página,
respuestas propias ≥ 400, controles nativos prohibidos (`<select>`, `<input type=date>`) y axe
(wcag2a/2aa/21aa/22aa, sin violaciones serias o críticas).

Reglas de los guiones:

- **Nunca un verde sin probar.** Prohibido `if (await x.count())` que salte la comprobación: si el
  elemento no está, es falla.
- Los casos de riesgo alto comprueban el **efecto real** (consulta a la base del bloque o estado del
  doble), no solo el aviso en pantalla.
- El agente de un bloque **no arregla el producto**: deja el caso en falla con evidencia. Solo arregla
  sus guiones o sus datos de prueba.
- Si el contrato estaba mal y el producto tiene razón, se corrige el caso y se dice.

## 4. Matriz

Una página (artifact) por producto: resumen por área y estado, filtro por estado/riesgo/rol, cada
caso con esperado, obtenido, capturas lado a lado con el prototipo y el defecto enlazado. Se
republica en la misma URL tras cada ronda de arreglos.

## 5. Arreglo y veredicto

- Los defectos se agrupan por **archivos disjuntos** y van a ejecutores en paralelo (máximo 3 con
  entornos propios; mira la presión de memoria antes). Cada uno: prueba que reproduce (rojo) → arreglo
  (verde) → re-corre su caso en su bloque → commit por lista de archivos.
- Lo que es de producto (quién ve qué, qué rol pierde un permiso) no lo decide el ejecutor: el
  orquestador lo junta y lo pregunta en una sola ronda.
- Migraciones que salgan: número provisional, reservado con quien lleve la secuencia antes de fusionar.
- Cierre: suite completa, typecheck y lint **una vez**, al final; recorrido completo de los tres bloques
  otra vez; matriz actualizada; veredicto **listo / no listo para publicar**, con lo que falta y lo
  que depende de una persona.

## Lo que aprendimos en el primer recorrido (CRM v2, 328 casos)

- El recorrido encontró ~25 defectos que la suite (8.400 pruebas en verde) no veía: una sección que
  tumbaba la página entera, escrituras visibles para cuentas de solo lectura, un permiso de panel
  heredado por una semilla, `tel:` con teléfonos de relleno, desbordes a 320 px.
- Una sesión con el permiso viejo en caché da falsos «falla» tras un arreglo de permisos: borra la
  sesión del perfil antes de re-correr.
- Reconstruir la imagen cambia los ids de las server actions: el guion que los guarde debe amarrar su
  caché al id de la imagen.
- Un agente que corta su corrida con `pkill` deja falsos negativos; apaga por PID de puerto.

## Plantilla del encargo a un agente de bloque

```
Contrato: <ruta>/casos.yaml (tus áreas: …). Entorno: levantar-bloque.sh <n> (solo el tuyo).
Por caso: si ya hay guion, reconfirma selectores; si no, escríbelo con el corredor.
Cada caso termina en ok | falla (esperado vs obtenido + captura) | info | no-existe.
Riesgo alto: comprueba en la base. No arregles el producto. Corre tu guion completo al final
y deja resultados-<n>.json. Nada a producción. Informe: tabla por área, defectos, lo no probado.
```

## Referencia

Implementación completa en `brekto-crm`, rama del rediseño v2:
`infra/integracion/pruebas/recorrido/` (`casos.yaml`, `COBERTURA.md`, `correr-casos.mjs`,
`bloque1-3.mjs`) e `infra/integracion/pruebas/{levantar,bajar}-bloque.sh`.
