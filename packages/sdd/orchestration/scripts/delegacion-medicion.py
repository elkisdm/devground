#!/usr/bin/env python3
"""Medición semanal de la delegación a subagentes (ADR-0049, contrato C4).

Uso:
  delegacion-medicion.py [--dias N | --desde AAAA-MM-DD] [--json] [--guardar] [--invariantes]
  delegacion-medicion.py --hook      (SessionStart: lee la caché, nunca recorre transcripts)

Rutas por entorno: CLAUDE_PROJECTS, DELEGACION_CONFIG, ENCARGOS_REGISTRO,
DELEGACION_GATE_LOG, DELEGACION_MEDICION_CACHE.
"""
import argparse
import csv
import glob
import json
import os
import re
import statistics
import subprocess
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

CHILE = ZoneInfo("America/Santiago")
HOME = os.path.expanduser("~")
EJECUTORES = ("ejecutor-mecanico", "ejecutor", "ejecutor-critico")
GENERICOS = ("general-purpose", "Explore", "claude")
FAMILIAS = ("opus", "sonnet", "haiku", "fable")
TOK = ("input_tokens", "output_tokens", "cache_read_input_tokens", "cache_creation_input_tokens")

DEFECTO = {
    "umbrales": {
        "ventana_dias": 7,
        "critico_pct_lanzamientos": 12,
        "critico_pct_tokens": 30,
        "max_agentes_por_cambio": 5,
    },
    "gate": {"patron_invariante": r"(?im)^[\s>*_-]*invariante[*_]*\s*:\s*\S"},
    "medicion": {
        "patron_revision": r"revis|review|audit|verific|juez|judge|hallazgo|finding|qa\b",
        "patron_arreglo": r"corregir|arregl|fix|hallazgo|finding|ronda|round",
        "patron_rechazo_critico": r"no es una tarea cr[ií]tica",
        "arreglos_max_por_100_ejecutores": 20,
    },
    "precios_usd_por_millon": {
        "opus": {"entrada": 5.0, "salida": 25.0},
        "sonnet": {"entrada": 3.0, "salida": 15.0},
        "haiku": {"entrada": 1.0, "salida": 5.0},
        "fable": None,
        "cache_lectura_x": 0.1,
        "cache_escritura_x": 1.25,
    },
}


def ruta(var, defecto):
    return os.environ.get(var) or os.path.join(HOME, ".claude", defecto)


def cargar_config():
    cfg = json.loads(json.dumps(DEFECTO))
    try:
        with open(ruta("DELEGACION_CONFIG", "delegacion.json"), encoding="utf-8") as f:
            real = json.load(f)
        for k in ("umbrales", "gate", "medicion", "precios_usd_por_millon"):
            if isinstance(real.get(k), dict):
                cfg[k].update(real[k])
    except (OSError, ValueError):
        pass
    return cfg


def patron_medicion(cfg, clave):
    """Regex (sin distinguir mayúsculas) de medicion.<clave>; si no compila, el valor por defecto."""
    try:
        return re.compile(str(cfg["medicion"][clave]), re.I)
    except (re.error, KeyError, TypeError):
        return re.compile(DEFECTO["medicion"][clave], re.I)


def umbral_arreglos(cfg):
    v = (cfg.get("medicion") or {}).get("arreglos_max_por_100_ejecutores")
    return v if isinstance(v, (int, float)) and not isinstance(v, bool) else DEFECTO["medicion"]["arreglos_max_por_100_ejecutores"]


PREFIJO_INV = re.compile(r"^[\s>*_-]*invariante[*_]*\s*:[*_]*\s*", re.I)


def linea_invariante(prompt, rx):
    for l in str(prompt or "").splitlines():
        if rx.search(l):
            return PREFIJO_INV.sub("", l, count=1).strip()
    return ""


def parse_ts(s):
    try:
        d = datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def chile(d):
    return d.astimezone(CHILE).strftime("%Y-%m-%d %H:%M")


# ---------------------------------------------------------------- lectura

def lineas_json(path, pistas):
    """Genera objetos JSON de las líneas que contienen todas las pistas (descarte barato)."""
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            for line in f:
                if all(p in line for p in pistas):
                    try:
                        yield json.loads(line)
                    except ValueError:
                        continue
    except OSError:
        return


