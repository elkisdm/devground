#!/usr/bin/env sh

# ADR-0022: gate de cobertura — recordatorio SUAVE antes del push.
# Degradación EXPLÍCITA, nunca silenciosa, y NUNCA bloquea (el gate duro es CI):
#   - hay script `test:coverage` + cae bajo umbral -> avisa fuerte, DEJA pasar.
#   - no hay script `test:coverage`                -> no hace nada.
#   - SKIP_COVERAGE=1 git push                     -> se omite (escape rápido).
# El objetivo es que VEAS el estado del ratchet sin frenar tu flujo; CI lo exige.
if [ "${SKIP_COVERAGE:-0}" = "1" ]; then
  echo "  ! ADR-0022: gate de cobertura OMITIDO (SKIP_COVERAGE=1). CI igual lo exige."
  exit 0
fi

# ¿Existe el script test:coverage? (node lee package.json sin depender de jq)
if node -e "process.exit(((require('./package.json').scripts)||{})['test:coverage']?0:1)" 2>/dev/null; then
  echo "ADR-0022: verificando cobertura (aviso local, no bloquea)..."
  if ! npm run test:coverage --silent; then
    echo ""
    echo "  ! La cobertura NO alcanza el umbral (ratchet/rutas críticas, ADR-0022)."
    echo "    Esto NO bloquea el push, pero CI SÍ lo va a rechazar."
    echo "    Súbela antes de abrir el PR, o usa 'SKIP_COVERAGE=1 git push' si es a propósito."
    echo ""
  fi
fi

exit 0
