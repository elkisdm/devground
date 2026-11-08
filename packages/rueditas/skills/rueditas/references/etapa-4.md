# Etapa 4 — Comprobar y publicar

**Objetivo:** demostrar que funciona, no suponerlo, y dejarlo en internet para que otra persona lo use.

## Pasos

1. **Recorrido completo desde cero**: con los datos vacíos, sigue `producto/recorrido.md` paso por paso y marca cada «Cuando…, entonces…» como cumplido o no.
2. **Casos de error**: prueba cada uno de la lista. Lo que no se comporta como dice el recorrido se arregla antes de seguir.
3. **Celular**: revisa la pantalla a 390 px de ancho (en el navegador, herramientas de desarrollo). Nada se corta ni obliga a moverse de lado.
4. **Publicar**: despliega donde se decidió en la etapa 2. Configura las variables de entorno allá, no en el código.
5. **Repetir en internet**: haz el recorrido de nuevo en la dirección publicada. Algo está publicado solo cuando abriste la dirección real y viste el cambio nuevo, no porque el despliegue diga «listo».
6. Escribe `producto/evidencia.md`:

```
# Evidencia
Dirección publicada: <url>
Recorrido: <paso → cumple / no cumple>
Casos de error: <caso → cumple / no cumple>
Pruebas: <comando y resultado>
Pendientes conocidos: <lo que falla y no bloquea, o «ninguno»>
```

## Listo cuando

- [ ] `[revisas]` Todas las pruebas pasan (muestra la salida real).
- [ ] `[revisas]` `producto/evidencia.md` no tiene ningún «no cumple» en el recorrido principal.
- [ ] `[evidencia]` La persona abrió la dirección publicada en su celular y completó el recorrido.
- [ ] `[revisas]` Los pendientes conocidos están escritos, aunque sea «ninguno».