def recientes(patron, desde):
    for p in glob.glob(patron):
        try:
            if datetime.fromtimestamp(os.path.getmtime(p), timezone.utc) >= desde:
                yield p
        except OSError:
            continue


def leer_lanzamientos(root, desde, hasta, patron):
    rx = re.compile(patron)
    out = []
    for p in recientes(os.path.join(root, "*", "*.jsonl"), desde):
        sesion = p
        for o in lineas_json(p, ('"tool_use"',)):
            if o.get("type") != "assistant":
                continue
            ts = parse_ts(o.get("timestamp"))
            if ts is None or not (desde <= ts <= hasta):
                continue
            cont = (o.get("message") or {}).get("content")
            if not isinstance(cont, list):
                continue
            for c in cont:
                if not (isinstance(c, dict) and c.get("type") == "tool_use" and c.get("name") in ("Agent", "Task")):
                    continue
                inp = c.get("input") or {}
                out.append({
                    "tipo": inp.get("subagent_type") or "general-purpose",
                    "model": inp.get("model") or None,
                    "invariante": bool(rx.search(str(inp.get("prompt") or ""))),
                    "linea_invariante": linea_invariante(inp.get("prompt"), rx),
                    "descripcion": str(inp.get("description") or ""),
                    "ts": ts,
                    "sesion": sesion,
                })
    return out


def familia(modelo):
    m = (modelo or "").lower()
    for f in FAMILIAS:
        if f in m:
            return f
    return "desconocida"


def ultimo_texto(path, desde, hasta):
    """Último elemento {"type":"text"} de la última entrada assistant con texto (o None)."""
    ultimo = None
    for o in lineas_json(path, ('"text"',)):
        if o.get("type") != "assistant":
            continue
        ts = parse_ts(o.get("timestamp"))
        if ts is not None and not (desde <= ts <= hasta):
            continue
        cont = (o.get("message") or {}).get("content")
        if not isinstance(cont, list):
            continue
        textos = [c.get("text") for c in cont if isinstance(c, dict) and c.get("type") == "text"
                  and isinstance(c.get("text"), str)]
        if textos:
            ultimo = textos[-1]
    return ultimo


def leer_consumo(root, desde, hasta, rx_rev=None, rx_rechazo=None):
    """tipo -> {turnos, familias: {fam: {tok...}}, revision_tokens, rechazos}. Un message.id cuenta una vez (M-1)."""
    res = defaultdict(lambda: {"turnos": 0, "familias": defaultdict(lambda: dict.fromkeys(TOK, 0)),
                               "revision_tokens": 0, "rechazos": 0})
    for p in recientes(os.path.join(root, "*", "*", "subagents", "*.jsonl"), desde):
        tipo, desc, generico = "desconocido", "", False
        try:
            with open(p[:-6] + ".meta.json", encoding="utf-8") as f:
                meta = json.load(f)
            tipo = meta.get("agentType") or tipo
            desc = str(meta.get("description") or "")
            generico = meta.get("agentType") in (None, "", "general-purpose", "claude")
        except (OSError, ValueError, AttributeError):
            pass
        file_tok = 0
        vistos = set()
        for o in lineas_json(p, ('"usage"',)):
            if o.get("type") != "assistant":
                continue
            ts = parse_ts(o.get("timestamp"))
            if ts is not None and not (desde <= ts <= hasta):
                continue
            msg = o.get("message") or {}
            usage = msg.get("usage")
            if not isinstance(usage, dict):
                continue
            mid = msg.get("id")
            if mid:
                if mid in vistos:
                    continue
                vistos.add(mid)
            r = res[tipo]
            r["turnos"] += 1
            fam = r["familias"][familia(msg.get("model"))]
            for k in TOK:
                v = usage.get(k)
                fam[k] += v if isinstance(v, int) else 0
                file_tok += v if isinstance(v, int) else 0
        if rx_rev is not None and generico and desc and rx_rev.search(desc) and file_tok:
            res[tipo]["revision_tokens"] += file_tok
        if rx_rechazo is not None and tipo == "ejecutor-critico":
            fin = ultimo_texto(p, desde, hasta)
            if fin and rx_rechazo.search(fin):
                res[tipo]["rechazos"] += 1
    return res


