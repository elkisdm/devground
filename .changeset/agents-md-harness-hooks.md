---
'@devground/agents-md': minor
---

Nuevo bin `devground-hooks`: instala 4 hooks curados del harness de Claude Code que
hacen ejecutables las reglas de AGENTS.md en tiempo de edición (no de commit):
prettier-format, typecheck single-file (~0.9s, filtra ruido de resolución TS2307/TS2792),
aviso de console.log (Zero Dead Code) y session-summary (marker token-free para
@devground/dreaming). Kill switch por variable de entorno (`DEVGROUND_HOOKS_DISABLE`),
un hook nunca rompe la sesión (exit 0 ante cualquier estado inesperado) y el instalador
jamás toca una clave `hooks` existente en `.claude/settings.json`. Primera feature del
plan research/ecc-inspiration.md (§2), con 53 tests vitest de contrato
(entrada → exit code / stderr).
