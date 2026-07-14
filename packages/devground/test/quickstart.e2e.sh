#!/usr/bin/env bash
set -euo pipefail

# E2E del quickstart de @devground/devground (WS1).
#
# No es parte de `node --test` (el nombre usa `.e2e.sh`, no `.test.`) porque
# hace instalaciones npm reales contra el registro (husky, lint-staged,
# eslint, prettier, typescript, commitlint...) y tarda varios minutos. Corre
# a mano con:
#
#   bash packages/devground/test/quickstart.e2e.sh
#
# Empaqueta los paquetes del workspace que este WS modificó (devground,
# devground-init, husky-config, agents-md, lint-staged-config) como tarballs
# locales y los declara como devDependencies DIRECTAS del proyecto de prueba
# con especificador `file:` — así npm los resuelve SIEMPRE al código local.
#
# Por qué no usar `"overrides"`: los installers de devground-init instalan
# @devground/husky-config, @devground/agents-md y @devground/lint-staged-config
# ellos mismos vía `npm install -D <pkg>` (sin versión). Si esos mismos
# paquetes están en "overrides", npm rechaza el install con EOVERRIDE ("Override
# ... conflicts with direct dependency") en cuanto el installer intenta
# agregarlos como dependencia directa. En cambio, si YA están declarados como
# dependencia directa con especificador `file:` ANTES de correr devground-setup,
# el `npm install -D <pkg>` posterior del installer los ve "up to date" y no
# toca el especificador — confirmado empíricamente contra npm 11.16.0.
#
# Verifica:
#   1. `git commit` retorna exit 0 tras correr `devground-setup`.
#   2. Existen .husky/commit-msg y .husky/pre-commit con el contenido real
#      (no el placeholder "npm test" que escribe `husky init`).
#   3. Un CLAUDE.md previo del "usuario" sobrevive intacto.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SCRATCH="$(mktemp -d)"
TARBALLS="$SCRATCH/tarballs"
PROJECT="$SCRATCH/project"
mkdir -p "$TARBALLS" "$PROJECT"

cleanup() {
  rm -rf "$SCRATCH"
}
trap cleanup EXIT

echo "== 1/6 pack de paquetes locales modificados =="
pack() {
  local pkg_dir="$1"
  (cd "$ROOT/$pkg_dir" && pnpm pack --pack-destination "$TARBALLS" >/dev/null)
}
pack packages/devground
pack packages/cli
pack packages/husky-config
pack packages/agents-md
pack packages/lint-staged-config

tarball_for() {
  # $1 = prefijo del nombre de paquete en el tarball (ej: devground-devground, devground-init)
  find "$TARBALLS" -maxdepth 1 -name "$1-*.tgz" | head -1
}

TGZ_DEVGROUND="$(tarball_for devground-devground)"
TGZ_CLI="$(tarball_for devground-init)"
TGZ_HUSKY="$(tarball_for devground-husky-config)"
TGZ_AGENTS="$(tarball_for devground-agents-md)"
TGZ_LINTSTAGED="$(tarball_for devground-lint-staged-config)"

for f in "$TGZ_DEVGROUND" "$TGZ_CLI" "$TGZ_HUSKY" "$TGZ_AGENTS" "$TGZ_LINTSTAGED"; do
  if [ -z "$f" ]; then
    echo "FAIL: no se encontró un tarball esperado en $TARBALLS" >&2
    ls -la "$TARBALLS" >&2
    exit 1
  fi
done

echo "== 2/6 proyecto npm de prueba =="
cd "$PROJECT"
git init -q
git config user.email "e2e@example.com"
git config user.name "e2e"
# Sin esto, `git add -A` más abajo stagearía node_modules completo (miles de
# archivos de eslint/ajv/etc.) y lint-staged intentaría lintear paquetes de
# terceros — no es un bug del producto, es higiene del harness de prueba.
echo 'node_modules/' > .gitignore

node -e "
const fs = require('fs');
const pkg = {
  name: 'e2e-quickstart-test',
  version: '1.0.0',
  private: true,
  devDependencies: {
    '@devground/devground': 'file:$TGZ_DEVGROUND',
    'devground-init': 'file:$TGZ_CLI',
    '@devground/husky-config': 'file:$TGZ_HUSKY',
    '@devground/agents-md': 'file:$TGZ_AGENTS',
    '@devground/lint-staged-config': 'file:$TGZ_LINTSTAGED',
  },
};
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

echo "== 3/6 CLAUDE.md previo del usuario =="
echo '# reglas propias del usuario, no deben perderse' > CLAUDE.md

echo "== 4/6 npm install de los tarballs locales =="
npm install

echo "== 5/6 corre devground-setup (delega en devground-init --yes) =="
npx devground-setup

echo "== 6/6 verificaciones =="
FAIL=0

if [ ! -f .husky/pre-commit ]; then
  echo "FAIL: falta .husky/pre-commit"
  FAIL=1
elif ! grep -q 'lint-staged' .husky/pre-commit; then
  echo "FAIL: .husky/pre-commit no es el hook real (¿quedó el placeholder de husky init?)"
  FAIL=1
fi

if [ ! -f .husky/commit-msg ]; then
  echo "FAIL: falta .husky/commit-msg"
  FAIL=1
fi

CLAUDE_CONTENT="$(cat CLAUDE.md)"
if [ "$CLAUDE_CONTENT" != "# reglas propias del usuario, no deben perderse" ]; then
  echo "FAIL: CLAUDE.md previo del usuario fue modificado/sobreescrito"
  echo "contenido actual: $CLAUDE_CONTENT"
  FAIL=1
fi

echo "test marker" > marker.txt
git add -A
set +e
git commit -m "test: verifica que el quickstart deja el repo commiteable" >"$SCRATCH/commit.log" 2>&1
COMMIT_EXIT=$?
set -e
cat "$SCRATCH/commit.log"
if [ "$COMMIT_EXIT" -ne 0 ]; then
  echo "FAIL: git commit retornó exit $COMMIT_EXIT (se esperaba 0)"
  FAIL=1
fi

if [ "$FAIL" -eq 0 ]; then
  echo ""
  echo "PASS: quickstart e2e verde (git commit exit 0, hooks reales instalados, CLAUDE.md respetado)"
  exit 0
else
  echo ""
  echo "FAIL: quickstart e2e con fallas — ver arriba"
  exit 1
fi
