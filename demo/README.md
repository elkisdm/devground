# Demo en terminal (VHS)

Este directorio contiene el script que genera el GIF de demostracion del flujo `devground-init`, usando [VHS](https://github.com/charmbracelet/vhs) de charmbracelet.

## Archivos

| Archivo | Que es |
|---------|--------|
| `devground.tape` | Script VHS que describe la sesion de terminal a grabar |
| `devground.gif` | Salida renderizada (generada, no versionada hasta el primer render) |

## Como renderizar

1. Instala VHS:

   ```bash
   brew install vhs
   ```

   (Otras plataformas: ver [instrucciones de instalacion de VHS](https://github.com/charmbracelet/vhs#installation).)

2. Renderiza el GIF desde la raiz del repo:

   ```bash
   vhs demo/devground.tape
   ```

3. Eso produce `demo/devground.gif`, que el README raiz referencia en el hero.

## Notas

- El tape **simula** el output del CLI con `printf` (colores ANSI incluidos) para que el GIF sea **deterministico y reproducible** sin depender de la red ni de un proyecto de ejemplo. El output replica exactamente los mensajes reales de `devground-init` (banner, deteccion de stack, instaladores, resumen).
- Si prefieres grabar el flujo **real**, edita `devground.tape` y reemplaza los bloques `printf` por una invocacion directa en un proyecto de prueba:

  ```
  Type "npx devground-init --yes"
  Enter
  Sleep 15s
  ```

  Ten en cuenta que el flujo real descarga paquetes (mas lento, requiere red) y su output puede variar segun el stack detectado.
- Para ajustar tamaño, tipografia o tema del GIF, edita las directivas `Set` al inicio del tape.
