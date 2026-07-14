#!/usr/bin/env sh

# ADR-0008: higiene de secretos — escaneo con gitleaks antes del commit.
# Degradación EXPLÍCITA, nunca silenciosa:
#   - gitleaks detecta secreto  -> bloquea el commit (exit 1).
#   - gitleaks NO está instalado -> avisa cómo instalarlo y DEJA pasar
#     (la garantía dura la da CI; ver ADR-0008).
if command -v gitleaks >/dev/null 2>&1; then
  echo "ADR-0008: escaneando secretos con gitleaks (staged)..."
  if ! gitleaks protect --staged --redact --verbose; then
    echo ""
    echo "  ✖ gitleaks detectó posibles secretos en los archivos staged."
    echo "    Revisa el reporte de arriba. NO commitees secretos."
    echo "    Falso positivo? Usa '# gitleaks:allow' en la línea o un .gitleaksignore (justificado)."
    exit 1
  fi
else
  echo ""
  echo "  ! gitleaks NO está instalado — se OMITE el escaneo de secretos (ADR-0008)."
  echo "    Instálalo para proteger este commit:"
  echo "      macOS:  brew install gitleaks"
  echo "      Linux:  https://github.com/gitleaks/gitleaks#installing"
  echo "      Go:     go install github.com/gitleaks/gitleaks/v8@latest"
  echo "    El commit continúa; CI valida secretos como gate obligatorio."
  echo ""
fi

# Lint + format de staged (ADR-0005). npx --no-install resuelve el binario local
# sin acoplar a pnpm (funciona en npm/yarn/pnpm) y falla ruidoso si falta (#7).
npx --no-install lint-staged
