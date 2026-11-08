# @devground/rueditas

## 0.2.0

### Minor Changes

- dc387a9: Nuevo modo rueditas: una skill de proyecto opt-in que guía a quien construye su primer producto en 5 etapas, explica cada concepto una sola vez y gasta pocos tokens (ADR-0048). Se instala con `devground-init --preset rueditas`, que es todo lo de `full` más la skill; `full`, `--yes` y el modo sin TTY no la instalan. También disponible como `npx @devground/rueditas`. Se apaga diciendo «quita las rueditas», que borra `.claude/skills/rueditas/` y conserva el progreso.

## 0.1.0

### Minor Changes

- Primera versión: skill `rueditas` con 5 etapas, glosario para principiantes y archivo de progreso `.devground/rueditas.md`. Se instala con `npx @devground/rueditas` (local o `--global`) sin sobrescribir archivos, y se apaga con «quita las rueditas».
