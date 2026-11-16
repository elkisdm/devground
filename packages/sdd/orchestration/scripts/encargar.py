#!/usr/bin/env python3
"""Único punto de entrada a un ejecutor externo (Codex, Cursor...): árbol de trabajo propio,
candado de push, cupo, parche, informe y registro (ADR-0049, contrato C2).

  encargar.py disponibles [--json]
  encargar.py cupo
  encargar.py lanzar <ejecutor> --repo <dir> --nombre <slug> --encargo <archivo.md>
                     [--base <ref>] [--dir <árbol existente>] [--sandbox <modo>]
                     [--preparar "<comando>"] [--timeout-min 45] [--sin-reglas]
  encargar.py limpiar --repo <dir> --nombre <slug> [--forzar]
  encargar.py desbloquear --repo <dir>

Entorno: DELEGACION_CONFIG, ENCARGOS_DIR, ENCARGOS_REGISTRO, ENCARGOS_REGLAS, CODEX_HOME.
Códigos de salida: 0 ok · 3 cupo/no-responde · 4 sin-informe/sin-cambios · 5 commit-indebido ·
1 fallo/tiempo · 2 uso inválido.
"""
import argparse
import base64
import copy
import datetime
import fcntl
import glob
import json
import os
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import time
from contextlib import contextmanager
from zoneinfo import ZoneInfo

CHILE = ZoneInfo("America/Santiago")
NOMBRE_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,40}$")
PUSHURL_BLOQUEADO = "no-push://encargo-en-curso"
SIN_DEFINIR = "sin-definir"
TOPE_SONDA_S = 90
SALIDA = {"ok": 0, "cupo": 3, "no-responde": 3, "sin-informe": 4, "sin-cambios": 4,
          "commit-indebido": 5, "fallo": 1, "tiempo": 1}
CABECERA_REGISTRO = ["fecha", "ejecutor", "nombre", "repo", "estado", "duracion_s",
                     "archivos", "cupo_antes", "cupo_despues", "salida"]

# Valores por defecto: iguales a ~/.claude/delegacion.json (C1) por si falta o no parsea.
DEFAULTS = {
    "umbrales": {"ventana_dias": 7, "critico_pct_lanzamientos": 12,
                 "critico_pct_tokens": 30, "max_agentes_por_cambio": 5},
    "ejecutores_externos": {
        "codex": {
            "activo": True,
            "comando": ["codex", "exec", "-s", "{sandbox}", "-C", "{dir}",
                        "--output-last-message", "{informe}", "{encargo}"],
            "informe": "archivo", "sandbox": "workspace-write",
            "errores_cupo": ["^ERROR: You’ve hit", "^ERROR: You've hit"],
            "cupo": "codex", "cupo_max_pct": 85, "sonda": False,
            "sirve_para": "lógica autocontenida con pruebas, de varios archivos; encargos largos",
            "no_sirve_para": "revisiones de seguridad planteadas como ataque (las rechaza)",
        },
        "cursor:grok": {
            "activo": True,
            "comando": ["cursor-agent", "-p", "--trust", "-f", "--model", "grok-4.7-xhigh",
                        "--output-format", "text", "{encargo}"],
            "informe": "stdout", "errores_cupo": ["not included in your weekly usage"], "sonda": True,
            "sirve_para": "lógica e interfaz autocontenida; rápido",
            "no_sirve_para": "dar por bueno su trabajo visual sin verlo en navegador",
        },
        "cursor:composer": {
            "activo": True,
            "comando": ["cursor-agent", "-p", "--trust", "-f", "--model", "composer-2.5",
                        "--output-format", "text", "{encargo}"],
            "informe": "stdout", "errores_cupo": ["not included in your weekly usage"], "sonda": True,
            "sirve_para": "cambios mecánicos y lógica simple de muchos archivos; muy rápido",
            "no_sirve_para": "dar por bueno su trabajo visual sin verlo en navegador",
        },
    },
}


class Uso(Exception):
    """Uso inválido: una línea en stderr y exit 2."""


# ---------- configuración y rutas ----------

def ruta_env(var, defecto):
    return os.environ.get(var) or os.path.expanduser(defecto)


def cargar_config():
    cfg = copy.deepcopy(DEFAULTS)
    try:
        with open(ruta_env("DELEGACION_CONFIG", "~/.claude/delegacion.json")) as f:
            datos = json.load(f)
        if isinstance(datos, dict):
            for clave in DEFAULTS:
                if clave in datos:
                    cfg[clave] = datos[clave]
    except Exception:
        pass
    return cfg