def leer_tsv(path, desde, hasta):
    filas = []
    try:
        with open(path, encoding="utf-8", newline="") as f:
            for row in csv.reader(f, delimiter="\t"):
                if not row:
                    continue
                ts = parse_ts(row[0])
                if ts is None or not (desde <= ts <= hasta):
                    continue
                filas.append(row)
    except OSError:
        pass
    return filas


# ---------------------------------------------------------------- cálculo

def costo(familias, precios):
    """USD indicador, o None («pendiente») si una familia con tokens no tiene precio (M-2)."""
    total = 0.0
    for fam, t in familias.items():
        if not any(t.values()):
            continue
        p = precios.get(fam) if fam in FAMILIAS else None
        if not isinstance(p, dict) or p.get("entrada") is None or p.get("salida") is None:
            return None
        e = p["entrada"]
        total += (t["input_tokens"] * e + t["output_tokens"] * p["salida"]
                  + t["cache_read_input_tokens"] * e * precios.get("cache_lectura_x", 0.1)
                  + t["cache_creation_input_tokens"] * e * precios.get("cache_escritura_x", 1.25)) / 1e6
    return round(total, 4)


def total_tokens(familias):
    return sum(sum(t.values()) for t in familias.values())


def proporcion(critico, total):
    """M-4: sin ejecutores no divide ni avisa."""
    return None if not total else round(100.0 * critico / total, 1)


