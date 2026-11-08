# Etapa 2 — Diseñar

**Objetivo:** saber exactamente qué tiene que pasar antes de escribir código. Lo que se escribe aquí es lo que se comprueba en la etapa 4.

## Pasos

1. Con la ficha a la vista, escribe el **recorrido principal**: los pasos que hace el usuario de principio a fin, como máximo 7 y cada uno con lo que ve.
2. Para cada paso, escribe un **criterio de aceptación** en lenguaje simple: «Cuando <hago esto>, entonces <pasa esto>».
3. Agrega los **casos de error** que importan: campo vacío, dato inválido, se cae internet, recarga la página, toca dos veces el botón.
4. Decide **dónde se guardan los datos** (si hace falta) y **dónde se publica**. Propón la opción más simple y explica por qué en una línea.
5. Si la persona tiene una referencia visual (una página que le guste), anótala. Se usa como inspiración, no se copia.
6. Escribe `producto/recorrido.md` con esta forma:

```
# Recorrido principal
1. <paso> → ve: <qué aparece>
   Cuando <acción>, entonces <resultado>.
...
## Casos de error
- Cuando <error>, entonces <qué ve el usuario>.
## Decisiones
Datos: <dónde y por qué>
Publicación: <dónde y por qué>
Referencia visual: <enlace o «ninguna»>
```

## Listo cuando

- [ ] `[revisas]` Cada paso del recorrido tiene su «Cuando…, entonces…».
- [ ] `[revisas]` Hay al menos 3 casos de error escritos.
- [ ] `[revisas]` El recorrido cumple la función principal de la ficha, sin funciones de «Ideas para después».
- [ ] `[decide]` La persona eligió dónde se guardan los datos y dónde se publica.
- [ ] `[decide]` La persona leyó el recorrido y dice «sí, eso es».
