#!/usr/bin/env bash
set -euo pipefail

# E2E de instalación de devground (quickstart, repos existentes e idempotencia).
#
# Corre en CI (job `e2e` de .github/workflows/ci.yml) y también a mano:
#
#   pnpm install --frozen-lockfile && pnpm -r build && bash packages/devground/test/quickstart.e2e.sh
#
# Gestor del proyecto de prueba: `E2E_PM=npm` (default) o `E2E_PM=pnpm`. Con
# pnpm el proyecto se instala con `pnpm install` (genera pnpm-lock.yaml, que es
# lo que detect-stack.ts usa para elegir pnpm) y devground-setup se corre con
# `pnpm exec`.
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
# `pnpm add -D <pkg>` (sin versión) sobre un paquete ya declarado como
# dependencia directa `file:` lo deja "Already up to date": NO reemplaza el
# especificador por la versión del registro (confirmado con pnpm 11.21; el
# helper assert_local_specs lo verifica en los escenarios 1 y 4). Por eso no
# hace falta `pnpm.overrides` y el código instalado es el de los tarballs.
#
# El SCRATCH vive en el tmpdir del sistema, fuera del monorepo, así que ningún
# proyecto de prueba hereda el workspace pnpm del repo (no hay
# pnpm-workspace.yaml en ningún directorio ancestro).
#
# Escenarios (cada uno en su propio proyecto dentro del mismo SCRATCH):
#   1. nuevo: hooks reales, CLAUDE.md respetado, `git commit` exit 0.
#   2. existente: prepare, .husky/pre-commit, .prettierrc y eslint.config.js
#      propios del usuario sobreviven a la instalación.
#   3. segunda instalación: re-correr devground-setup sobre el proyecto
#      "nuevo" no cambia archivos trackeados (idempotencia) y sale con 0.
#   4. next: proyecto Next.js mínimo; se detecta Next (eslint preset next),
#      `eslint .` y `tsc --noEmit` salen con 0 y `git commit` pasa los hooks.
#      No corre `next build`.

E2E_PM="${E2E_PM:-npm}"
case "$E2E_PM" in
  npm | pnpm) ;;
  *)
    echo "E2E_PM debe ser 'npm' o 'pnpm' (recibido: '$E2E_PM')" >&2
    exit 1
    ;;
esac

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

# Instalación y ejecución de binarios con el gestor elegido. Con pnpm, sin
# lockfile previo y en CI, `pnpm install` asume --frozen-lockfile y falla: se
# fuerza --no-frozen-lockfile para que genere pnpm-lock.yaml.
pm_install() {
  if [ "$E2E_PM" = pnpm ]; then pnpm install --no-frozen-lockfile; else npm install; fi
}
pm_exec() {
  if [ "$E2E_PM" = pnpm ]; then pnpm exec "$@"; else npx "$@"; fi
}

# assert_local_specs <etiqueta>: tras devground-setup, todo @devground/*
# directo del package.json debe seguir siendo `file:` (si el
# installer lo pisara con la versión publicada, el E2E probaría código ajeno).
assert_local_specs() {
  local bad
  bad="$(node -e "
const d = require('./package.json').devDependencies || {};
const bad = Object.entries(d).filter(([n, v]) => n.startsWith('@devground/') && !v.startsWith('file:'));
console.log(bad.map(([n, v]) => n + '@' + v).join(' '));
")"
  [ -z "$bad" ] || fail "[$1] el installer reemplazó el especificador file: por versión publicada: $bad"
}

# new_project <nombre>: crea el repo git y su package.json con los tarballs
# locales como devDependencies. Deja el cwd dentro del proyecto. Un
# `scripts` opcional (JSON) se pasa como segundo argumento y las
# `dependencies` opcionales (JSON) como tercero.
new_project() {
  local dir="$SCRATCH/$1"
  local scripts='{}'
  [ -z "${2:-}" ] || scripts="$2"
  local runtime_deps='{}'
  [ -z "${3:-}" ] || runtime_deps="$3"
  mkdir -p "$dir"
  cd "$dir"
  git init -q
  git config user.email "e2e@example.com"
  git config user.name "e2e"
  # Sin esto, `git add -A` stagearía node_modules completo y lint-staged
  # intentaría lintear paquetes de terceros — higiene del harness de prueba.
  echo 'node_modules/' > .gitignore
  DEPS="$DEPS_JSON" RUNTIME_DEPS="$runtime_deps" SCRIPTS="$scripts" PNAME="e2e-$1" node -e "
const fs = require('fs');
const pkg = {
  name: process.env.PNAME,
  version: '1.0.0',
  private: true,
  scripts: JSON.parse(process.env.SCRIPTS),
  devDependencies: JSON.parse(process.env.DEPS),
};
const runtime = JSON.parse(process.env.RUNTIME_DEPS);
if (Object.keys(runtime).length > 0) pkg.dependencies = runtime;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"
  # pnpm resuelve las dependencias TRANSITIVAS de un tarball contra el
  # registro, no contra los `file:` hermanos. Tras un bump de versión (PR de
  # release) @devground/devground pide versiones que aún no están en npm y el
  # install falla con ERR_PNPM_NO_MATCHING_VERSION. Los overrides fuerzan todo
  # @devground/* al tarball local también en el árbol transitivo. Van en
  # pnpm-workspace.yaml: pnpm 11 ya no lee el campo "pnpm" de package.json.
  if [ "$E2E_PM" = pnpm ]; then
    DEPS="$DEPS_JSON" node -e "
const deps = JSON.parse(process.env.DEPS);
const lines = Object.entries(deps).map(([n, v]) => '  \'' + n + '\': \'' + v + '\'');
require('fs').writeFileSync('pnpm-workspace.yaml', 'overrides:\n' + lines.join('\n') + '\n');
"
  fi
}