def medir(cfg, desde, hasta):
    root = os.environ.get("CLAUDE_PROJECTS") or os.path.join(HOME, ".claude", "projects")
    um, precios = cfg["umbrales"], cfg["precios_usd_por_millon"]
    lanz = leer_lanzamientos(root, desde, hasta, cfg["gate"]["patron_invariante"])
    rx_rev = patron_medicion(cfg, "patron_revision")
    rx_arr = patron_medicion(cfg, "patron_arreglo")
    cons = leer_consumo(root, desde, hasta, rx_rev, patron_medicion(cfg, "patron_rechazo_critico"))

    tipos = sorted(set(l["tipo"] for l in lanz) | set(cons))
    gran_total = sum(total_tokens(cons[t]["familias"]) for t in cons)
    por_tipo, fams_total = [], defaultdict(lambda: dict.fromkeys(TOK, 0))
    for t in tipos:
        n = sum(1 for l in lanz if l["tipo"] == t)
        fams = cons[t]["familias"] if t in cons else {}
        tk = total_tokens(fams)
        for f, d in fams.items():
            for k in TOK:
                fams_total[f][k] += d[k]
        por_tipo.append({
            "tipo": t, "lanzamientos": n, "turnos": cons[t]["turnos"] if t in cons else 0,
            "tokens": tk, "tokens_por_lanzamiento": round(tk / n) if n else None,
            "costo_usd": costo(fams, precios),
            "pct_tokens": round(100.0 * tk / gran_total, 1) if gran_total else None,
        })
    por_tipo.sort(key=lambda r: -r["tokens"])

    n_l = {t: sum(1 for l in lanz if l["tipo"] == t) for t in EJECUTORES}
    n_t = {t: total_tokens(cons[t]["familias"]) if t in cons else 0 for t in EJECUTORES}
    crit = [l for l in lanz if l["tipo"] == "ejecutor-critico"]
    pl, pt = proporcion(n_l["ejecutor-critico"], sum(n_l.values())), proporcion(n_t["ejecutor-critico"], sum(n_t.values()))
    sobre_l = pl is not None and pl > um["critico_pct_lanzamientos"]
    sobre_t = pt is not None and pt > um["critico_pct_tokens"]

    gen = {}
    for t in GENERICOS:
        ls = [l for l in lanz if l["tipo"] == t]
        pm = defaultdict(int)
        for l in ls:
            pm[l["model"] or "(sin model)"] += 1
        gen[t] = {"lanzamientos": len(ls), "sin_model": sum(1 for l in ls if not l["model"]), "por_modelo": dict(pm)}

    rev = [l for l in lanz if l["tipo"] in ("general-purpose", "claude") and l["descripcion"]
           and rx_rev.search(l["descripcion"])]
    rev_modelo = defaultdict(int)
    for l in rev:
        rev_modelo[l["model"] or "(sin model)"] += 1
    rev_tok = sum(c["revision_tokens"] for c in cons.values())
    revisiones = {"lanzamientos": len(rev), "por_modelo": dict(rev_modelo), "tokens": rev_tok,
                  "pct_tokens": round(100.0 * rev_tok / gran_total, 1) if gran_total else None}

    n_ej = sum(n_l.values())
    arreglos = sum(1 for l in lanz if l["tipo"] in EJECUTORES and l["descripcion"] and rx_arr.search(l["descripcion"]))
    por100 = None if not n_ej else round(100.0 * arreglos / n_ej, 1)  # M-6
    umb_arr = umbral_arreglos(cfg)
    calidad = {"arreglos": arreglos, "lanzamientos_ejecutores": n_ej, "arreglos_por_100": por100,
               "umbral_arreglos_por_100": umb_arr, "sobre_arreglos": por100 is not None and por100 > umb_arr,
               "rechazos_critico": cons["ejecutor-critico"]["rechazos"] if "ejecutor-critico" in cons else 0}

    recientes_inv = sorted((l for l in crit if l["linea_invariante"]), key=lambda l: l["ts"], reverse=True)[:5]
    invariantes_recientes = [{"fecha": chile(l["ts"]), "proyecto": os.path.basename(os.path.dirname(l["sesion"])),
                              "texto": l["linea_invariante"]} for l in recientes_inv]

    ses = defaultdict(int)
    for l in lanz:
        if l["tipo"] in EJECUTORES:
            ses[l["sesion"]] += 1
    sobre_tope = sum(1 for v in ses.values() if v > um["max_agentes_por_cambio"])

    ext = defaultdict(lambda: {"estados": defaultdict(int), "duraciones": []})
    for r in leer_tsv(ruta("ENCARGOS_REGISTRO", "encargos.tsv"), desde, hasta):
        if len(r) < 5:
            continue
        e = ext[r[1]]
        e["estados"][r[4]] += 1
        try:
            e["duraciones"].append(float(r[5]))
        except (IndexError, ValueError):
            pass
    externos = {k: {"estados": dict(v["estados"]), "total": sum(v["estados"].values()),
                    "duracion_mediana_s": round(statistics.median(v["duraciones"])) if v["duraciones"] else None}
                for k, v in sorted(ext.items())}

    gate = defaultdict(lambda: defaultdict(int))
    for r in leer_tsv(ruta("DELEGACION_GATE_LOG", "delegacion-gate.tsv"), desde, hasta):
        if len(r) >= 4:
            gate[r[2]][r[3]] += 1

    return {
        "ventana": {"desde": chile(desde), "hasta": chile(hasta)},
        "umbrales": um,
        "por_tipo": por_tipo,
        "costo_total_usd": costo(fams_total, precios),
        "tokens_total": gran_total,
        "critico": {
            "lanzamientos": n_l["ejecutor-critico"], "lanzamientos_ejecutores": sum(n_l.values()),
            "pct_lanzamientos": pl, "umbral_lanzamientos": um["critico_pct_lanzamientos"], "sobre_lanzamientos": sobre_l,
            "pct_tokens": pt, "umbral_tokens": um["critico_pct_tokens"], "sobre_tokens": sobre_t,
            "con_invariante": sum(1 for l in crit if l["invariante"]),
            "sin_invariante": sum(1 for l in crit if not l["invariante"]),
            "invariantes_recientes": invariantes_recientes,
        },
        "revisiones": revisiones,
        "calidad": calidad,
        "genericos": gen,
        "sesiones_sobre_tope": {"sesiones": sobre_tope, "tope": um["max_agentes_por_cambio"], "aproximado": True},
        "externos": externos,
        "gate": {k: dict(v) for k, v in sorted(gate.items())},
    }


def listar_invariantes(cfg, desde, hasta):
    """A-3: una línea por crítico con invariante: fecha (Chile), proyecto y texto."""
    root = os.environ.get("CLAUDE_PROJECTS") or os.path.join(HOME, ".claude", "projects")
    lanz = leer_lanzamientos(root, desde, hasta, cfg["gate"]["patron_invariante"])
    filas = sorted((l for l in lanz if l["tipo"] == "ejecutor-critico" and l["linea_invariante"]),
                   key=lambda l: l["ts"])
    return [f"{chile(l['ts'])}\t{os.path.basename(os.path.dirname(l['sesion']))}\t{l['linea_invariante']}"
            for l in filas]


