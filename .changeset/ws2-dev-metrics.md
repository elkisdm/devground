---
"@devground/dev-metrics": minor
---

dev-metrics ahora reporta su versión real desde package.json (antes mentía 0.1.0
mientras el paquete es 1.0.0); `init` imprime la razón accionable y sugiere
--force cuando el config ya existe (antes salía con exit 1 sin mensaje); y
readEvents descarta filas malformadas de events.json en vez de dejar pasar
fechas/labels undefined al timeline. Internamente, `collect` recorre el corpus de
transcripts UNA sola vez en lugar de tres y filtra por período al vuelo, sin
retener toda la historia en memoria.
