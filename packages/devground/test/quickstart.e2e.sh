#!/usr/bin/env bash
set -euo pipefail

# E2E de instalación de devground (quickstart, repos existentes e idempotencia).
#
# Corre en CI (job `e2e` de .github/workflows/ci.yml) y también a mano:
#
#   pnpm -r build && bash packages/devground/test/quickstart.e2e.sh
#
# No es parte de `node --test` (el nombre usa `.e2e.sh`, no `.test.`) porque
# hace instalaciones npm reales contra el registro (husky, lint-staged,
# eslint, prettier, typescript, commitlint...) y tarda varios minutos.
#
# Empaqueta TODOS los paquetes del workspace que la CLI instala (más la CLI,
# devground y logger) como tarballs locales y los declara como devDependencies
# DIRECTAS del proyecto de prueba con especificador `file:` — así npm los
# resuelve SIEMPRE al código local y no al publicado en npm.
#
# Por qué no usar `"overrides"`: los installers de devground-init instalan
# los @devground/* ellos mismos vía `npm install -D <pkg>` (sin versión). Si
# esos mismos paquetes están en "overrides", npm rechaza el install con
# EOVERRIDE ("Override ... conflicts with direct dependency") en cuanto el
# installer intenta agregarlos como dependencia directa. En cambio, si YA están
# declarados como dependencia directa con especificador `file:` ANTES de correr
# devground-setup, el `npm install -D <pkg>` posterior del installer los ve
# "up to date" y no toca el especificador — confirmado contra npm 11.16.0.
#
# Escenarios (cada uno en su propio proyecto dentro del mismo SCRATCH):
#   1. nuevo: hooks reales, CLAUDE.md respetado, `git commit` exit 0.
#   2. existente: prepare, .husky/pre-commit, .prettierrc y eslint.config.js
#      propios del usuario sobreviven a la instalación.
#   3. segunda instalación: re-correr devground-setup sobre el proyecto
#      "nuevo" no cambia archivos trackeados (idempotencia) y sale con 0.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SCRATCH="$(mktemp -d)"
TARBALLS="$SCRATCH/tarballs"
mkdir -p "$TARBALLS"

cleanup() {
  rm -rf "$SCRATCH"
}
trap cleanup EXIT

FAIL=0
fail() {
  echo "FAIL: $1"
  FAIL=1
}

