#!/usr/bin/env sh
# shellcheck shell=sh
#
# Biblioteca compartida por los despachadores de hooks a nivel de máquina.
# No es un hook: git solo ejecuta archivos cuyo nombre coincide con el evento,
# así que este archivo convive en el mismo directorio sin ser invocado nunca.
#
# ADR-0034. Instalado por `devground-init machine`.

# Raíz del repo actual, o cadena vacía si no estamos en uno.
devground_repo_root() {
  git rev-parse --show-toplevel 2>/dev/null || printf ''
}

# ¿Este repo optó por el estándar?
#
# Reglas, en orden:
#   1. `.devground-ignore` en la raíz  -> NO (opt-out explícito, gana siempre).
#   2. `.devground` en la raíz         -> SÍ (opt-in explícito).
#   3. El repo cuelga de una raíz configurada (DEVGROUND_ROOTS) -> SÍ.
#   4. Cualquier otro caso             -> NO.
#
# El caso 4 es el que protege los repos de terceros que clones: el hook global
# se instala una vez, pero no toca nada que no hayas declarado tuyo.
devground_opted_in() {
  repo_root="$1"
  [ -n "$repo_root" ] || return 1
  [ -f "$repo_root/.devground-ignore" ] && return 1
  [ -f "$repo_root/.devground" ] && return 0

  # Raíces cubiertas, en orden de precedencia. Lista separada por ':' (como PATH).
  #
  #   1. $DEVGROUND_ROOTS   — override puntual, y lo que usan los tests.
  #   2. git config devground.roots — lo que persiste `machine --roots`.
  #   3. ~/Developer        — el default.
  #
  # El paso 2 no es opcional: sin él, `--roots` escribiría una configuración que
  # nadie lee y el hook seguiría usando el default en silencio.
  roots="$DEVGROUND_ROOTS"
  if [ -z "$roots" ]; then
    roots=$(git config --get devground.roots 2>/dev/null)
  fi
  [ -n "$roots" ] || roots="$HOME/Developer"
  saved_ifs="$IFS"
  IFS=':'
  for root in $roots; do
    IFS="$saved_ifs"
    [ -n "$root" ] || continue

    # Resolver symlinks antes de comparar. `git rev-parse --show-toplevel`
    # devuelve SIEMPRE la ruta física, así que comparar contra una raíz
    # enlazada falla en silencio: en macOS /var es un symlink a /private/var,
    # y basta con eso para que el hook no cubra un repo que sí debía cubrir.
    resolved=$(cd "$root" 2>/dev/null && pwd -P) || resolved="$root"
    [ -n "$resolved" ] || resolved="$root"

    case "$repo_root/" in
      "$resolved"/*) return 0 ;;
    esac
    IFS=':'
  done
  IFS="$saved_ifs"
  return 1
}

# Encadena al hook propio del repo, si existe.
#
# Esto NO es un detalle: al fijar `core.hooksPath` global, git deja de mirar
# `.git/hooks/` por completo. Sin este encadenado, cualquier hook que el repo ya
# tuviera —automatizaciones de changelog, post-commit propios— dejaría de correr
# en silencio, que es la peor forma de romper algo.
#
# El hook local manda: si falla, el commit falla.
devground_chain_local() {
  hook_name="$1"
  shift
  repo_root=$(devground_repo_root)
  [ -n "$repo_root" ] || return 0

  git_dir=$(git rev-parse --git-dir 2>/dev/null) || return 0
  case "$git_dir" in
    /*) ;;
    *) git_dir="$repo_root/$git_dir" ;;
  esac

  local_hook="$git_dir/hooks/$hook_name"
  if [ -x "$local_hook" ]; then
    "$local_hook" "$@" || return $?
  fi
  return 0
}
