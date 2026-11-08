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
    echo "  ✖ Commit detenido: parece que hay una clave, token o contraseña en el código."
    echo "    Si llega a git, queda en el historial aunque después la borres."
    echo "    Arriba aparece el archivo y la línea (con el valor oculto)."
    echo "    Pídele a tu agente: \"Saca el secreto del código, léelo desde .env y verifica que .env esté en .gitignore\"."
    echo "    ¿Falso positivo? Agrega '# gitleaks:allow' en esa línea, explicando por qué."
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
if ! npx --no-install lint-staged; then
  echo ""
  echo "  ✖ Commit detenido: el revisor de código encontró problemas en los archivos que estás guardando."
  echo "    Arriba aparece cada archivo, la línea y la regla que falló."
  echo "    Tus cambios no se perdieron: siguen en tus archivos."
  echo "    Pídele a tu agente: \"El pre-commit falló por lint; corrige lo que muestra sin desactivar reglas y vuelve a hacer commit\"."
  echo ""
  exit 1
fi
