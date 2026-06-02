#!/usr/bin/env sh

# ADR-0005: convenciones de commit — valida el mensaje contra commitlint.
# El commitlint-config existe; este hook es quien realmente lo invoca.
# Degradación EXPLÍCITA, nunca silenciosa:
#   - commitlint disponible  -> valida el mensaje; si no cumple, bloquea (exit 1).
#   - commitlint NO instalado -> avisa cómo instalarlo y DEJA pasar
#     (la garantía dura la da CI; mismo criterio que gitleaks en pre-commit).
if pnpm exec commitlint --version >/dev/null 2>&1; then
  pnpm exec commitlint --edit "$1"
else
  echo ""
  echo "  ! commitlint NO está disponible — se OMITE la validación del mensaje (ADR-0005)."
  echo "    Instálalo para validar este commit:"
  echo "      pnpm add -D @commitlint/cli @devground/commitlint-config"
  echo "    El commit continúa; CI valida los mensajes como gate obligatorio."
  echo ""
fi
