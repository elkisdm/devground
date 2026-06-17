# ADR-0015: Costo de orientación (tokens antes del primer edit) y payoff del codemap

- **Estado**: Propuesto
- **Fecha**: 2026-06-17
- **Decisor**: edaza
- **Aplica a**: `@devground/dev-metrics`, comando `orientation`

## Contexto

El `codemap.md` se justifica con una promesa: reducir el **costo de orientación** — los tokens que un agente gasta entendiendo *dónde vive cada cosa* antes de tocar código. Hasta ahora esa promesa era fe, no dato. El `contextCost` existente (tokens en los primeros N mensajes) es un proxy crudo que no distingue "orientándose" de "ya trabajando".

## Decisión

El comando `orientation` define el costo de orientación de una sesión como **la suma de output tokens hasta (e incluyendo) el primer `Write`/`Edit`/`MultiEdit`**. Las sesiones que nunca editan (Q&A, read-only) se **excluyen** — su costo de orientación no está definido.

Para probar el payoff del codemap, se segmentan las sesiones de código por si **leyeron un `codemap.md` antes del primer edit** (detectado vía `tool_use` de `Read` con `file_path` que matchea `codemap.md`). Se reportan **medianas** (la distribución de tokens es muy sesgada; la media engaña) y los n's de cada segmento.

## Consecuencias

**Positivas**

- Da un **baseline real** del costo de orientación (primera corrida: mediana ~19.3k tok/sesión sobre 448 sesiones de código) para re-medir en el tiempo.
- La primitiva es pura y testeada; no depende de recordar la metodología.

**Negativas / límites (declarados, no ocultos)**

1. **Auto-selección por tamaño de tarea**: el agente tiende a leer el codemap en tareas grandes/estructurales, que cuestan más orientación *de por sí*. En la primera corrida los lectores de codemap mostraron MÁS costo (79k vs 19k) — esto es el confound, **no** evidencia de que el codemap perjudique. La comparación es CORRELACIONAL; no se lee causalidad.
2. **n escaso**: solo 11/448 sesiones (2.5%) leyeron un codemap. El hallazgo accionable real es que **el hábito de consultar el codemap casi no existe** — el payoff no es medible mientras nadie lo lea.
3. **Denominador all-time**: el scan incluye sesiones anteriores a que el codemap existiera (sembrado ~2026-06-03). Un denominador justo es "sesiones de código en repos con codemap, posteriores a su siembra" — requiere atribución repo+fecha (v2).

## Evolución

- **v2 (CONSTRUIDO 2026-06-17)**: (a) `orientation-share` = costo / output total de la sesión, neutraliza el confound de tamaño; (b) la comparación codemap-read-vs-not se restringe a sesiones en repos-con-codemap, arreglando el denominador (3). **Hallazgo del share**: en tokens absolutos los lectores de codemap gastan MÁS (59k vs 14k, confound de tamaño), pero en SHARE se INVIERTE (29% vs 68%) — dedican menor fracción de la sesión a orientarse. El share destapó una señal que el absoluto ocultaba. **Sigue sin rescatar el n** (2): solo 5/199 sesiones en repos-con-codemap leyeron el mapa (2.5%) → hipótesis a vigilar, no resultado; correlacional, no causal.
- **Causa raíz atacada en paralelo**: el Step 0 de spec-flow se endureció (leer el codemap es OBLIGATORIO cuando existe) para subir ese 2.5%. La métrica empezará a tener poder estadístico conforme suba la adopción.
- **before/after global (descartada)**: confundido por el aprendizaje del dev y por el tamaño de tarea.