def ahora():
    return datetime.datetime.now(CHILE)


def git(cwd, *args):
    return subprocess.run(["git", "-C", cwd, *args], capture_output=True, text=True)


def raiz_repo(repo):
    if not os.path.isdir(repo):
        raise Uso(f"--repo no es una carpeta: {repo}")
    r = git(repo, "rev-parse", "--show-toplevel")
    if r.returncode != 0:
        raise Uso(f"--repo no es un repo git: {repo}")
    return os.path.realpath(r.stdout.strip())


def dir_comun(repo):
    r = git(repo, "rev-parse", "--path-format=absolute", "--git-common-dir")
    if r.returncode != 0:
        raise Uso(f"no se pudo leer el directorio git de {repo}")
    return os.path.realpath(r.stdout.strip())


def validar_nombre(nombre):
    if not NOMBRE_RE.match(nombre or ""):
        raise Uso(f"--nombre inválido (debe cumplir {NOMBRE_RE.pattern}): {nombre}")


# ---------- cupo de Codex (portado de cupo-codex.py) ----------

def _busca(x):
    if isinstance(x, dict):
        r = x.get("rate_limits")
        if isinstance(r, dict) and (r.get("primary") or r.get("secondary")):
            return r
        for v in x.values():
            q = _busca(v)
            if q:
                return q
    elif isinstance(x, list):
        for v in x:
            q = _busca(v)
            if q:
                return q
    return None


def ultimo_cupo():
    """(timestamp, rate_limits) de la medición más nueva en los 25 archivos más recientes."""
    patron = os.path.join(ruta_env("CODEX_HOME", "~/.codex"), "sessions", "**", "*.jsonl")
    archivos = sorted(glob.glob(patron, recursive=True), key=os.path.getmtime)[-25:]
    mejor = None
    for f in archivos:
        try:
            lineas = open(f, errors="ignore").read().splitlines()
        except OSError:
            continue
        for linea in lineas:
            if "used_percent" not in linea:
                continue
            try:
                o = json.loads(linea)
            except ValueError:
                continue
            r = _busca(o)
            if r and (mejor is None or (o.get("timestamp") or "") > mejor[0]):
                mejor = (o.get("timestamp") or "", r)
    return mejor


def porcentaje_codex():
    u = ultimo_cupo()
    if not u:
        return None
    usado = (u[1].get("primary") or {}).get("used_percent")
    return usado if isinstance(usado, (int, float)) else None


def plan_codex():
    try:
        with open(os.path.join(ruta_env("CODEX_HOME", "~/.codex"), "auth.json")) as f:
            t = (json.load(f).get("tokens") or {}).get("id_token", "")
        p = t.split(".")[1]
        d = json.loads(base64.urlsafe_b64decode(p + "=" * (-len(p) % 4)))
        return d.get("https://api.openai.com/auth", {}).get("chatgpt_plan_type")
    except Exception:
        return None


def hora_chile(ts):
    if isinstance(ts, (int, float)):
        return datetime.datetime.fromtimestamp(ts, CHILE).strftime("%d-%m %H:%M")
    return str(ts)


# ---------- ejecución de procesos ----------

def reemplazar(plantilla, valores):
    return re.sub(r"\{(encargo|dir|informe|sandbox)\}", lambda m: valores[m.group(1)], plantilla)


def armar_comando(ej, encargo, dir_, informe, sandbox):
    valores = {"encargo": encargo, "dir": dir_, "informe": informe, "sandbox": sandbox}
    return [reemplazar(parte, valores) for parte in ej["comando"]]


def matar(p):
    try:
        os.killpg(p.pid, signal.SIGKILL)
    except (ProcessLookupError, PermissionError):
        pass
    try:
        p.wait()
    except Exception:
        pass


