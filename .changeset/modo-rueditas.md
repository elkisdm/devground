---
'devground-init': minor
'@devground/rueditas': minor
---

Nuevo modo rueditas: una skill de proyecto opt-in que guía a quien construye su primer producto en 5 etapas, explica cada concepto una sola vez y gasta pocos tokens (ADR-0048). Se instala con `devground-init --preset rueditas`, que es todo lo de `full` más la skill; `full`, `--yes` y el modo sin TTY no la instalan. También disponible como `npx @devground/rueditas`. Se apaga diciendo «quita las rueditas», que borra `.claude/skills/rueditas/` y conserva el progreso.
