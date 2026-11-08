#!/usr/bin/env sh

# ADR-0005: convenciones de commit — valida el mensaje contra commitlint.
# El commitlint-config existe; este hook es quien realmente lo invoca.
# Degradación EXPLÍCITA, nunca silenciosa:
#   - commitlint disponible  -> valida el mensaje; si no cumple, bloquea (exit 1).
#   - commitlint NO instalado -> avisa cómo instalarlo y DEJA pasar
#     (la garantía dura la da CI; mismo criterio que gitleaks en pre-commit).
if npx --no-install commitlint --version >/dev/null 2>&1; then
  if ! npx --no-install commitlint --edit "$1"; then
    echo ""
    echo "  ✖ Commit detenido: el mensaje no sigue el formato acordado."
    echo "    Debe verse así:  tipo: qué cambió    (ej.: feat: agrega inicio de sesión)"
    echo "    Tipos: feat (algo nuevo), fix (arreglo), docs, refactor, test, chore."
    echo "    Tu código no se perdió: solo falta rehacer el commit con otro mensaje."
    echo "    Pídele a tu agente: \"Rehaz el commit con un mensaje en formato conventional commits\"."
    echo ""
    exit 1
  fi
else
  echo ""
  echo "  ! commitlint NO está disponible — se OMITE la validación del mensaje (ADR-0005)."
  echo "    Instálalo para validar este commit:"
  echo "      pnpm add -D @commitlint/cli @devground/commitlint-config"
  echo "    El commit continúa; CI valida los mensajes como gate obligatorio."
  echo ""
fi