def correr(cmd, cwd, salida, tope_s, salida_err=None):
    """Corre sin stdin y con tope. salida_err=None mezcla stderr en `salida`.
    Devuelve (codigo, vencio_el_tope)."""
    with open(salida, "ab") as out:
        err = subprocess.STDOUT
        if salida_err is not None:
            err = open(salida_err, "ab")
        try:
            try:
                p = subprocess.Popen(cmd, cwd=cwd, stdin=subprocess.DEVNULL, stdout=out,
                                     stderr=err, start_new_session=True)
            except OSError as e:
                out.write(f"no se pudo ejecutar: {e}\n".encode())
                return 127, False
            try:
                return p.wait(timeout=tope_s), False
            except subprocess.TimeoutExpired:
                matar(p)
                return p.returncode, True
            except BaseException:
                matar(p)
                raise
        finally:
            if salida_err is not None:
                err.close()


def calza(patrones, texto):
    for p in patrones or []:
        try:
            if re.search(p, texto, re.M):
                return True
        except re.error:
            if p in texto:
                return True
    return False


def leer(ruta):
    try:
        with open(ruta, errors="replace") as f:
            return f.read()
    except OSError:
        return ""


def sonda(ej, sandbox):
    """None si responde bien; 'cupo' o 'no-responde' en otro caso."""
    with tempfile.TemporaryDirectory() as d:
        salida, informe = os.path.join(d, "salida.txt"), os.path.join(d, "informe.md")
        cmd = armar_comando(ej, "Responde solo: OK", d, informe, sandbox)
        codigo, vencio = correr(cmd, d, salida, TOPE_SONDA_S)
        texto = leer(salida) + "\n" + leer(informe)
        if vencio:
            return "no-responde"
        if calza(ej.get("errores_cupo"), texto):
            return "cupo"
        if codigo != 0 or "OK" not in texto:
            return "no-responde"
        return None


# ---------- candado de push ----------

@contextmanager
def candado(common):
    with open(os.path.join(common, "encargos-activos.lock"), "w") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)


def marcas(activos):
    try:
        return sorted(n for n in os.listdir(activos) if not n.startswith("."))
    except OSError:
        return []


def restaurar_pushurl(repo, activos):
    original = os.path.join(activos, ".pushurl-original")
    if os.path.exists(original):
        tipo, _, valor = leer(original).partition("\n")
        if tipo == SIN_DEFINIR:
            git(repo, "config", "--unset-all", "remote.origin.pushurl")
        else:
            git(repo, "config", "remote.origin.pushurl", valor)
    shutil.rmtree(activos, ignore_errors=True)


def poner_candado(repo, common, nombre):
    if git(repo, "config", "--get", "remote.origin.url").returncode != 0:
        return
    with candado(common):
        activos = os.path.join(common, "encargos-activos")
        os.makedirs(activos, exist_ok=True)
        original = os.path.join(activos, ".pushurl-original")
        if not os.path.exists(original):
            r = git(repo, "config", "--get", "remote.origin.pushurl")
            actual = r.stdout.rstrip("\n") if r.returncode == 0 else None
            with open(original, "w") as f:
                f.write(SIN_DEFINIR if actual is None else "valor\n" + actual)
        with open(os.path.join(activos, nombre), "w") as f:
            f.write(str(os.getpid()))
        git(repo, "config", "remote.origin.pushurl", PUSHURL_BLOQUEADO)


def quitar_candado(repo, common, nombre):
    activos = os.path.join(common, "encargos-activos")
    if not os.path.isdir(activos):
        return
    with candado(common):
        try:
            os.remove(os.path.join(activos, nombre))
        except OSError:
            pass
        if not marcas(activos):
            restaurar_pushurl(repo, activos)


def pid_vivo(pid):
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


# ---------- registro y resultado ----------

def registrar(fila):
    ruta = ruta_env("ENCARGOS_REGISTRO", "~/.claude/encargos.tsv")
    os.makedirs(os.path.dirname(ruta) or ".", exist_ok=True)
    nuevo = not os.path.exists(ruta)
    limpio = [str(v).replace("\t", " ").replace("\n", " ") for v in fila]
    with open(ruta, "a") as f:
        f.write(("\t".join(CABECERA_REGISTRO) + "\n" if nuevo else "") + "\t".join(limpio) + "\n")


def fmt_pct(v):
    return "" if v is None else v


def terminar_previo(a, repo, estado, cupo_antes, inicio):
    """cupo / no-responde antes de crear nada: solo registro y resultado por stdout."""
    dur = round(time.monotonic() - inicio, 1)
    registrar([ahora().isoformat(timespec="seconds"), a.ejecutor, a.nombre, repo, estado, dur,
               0, fmt_pct(cupo_antes), "", ""])
    print(json.dumps({"estado": estado, "ejecutor": a.ejecutor, "nombre": a.nombre,
                      "duracion_s": dur, "cupo_antes": cupo_antes}, ensure_ascii=False, indent=2))
    return SALIDA[estado]


