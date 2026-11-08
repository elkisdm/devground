# Etapa 3 — Construir

**Objetivo:** el recorrido principal funcionando, construido pieza por pieza y guardado en cada avance.

## Antes de la primera línea

1. Revisa que el proyecto tenga Devground (`AGENTS.md` en la raíz). Si no, propón instalarlo.
2. Si existe algo de código abierto que ya resuelve una parte grande, propónlo y revisa su licencia: MIT permite vender; AGPL o licencias propias pueden impedirlo.
3. Divide el recorrido en **piezas**: cada una es un paso del recorrido que se puede ver funcionando. Muestra la lista y el orden.

## Ciclo por pieza

1. **Plan** de 3 a 6 líneas: qué archivos vas a crear o cambiar.
2. **Construye** solo esa pieza.
3. **Prueba**: escribe la prueba de su criterio de aceptación y córrela. Muestra el resultado.
4. **Muéstralo**: dile cómo verlo (comando para abrirlo y qué hacer).
5. **Guarda**: antes del commit revisa que no haya claves en los archivos y que `.env` esté en `.gitignore`; luego commit con un mensaje que diga qué funciona ahora.
6. Marca la pieza como hecha y pasa a la siguiente.

## Reglas

- Nunca guardes claves ni contraseñas en el código: van en `.env`, que no se sube.
- Si una pieza crece más de lo planeado, detente y propón partirla.
- Si la persona pide algo nuevo, va a «Ideas para después» salvo que sea necesario para el recorrido.

## Listo cuando

- [ ] `[revisas]` Cada paso del recorrido tiene su pieza hecha y su commit.
- [ ] `[revisas]` Las pruebas corren y pasan (muestra la salida real).
- [ ] `[revisas]` No hay claves en el código (`git grep` de patrones como `sk-`, `key=`, `password`).
- [ ] `[evidencia]` La persona recorrió el flujo completo en su computador y funciona.