# ---------------------------------------------------------------- informe

def usd(v):
    return "pendiente" if v is None else f"US$ {v:,.2f}"


def pct(v):
    return "sin datos" if v is None else f"{v} %"


def texto(r):
    L = [f"Delegación a subagentes, {r['ventana']['desde']} a {r['ventana']['hasta']} (hora de Chile)", ""]
    L.append("1. Por tipo de agente (tokens = entrada + salida + caché)")
    for t in r["por_tipo"]:
        tpl = "-" if t["tokens_por_lanzamiento"] is None else f"{t['tokens_por_lanzamiento']:,}"
        L.append(f"  {t['tipo']}: {t['lanzamientos']} lanz., {t['turnos']} turnos, {t['tokens']:,} tokens "
                 f"({tpl} por lanz.), costo indicador {usd(t['costo_usd'])}, {pct(t['pct_tokens'])} del total")
    L.append(f"  Total: {r['tokens_total']:,} tokens, costo indicador {usd(r['costo_total_usd'])}")
    c = r["critico"]
    L += ["", "2. Ejecutor crítico",
          f"  Parte de los lanzamientos de ejecutores: {pct(c['pct_lanzamientos'])} (umbral {c['umbral_lanzamientos']} %): "
          + ("sobre el umbral" if c["sobre_lanzamientos"] else "dentro"),
          f"  Parte de los tokens de ejecutores: {pct(c['pct_tokens'])} (umbral {c['umbral_tokens']} %): "
          + ("sobre el umbral" if c["sobre_tokens"] else "dentro"),
          f"  Críticos con invariante: {c['con_invariante']}; sin invariante: {c['sin_invariante']}"]
    for i in c.get("invariantes_recientes", []):
        L.append(f"  Invariante reciente: {i['fecha']} {i['proyecto']}: {i['texto']}")
    L += ["", "3. Agentes genéricos por modelo"]
    for t, g in r["genericos"].items():
        mods = ", ".join(f"{m}: {n}" for m, n in sorted(g["por_modelo"].items())) or "-"
        L.append(f"  {t}: {g['lanzamientos']} lanz. ({mods}); sin model: {g['sin_model']}")
    s = r["sesiones_sobre_tope"]
    L += ["", f"4. Sesiones con más de {s['tope']} ejecutores: {s['sesiones']} (aproximación: una sesión puede tener varios cambios)",
          "", "5. Ejecutores externos"]
    if not r["externos"]:
        L.append("  Sin encargos en la ventana")
    for k, v in r["externos"].items():
        est = ", ".join(f"{e}: {n}" for e, n in sorted(v["estados"].items()))
        med = "-" if v["duracion_mediana_s"] is None else f"{v['duracion_mediana_s']} s"
        L.append(f"  {k}: {v['total']} encargos ({est}); duración mediana {med}")
    L += ["", "6. Gate"]
    if not r["gate"]:
        L.append("  Sin decisiones registradas en la ventana")
    for regla, d in r["gate"].items():
        L.append(f"  {regla}: " + ", ".join(f"{k}: {n}" for k, n in sorted(d.items())))
    v = r["revisiones"]
    mods = ", ".join(f"{m}: {n}" for m, n in sorted(v["por_modelo"].items())) or "-"
    L += ["", "7. Revisiones y auditorías genéricas",
          f"  {v['lanzamientos']} lanz. ({mods}); {v['tokens']:,} tokens, {pct(v['pct_tokens'])} de los tokens de subagentes"]
    q = r["calidad"]
    L += ["", "8. Calidad"]
    if q["arreglos_por_100"] is None:
        L.append(f"  Rondas de arreglo: {q['arreglos']}; sin lanzamientos de ejecutores, no se calcula la proporción")
    else:
        L.append(f"  Rondas de arreglo: {q['arreglos']} ({q['arreglos_por_100']:g} por cada 100 ejecutores, umbral "
                 f"{q['umbral_arreglos_por_100']:g}): " + ("sobre el umbral" if q["sobre_arreglos"] else "dentro"))
    L.append(f"  Rechazos del crítico («no es una tarea crítica»): {q['rechazos_critico']}")
    return "\n".join(L)