# ---------- lanzar ----------

def carpeta_salida(nombre):
    base = os.path.join(ruta_env("ENCARGOS_DIR", "~/.claude/encargos"),
                        f"{ahora().strftime('%Y-%m-%d')}-{nombre}")
    ruta, n = base, 2
    while os.path.exists(ruta):
        ruta, n = f"{base}-{n}", n + 1
    os.makedirs(ruta)
    return ruta


def cmd_lanzar(a):
    cfg = cargar_config()
    ej = cfg["ejecutores_externos"].get(a.ejecutor)
    if not isinstance(ej, dict):
        raise Uso(f"ejecutor desconocido: {a.ejecutor}")
    if not ej.get("activo"):
        raise Uso(f"ejecutor inactivo: {a.ejecutor}")
    comando = ej.get("comando")
    if not comando or not shutil.which(comando[0]):
        raise Uso(f"el binario del ejecutor no está en el PATH: {comando[0] if comando else '?'}")
    repo = raiz_repo(a.repo)
    if not os.path.isfile(a.encargo):
        raise Uso(f"el encargo no existe: {a.encargo}")
    validar_nombre(a.nombre)
    reglas_ruta = ruta_env("ENCARGOS_REGLAS", "~/.claude/plantillas/encargo-reglas.md")
    if not a.sin_reglas and not os.path.isfile(reglas_ruta):
        raise Uso(f"falta la plantilla de reglas ({reglas_ruta}); usa --sin-reglas para omitirla")
    if a.dir:
        arbol = os.path.realpath(a.dir)
        if not os.path.isdir(arbol):
            raise Uso(f"--dir no es una carpeta: {a.dir}")
    else:
        arbol = f"{repo}-wt-enc-{a.nombre}"
        if os.path.exists(arbol):
            raise Uso(f"el árbol de trabajo ya existe: {arbol}")
    sandbox = a.sandbox or ej.get("sandbox") or "workspace-write"
    inicio = time.monotonic()

    cupo_antes = None
    if ej.get("cupo") == "codex":
        cupo_antes = porcentaje_codex()
        if cupo_antes is not None and cupo_antes >= ej.get("cupo_max_pct", 85):
            return terminar_previo(a, repo, "cupo", cupo_antes, inicio)
    if ej.get("sonda"):
        previo = sonda(ej, sandbox)
        if previo:
            return terminar_previo(a, repo, previo, cupo_antes, inicio)

    signal.signal(signal.SIGTERM, lambda *_: sys.exit(143))
    if a.dir:
        rama = git(arbol, "rev-parse", "--abbrev-ref", "HEAD").stdout.strip()
    else:
        rama = f"encargo/{a.nombre}"
        r = git(repo, "worktree", "add", "-b", rama, arbol, a.base or "HEAD")
        if r.returncode != 0:
            raise Uso(f"no se pudo crear el árbol de trabajo: {r.stderr.strip()}")
    base = git(arbol, "rev-parse", "HEAD").stdout.strip()
    salida = carpeta_salida(a.nombre)
    p_encargo, p_log, p_informe = (os.path.join(salida, n) for n in ("encargo.md", "log.txt", "informe.md"))
    p_parche, p_resultado = os.path.join(salida, "cambios.patch"), os.path.join(salida, "resultado.json")

    texto = leer(a.encargo)
    if not a.sin_reglas:
        texto = texto.rstrip("\n") + "\n\n" + leer(reglas_ruta)
    with open(p_encargo, "w") as f:
        f.write(texto)

    common = dir_comun(repo)
    vencio, codigo = False, 0
    try:
        if a.preparar:
            prep = subprocess.run(a.preparar, shell=True, cwd=arbol, capture_output=True, text=True)
            if prep.returncode != 0:
                with open(p_log, "w") as f:
                    f.write(f"--preparar falló ({prep.returncode}):\n{prep.stdout}{prep.stderr}")
                codigo = 1
        if codigo == 0:
            poner_candado(repo, common, a.nombre)
            cmd = armar_comando(ej, texto, arbol, p_informe, sandbox)
            tope = a.timeout_min * 60
            if ej.get("informe") == "stdout":
                codigo, vencio = correr(cmd, arbol, p_informe, tope, salida_err=p_log)
                with open(p_log, "a") as f:
                    f.write("\n--- salida estándar ---\n" + leer(p_informe))
            else:
                codigo, vencio = correr(cmd, arbol, p_log, tope)
    finally:
        quitar_candado(repo, common, a.nombre)

    git(arbol, "add", "-A")
    parche = git(arbol, "diff", "--cached", "--binary", base).stdout
    archivos = git(arbol, "diff", "--cached", "--name-only", base).stdout.split("\n")
    archivos = [x for x in archivos if x]
    diffstat = git(arbol, "diff", "--cached", "--stat", base).stdout.rstrip()
    with open(p_parche, "w") as f:
        f.write(parche)

    if vencio:
        estado = "tiempo"
    elif calza(ej.get("errores_cupo"), leer(p_log)):
        estado = "cupo"
    elif codigo != 0:
        estado = "fallo"
    elif git(arbol, "rev-parse", "HEAD").stdout.strip() != base:
        estado = "commit-indebido"
    elif not leer(p_informe).strip():
        estado = "sin-informe"
    elif not parche.strip():
        estado = "sin-cambios"
    else:
        estado = "ok"

    dur = round(time.monotonic() - inicio, 1)
    cupo_despues = porcentaje_codex() if ej.get("cupo") == "codex" else None
    registrar([ahora().isoformat(timespec="seconds"), a.ejecutor, a.nombre, repo, estado, dur,
               len(archivos), fmt_pct(cupo_antes), fmt_pct(cupo_despues), salida])
    resultado = {"estado": estado, "ejecutor": a.ejecutor, "nombre": a.nombre, "arbol": arbol,
                 "rama": rama, "base": base, "archivos": archivos, "diffstat": diffstat,
                 "informe": p_informe, "parche": p_parche, "log": p_log, "duracion_s": dur,
                 "cupo_antes": cupo_antes, "cupo_despues": cupo_despues, "salida": salida}
    with open(p_resultado, "w") as f:
        json.dump(resultado, f, ensure_ascii=False, indent=2)
    print(json.dumps(resultado, ensure_ascii=False, indent=2))
    return SALIDA[estado]