echo "== pack de paquetes locales =="
# architecture-guide copia knowledge/ (ignorada por git) en prepublishOnly, que
# `pnpm pack` no ejecuta: sin este paso, en un checkout limpio (CI) el tarball
# sale sin knowledge/ y su instalador aborta. Se replica lo que hace publicar.
node "$ROOT/packages/architecture-guide/scripts/sync-knowledge.js"
# Todo @devground/* que agregan los installers de packages/cli/src/installers,
# más la CLI, devground (devground-setup) y logger (dependencia de la CLI).
PACK_DIRS=(
  devground cli logger
  agents-md architecture-guide commitlint-config eslint-config husky-config
  lint-staged-config prettier-config rueditas tsconfig ui-conventions vitest-config
)
DEPS_JSON="{"
SEP=""
for dir in "${PACK_DIRS[@]}"; do
  name="$(node -p "require('$ROOT/packages/$dir/package.json').name")"
  (cd "$ROOT/packages/$dir" && pnpm pack --pack-destination "$TARBALLS" >/dev/null)
  # @scope/nombre -> scope-nombre ; nombre -> nombre
  prefix="$(echo "${name#@}" | tr '/' '-')"
  tgz="$(find "$TARBALLS" -maxdepth 1 -name "$prefix-[0-9]*.tgz" | head -1)"
  if [ -z "$tgz" ]; then
    echo "FAIL: no se encontró el tarball de $name en $TARBALLS" >&2
    ls -la "$TARBALLS" >&2
    exit 1
  fi
  DEPS_JSON+="$SEP\"$name\":\"file:$tgz\""
  SEP=","
done
DEPS_JSON+="}"

# new_project <nombre>: crea el repo git y su package.json con los tarballs
# locales como devDependencies. Deja el cwd dentro del proyecto. Un
# `scripts` opcional (JSON) se pasa como segundo argumento.
new_project() {
  local dir="$SCRATCH/$1"
  local scripts='{}'
  [ -z "${2:-}" ] || scripts="$2"
  mkdir -p "$dir"
  cd "$dir"
  git init -q
  git config user.email "e2e@example.com"
  git config user.name "e2e"
  # Sin esto, `git add -A` stagearía node_modules completo y lint-staged
  # intentaría lintear paquetes de terceros — higiene del harness de prueba.
  echo 'node_modules/' > .gitignore
  DEPS="$DEPS_JSON" SCRIPTS="$scripts" PNAME="e2e-$1" node -e "
const fs = require('fs');
const pkg = {
  name: process.env.PNAME,
  version: '1.0.0',
  private: true,
  scripts: JSON.parse(process.env.SCRIPTS),
  devDependencies: JSON.parse(process.env.DEPS),
};
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"
}

scenario_nuevo() {
  echo ""
  echo "== escenario 1: proyecto nuevo =="
  new_project nuevo
  echo '# reglas propias del usuario, no deben perderse' > CLAUDE.md
  npm install
  npx devground-setup

  if [ ! -f .husky/pre-commit ]; then
    fail "[nuevo] falta .husky/pre-commit"
  elif ! grep -q 'lint-staged' .husky/pre-commit; then
    fail "[nuevo] .husky/pre-commit no es el hook real (¿quedó el placeholder de husky init?)"
  fi

  [ -f .husky/commit-msg ] || fail "[nuevo] falta .husky/commit-msg"

  local claude
  claude="$(cat CLAUDE.md)"
  if [ "$claude" != "# reglas propias del usuario, no deben perderse" ]; then
    fail "[nuevo] CLAUDE.md previo del usuario fue modificado/sobreescrito (actual: $claude)"
  fi

  echo "test marker" > marker.txt
  git add -A
  local exit_code=0
  git commit -m "test: verifica que el quickstart deja el repo commiteable" >"$SCRATCH/commit.log" 2>&1 || exit_code=$?
  cat "$SCRATCH/commit.log"
  if [ "$exit_code" -ne 0 ]; then
    fail "[nuevo] git commit retornó exit $exit_code (se esperaba 0)"
  fi
}

scenario_existente() {
  echo ""
  echo "== escenario 2: proyecto existente con configuración propia =="
  new_project existente '{"prepare":"node custom-prepare.js"}'
  : > custom-prepare.js
  mkdir -p .husky
  echo 'echo MI HOOK' > .husky/pre-commit
  echo '{"semi": false}' > .prettierrc
  echo 'export default [];' > eslint.config.js
  local hook_before prettierrc_before eslint_before
  hook_before="$(cat .husky/pre-commit)"
  prettierrc_before="$(cat .prettierrc)"
  eslint_before="$(cat eslint.config.js)"

  npm install
  npx devground-setup

  local prepare
  prepare="$(node -p "(require('./package.json').scripts || {}).prepare || ''")"
  [ "$prepare" = "node custom-prepare.js" ] || fail "[existente] el script prepare fue modificado (actual: '$prepare')"
  [ "$(cat .husky/pre-commit)" = "$hook_before" ] || fail "[existente] .husky/pre-commit propio fue modificado"
  [ "$(cat .prettierrc)" = "$prettierrc_before" ] || fail "[existente] .prettierrc propio fue modificado"
  if node -e "process.exit('prettier' in require('./package.json') ? 0 : 1)"; then
    fail "[existente] se agregó la clave 'prettier' a package.json pese a existir .prettierrc"
  fi
  [ ! -e eslint.config.mjs ] || fail "[existente] se creó eslint.config.mjs pese a existir eslint.config.js"
  [ "$(cat eslint.config.js)" = "$eslint_before" ] || fail "[existente] eslint.config.js propio fue modificado"
}

scenario_segunda_instalacion() {
  echo ""
  echo "== escenario 3: segunda instalación sobre el proyecto nuevo =="
  cd "$SCRATCH/nuevo"
  local exit_code=0
  npx devground-setup || exit_code=$?
  if [ "$exit_code" -ne 0 ]; then
    fail "[segunda instalación] devground-setup retornó exit $exit_code (se esperaba 0)"
  fi
  local changes
  changes="$(git status --porcelain --untracked-files=no)"
  if [ -n "$changes" ]; then
    fail "[segunda instalación] cambió archivos trackeados (no idempotente):"
    echo "$changes"
  fi
}

scenario_nuevo
scenario_existente
scenario_segunda_instalacion

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "PASS: e2e verde (nuevo, existente, segunda instalación)"
  exit 0
else
  echo "FAIL: e2e con fallas — ver arriba"
  exit 1
fi
