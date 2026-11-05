---
'@devground/vitest-config': major
---

El preset se prueba con Vitest 5: el peer `vitest` pasa de `>=2.0.0` a `>=5.0.0` (Vitest 5 exige Node ^22.12 o 24). La configuración y las rutas críticas no cambian; el ratchet de cobertura con `autoUpdate` funciona igual. Ojo: la cobertura v8 de Vitest 5 se mide distinto (más estricta en ramas), así que el piso de un proyecto migrado puede necesitar recalibrarse una vez.