# ---------------------------------------------------------------- hook

def hook(cfg):
    cache = ruta("DELEGACION_MEDICION_CACHE", "delegacion-medicion.json")
    dias = cfg["umbrales"]["ventana_dias"]
    datos, vieja = None, True
    try:
        with open(cache, encoding="utf-8") as f:
            datos = json.load(f)
        gen = parse_ts(datos.get("generado"))
        if gen is None:
            gen = datetime.fromtimestamp(os.path.getmtime(cache), timezone.utc)
        vieja = datetime.now(timezone.utc) - gen > timedelta(days=dias)
        c = datos["critico"]
        pl, pt = c.get("pct_lanzamientos"), c.get("pct_tokens")
    except (OSError, ValueError, KeyError, TypeError, AttributeError):
        datos, vieja = None, True
    if datos is None or vieja:
        refrescar(cache)
        return
    um = cfg["umbrales"]
    try:
        if isinstance(pl, (int, float)) and pl > um["critico_pct_lanzamientos"]:
            n, m, que = pl, um["critico_pct_lanzamientos"], "de los ejecutores"
        elif isinstance(pt, (int, float)) and pt > um["critico_pct_tokens"]:
            n, m, que = pt, um["critico_pct_tokens"], "de los tokens de los ejecutores"
        else:
            cal = datos.get("calidad")
            a = cal.get("arreglos_por_100") if isinstance(cal, dict) else None
            u = umbral_arreglos(cfg)
            if isinstance(a, (int, float)) and a > u:
                print(f"Delegación: {a:g} rondas de arreglo por cada 100 ejecutores (umbral {u:g}). "
                      "Detalle: python3 ~/.claude/scripts/delegacion-medicion.py")
            return
        print(f"Delegación: el crítico es {n:g} % {que} (umbral {m:g} %). "
              "Detalle: python3 ~/.claude/scripts/delegacion-medicion.py")
    except (KeyError, TypeError, ValueError):
        return


def refrescar(cache):
    if os.environ.get("DELEGACION_MEDICION_HOOK_DRYRUN"):
        try:
            with open(cache + ".lanzado", "w") as f:
                f.write(datetime.now(timezone.utc).isoformat())
        except OSError:
            pass
        return
    subprocess.Popen([sys.executable, os.path.abspath(__file__), "--guardar"],
                     stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                     start_new_session=True)


# ---------------------------------------------------------------- main

def main(argv=None):
    ap = argparse.ArgumentParser(description="Medición de la delegación a subagentes")
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--dias", type=int)
    g.add_argument("--desde", help="AAAA-MM-DD (hora de Chile)")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--guardar", action="store_true")
    ap.add_argument("--hook", action="store_true")
    ap.add_argument("--invariantes", action="store_true")
    a = ap.parse_args(argv)
    cfg = cargar_config()
    if a.hook:
        try:
            hook(cfg)
        except Exception:
            pass
        return 0
    hasta = datetime.now(timezone.utc)
    if a.desde:
        try:
            desde = datetime.strptime(a.desde, "%Y-%m-%d").replace(tzinfo=CHILE).astimezone(timezone.utc)
        except ValueError:
            print("--desde debe tener la forma AAAA-MM-DD", file=sys.stderr)
            return 2
    else:
        desde = hasta - timedelta(days=a.dias or cfg["umbrales"]["ventana_dias"])
    if a.invariantes:
        for fila in listar_invariantes(cfg, desde, hasta):
            print(fila)
        return 0
    r = medir(cfg, desde, hasta)
    if a.guardar:
        r["generado"] = datetime.now(CHILE).isoformat(timespec="seconds")
        cache = ruta("DELEGACION_MEDICION_CACHE", "delegacion-medicion.json")
        os.makedirs(os.path.dirname(cache) or ".", exist_ok=True)
        with open(cache, "w", encoding="utf-8") as f:
            json.dump(r, f, ensure_ascii=False, indent=2)
    print(json.dumps(r, ensure_ascii=False, indent=2) if a.json else texto(r))
    return 0


if __name__ == "__main__":
    sys.exit(main())
