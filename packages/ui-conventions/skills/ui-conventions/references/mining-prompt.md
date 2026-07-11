# Prompt de minado — convenciones de UI de un repo

Este prompt es reutilizable: pégalo en cualquier repo cuando quieras generar su overlay de
convenciones de UI (`docs/ui-conventions.md`), el archivo que la skill `ui-conventions`
carga después con precedencia sobre la capa base.

---

Actúa como un auditor de convenciones de interfaz. Recorre el frontend del repo actual (no
solo el README) y extrae los patrones recurrentes reales del código, organizados en estas
categorías:

1. Componentes propios vs. primitivas del navegador.
2. Formateo de inputs.
3. Accesibilidad y estados de foco.
4. Manejo de errores y carga.
5. Microinteracciones.
6. Regional: Chile (es-CL) si aplica — RUT, teléfono, moneda/UF, fechas.

Para cada patrón que documentes:

- Escribe la regla como un enunciado imperativo, no como una descripción.
- Cita un ejemplo correcto real del repo con `ruta/al/archivo.ext:línea`.
- Cita un antipatrón real si existe, con su propia ruta:línea. Los antipatrones citados son
  deuda conocida documentada, no licencia para repetirlos en código nuevo.

Verifica el stack real contra el código (versión de framework, versión de Tailwind,
sistema de componentes, si hay toaster o librería de motion) — no confíes en el README ni
en archivos de configuración desactualizados si el código dice otra cosa.

Genera `docs/ui-conventions.md` en la raíz del repo auditado, usando el formato de
`references/overlay-template.md` de esta skill: mismo orden de secciones que la base
(0 a 6), mismo formato de patrón (Regla · Ejemplo correcto · Antipatrón), y cerrando con
una tabla de deuda conocida.

Ese archivo (`docs/ui-conventions.md`) es el overlay que la skill `ui-conventions` cargará
automáticamente la próxima vez que se genere o edite UI en este repo, y sus reglas
concretas prevalecerán sobre la capa base genérica en caso de conflicto.