scenario_nuevo() {
  echo ""
  echo "== escenario 1: proyecto nuevo =="
  new_project nuevo
  echo '# reglas propias del usuario, no deben perderse' > CLAUDE.md
  pm_install
  pm_exec devground-setup

  if [ ! -f .husky/pre-commit ]; then
    fail "[nuevo] falta .husky/pre-commit"
  elif ! grep -q 'lint-staged' .husky/pre-commit; then
    fail "[nuevo] .husky/pre-commit no es el hook real (¿quedó el placeholder de husky init?)"
  fi

  [ -f .husky/commit-msg ] || fail "[nuevo] falta .husky/commit-msg"
  assert_local_specs nuevo

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

  pm_install
  pm_exec devground-setup

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
  pm_exec devground-setup || exit_code=$?
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

scenario_next() {
  echo ""
  echo "== escenario 4: proyecto Next.js =="
  new_project next '{}' '{"next":"^15.0.0","react":"^19.0.0","react-dom":"^19.0.0"}'
  # typescript y @types/* van como devDependencies, como en un proyecto real;
  # así detect-stack ve TypeScript.
  node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
Object.assign(pkg.devDependencies, {
  typescript: '^5.6.0',
  '@types/react': '^19.0.0',
  '@types/node': '^22.0.0',
});
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\\n');
"
  # .next/ y el tsbuildinfo (tsconfig con incremental) no deben llegar al commit.
  printf '.next/\ntsconfig.tsbuildinfo\n' >> .gitignore
  mkdir -p app
  cat > app/layout.tsx <<'EOF_LAYOUT'
import type { ReactNode } from 'react';

export const metadata = { title: 'e2e next' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
EOF_LAYOUT
  cat > app/page.tsx <<'EOF_PAGE'
export default function Page() {
  return <main>Hola</main>;
}
EOF_PAGE
  cat > next-env.d.ts <<'EOF_ENV'
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
EOF_ENV
  cat > tsconfig.json <<'EOF_TS'
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF_TS

  pm_install
  local exit_code=0
  pm_exec devground-setup || exit_code=$?
  [ "$exit_code" -eq 0 ] || fail "[next] devground-setup retornó exit $exit_code (se esperaba 0)"

  assert_local_specs next

  if ! grep -q '@devground/eslint-config/next' eslint.config.mjs 2>/dev/null; then
    fail "[next] no se detectó Next: eslint.config.mjs no usa el preset @devground/eslint-config/next"
  fi

  exit_code=0
  pm_exec eslint . || exit_code=$?
  [ "$exit_code" -eq 0 ] || fail "[next] eslint . retornó exit $exit_code (se esperaba 0)"

  exit_code=0
  pm_exec tsc --noEmit || exit_code=$?
  [ "$exit_code" -eq 0 ] || fail "[next] tsc --noEmit retornó exit $exit_code (se esperaba 0)"

  git add -A
  exit_code=0
  git commit -m "test: verifica que el proyecto next queda commiteable" >"$SCRATCH/commit-next.log" 2>&1 || exit_code=$?
  cat "$SCRATCH/commit-next.log"
  [ "$exit_code" -eq 0 ] || fail "[next] git commit retornó exit $exit_code (se esperaba 0)"
}

scenario_nuevo
scenario_existente
scenario_segunda_instalacion
scenario_next

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "PASS: e2e verde (nuevo, existente, segunda instalación, next) con $E2E_PM"
  exit 0
else
  echo "FAIL: e2e con fallas — ver arriba"
  exit 1
fi
