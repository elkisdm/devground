# @devground/rueditas

## 0.4.0

### Minor Changes

- 7abfd8e: Al reinstalar, si la skill que ya tienes no coincide con la del paquete (una versión anterior o cambios tuyos), el instalador lo avisa, dice qué archivos difieren y cómo actualizar: borrar `.claude/skills/rueditas/` y correr `npx @devground/rueditas`. Tu progreso en `.devground/rueditas.md` se conserva. No se sobrescribe nada sin que lo decidas. `devground-init` repite el aviso en vez de solo marcarla como omitida.

## 0.3.0

### Minor Changes

- beebf3b: Las rueditas ya no son todo o nada. «Quita las rueditas» ofrece **seguir sin guía** (modo `libre`: sin etapas ni explicaciones, pero con las reglas que protegen: confirmar gastos e irreversibles, parar si un error se repite, mostrar las cosas funcionando y no saltarse los bloqueos del commit) o **quitar todo**. «Pon las rueditas» vuelve al modo guiado.

  Desde la segunda vuelta, al cerrar una etapa sin conceptos nuevos, Claude propone seguir sin guía. Para eso el progreso registra `Modo`, `Vueltas completas` y la etapa de cada concepto.

  Corrige el comando para volver a encenderlas: es `npx @devground/rueditas` (`npx devground-rueditas` daba 404 fuera de un proyecto que ya tuviera el paquete).

  La skill se copia una sola vez y no se sobrescribe. Para recibir esta versión en un proyecto que ya la tiene, borra `.claude/skills/rueditas/` y corre `npx @devground/rueditas`: tu progreso en `.devground/rueditas.md` se conserva.

## 0.2.1

### Patch Changes

- 060e4ec: `engines.node` ahora es `>=22.22.1`. El mínimo real ya era ese, porque lint-staged 17 exige `>=22.22.1` (y commitlint 21 `>=22.12.0`); con Node 22.0 a 22.22.0 la instalación fallaba con ERESOLVE. Ahora lo declaramos para que el error sea claro. Además se actualizan dependencias (commander 15.1) y las de desarrollo para cerrar avisos de `pnpm audit`.

## 0.2.0

### Minor Changes

- dc387a9: Nuevo modo rueditas: una skill de proyecto opt-in que guía a quien construye su primer producto en 5 etapas, explica cada concepto una sola vez y gasta pocos tokens (ADR-0048). Se instala con `devground-init --preset rueditas`, que es todo lo de `full` más la skill; `full`, `--yes` y el modo sin TTY no la instalan. También disponible como `npx @devground/rueditas`. Se apaga diciendo «quita las rueditas», que borra `.claude/skills/rueditas/` y conserva el progreso.

## 0.1.0

### Minor Changes

- Primera versión: skill `rueditas` con 5 etapas, glosario para principiantes y archivo de progreso `.devground/rueditas.md`. Se instala con `npx @devground/rueditas` (local o `--global`) sin sobrescribir archivos, y se apaga con «quita las rueditas».