# ---------- disponibles / cupo ----------

def cmd_disponibles(a):
    cfg = cargar_config()
    filas = []
    for nombre, ej in cfg["ejecutores_externos"].items():
        if not isinstance(ej, dict) or not ej.get("activo"):
            continue
        binario = (ej.get("comando") or [""])[0]
        presente = bool(binario) and shutil.which(binario) is not None
        pct = porcentaje_codex() if ej.get("cupo") == "codex" else None
        maximo = ej.get("cupo_max_pct")
        sobre = pct is not None and maximo is not None and pct >= maximo
        filas.append({"ejecutor": nombre, "binario": binario, "presente": presente,
                      "cupo_pct": pct, "cupo_max_pct": maximo, "apto": presente and not sobre,
                      "sirve_para": ej.get("sirve_para", ""), "no_sirve_para": ej.get("no_sirve_para", "")})
    if a.json:
        print(json.dumps(filas, ensure_ascii=False, indent=2))
        return 0
    for f in filas:
        cupo = "" if f["cupo_pct"] is None else f" · cupo {f['cupo_pct']} % (máximo {f['cupo_max_pct']} %)"
        binario = "binario presente" if f["presente"] else f"sin binario `{f['binario']}`"
        print(f"{f['ejecutor']}: {'apto' if f['apto'] else 'no apto'} · {binario}{cupo}")
        print(f"  sirve para: {f['sirve_para']}")
        print(f"  no sirve para: {f['no_sirve_para']}")
    return 0


def cmd_cupo(a):
    u = ultimo_cupo()
    if not u:
        print("Sin datos de cupo en $CODEX_HOME/sessions", file=sys.stderr)
        return 1
    ts, r = u
    medido = datetime.datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone(CHILE).strftime("%d-%m %H:%M")
    print(f"plan {r.get('plan_type') or plan_codex()} · medido {medido} (hora de Chile)")
    for nombre, v in (("primaria", r.get("primary") or {}), ("secundaria", r.get("secondary") or {})):
        usado, minutos = v.get("used_percent"), v.get("window_minutes")
        if usado is None:
            print(f"ventana {nombre}: no existe en este plan")
            continue
        dur = f"{minutos / 1440:g} días" if minutos and minutos >= 1440 else f"{(minutos or 0) / 60:g} h"
        print(f"ventana {nombre} ({dur}): {usado} % usado · vuelve {hora_chile(v.get('resets_at'))} (hora de Chile)")
    return 0


# ---------- limpiar / desbloquear ----------

def trabajo_sin_guardar(repo, arbol):
    """Motivo si el árbol tiene trabajo que no está en un cambios.patch guardado; None si no."""
    guardado = None
    raiz = ruta_env("ENCARGOS_DIR", "~/.claude/encargos")
    for carpeta in sorted(glob.glob(os.path.join(raiz, "*", "resultado.json"))):
        try:
            with open(carpeta) as f:
                datos = json.load(f)
        except (OSError, ValueError):
            continue
        if datos.get("arbol") == arbol:
            guardado = datos
    if guardado is None:
        if git(arbol, "status", "--porcelain").stdout.strip():
            return "el árbol tiene cambios y no hay un cambios.patch guardado"
        repo_head = git(repo, "rev-parse", "HEAD").stdout.strip()
        if git(arbol, "merge-base", "--is-ancestor", "HEAD", repo_head).returncode != 0:
            return "la rama tiene commits que no están en el repo y no hay un cambios.patch guardado"
        return None
    git(arbol, "add", "-A")
    actual = git(arbol, "diff", "--cached", "--binary", guardado["base"]).stdout
    if actual != leer(guardado["parche"]):
        return "el árbol tiene cambios que no están en el cambios.patch guardado"
    return None


def cmd_limpiar(a):
    validar_nombre(a.nombre)
    repo = raiz_repo(a.repo)
    arbol = f"{repo}-wt-enc-{a.nombre}"
    if not os.path.isdir(arbol):
        raise Uso(f"no existe el árbol de trabajo: {arbol}")
    if not a.forzar:
        motivo = trabajo_sin_guardar(repo, arbol)
        if motivo:
            raise Uso(f"{motivo}; usa --forzar para borrarlo igual")
    r = git(repo, "worktree", "remove", "--force", arbol)
    if r.returncode != 0:
        raise Uso(f"no se pudo borrar el árbol: {r.stderr.strip()}")
    git(repo, "branch", "-D", f"encargo/{a.nombre}")
    print(f"borrados {arbol} y la rama encargo/{a.nombre}")
    return 0


def cmd_desbloquear(a):
    repo = raiz_repo(a.repo)
    common = dir_comun(repo)
    activos = os.path.join(common, "encargos-activos")
    if not os.path.isdir(activos):
        print("no hay encargos activos ni candado que quitar")
        return 0
    with candado(common):
        for nombre in marcas(activos):
            try:
                pid = int(leer(os.path.join(activos, nombre)).strip())
            except ValueError:
                pid = 0
            if pid > 0 and pid_vivo(pid):
                print(f"sigue en curso: {nombre} (PID {pid})")
            else:
                os.remove(os.path.join(activos, nombre))
                print(f"marca huérfana quitada: {nombre}")
        if not marcas(activos):
            restaurar_pushurl(repo, activos)
            print("pushurl restaurado")
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(prog="encargar.py", description=__doc__.split("\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("disponibles")
    s.add_argument("--json", action="store_true")
    sub.add_parser("cupo")
    s = sub.add_parser("lanzar")
    s.add_argument("ejecutor")
    s.add_argument("--repo", required=True)
    s.add_argument("--nombre", required=True)
    s.add_argument("--encargo", required=True)
    s.add_argument("--base")
    s.add_argument("--dir")
    s.add_argument("--sandbox")
    s.add_argument("--preparar")
    s.add_argument("--timeout-min", type=float, default=45)
    s.add_argument("--sin-reglas", action="store_true")
    s = sub.add_parser("limpiar")
    s.add_argument("--repo", required=True)
    s.add_argument("--nombre", required=True)
    s.add_argument("--forzar", action="store_true")
    s = sub.add_parser("desbloquear")
    s.add_argument("--repo", required=True)
    a = ap.parse_args(argv)
    try:
        return {"disponibles": cmd_disponibles, "cupo": cmd_cupo, "lanzar": cmd_lanzar,
                "limpiar": cmd_limpiar, "desbloquear": cmd_desbloquear}[a.cmd](a)
    except Uso as e:
        print(f"encargar.py: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
