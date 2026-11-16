#!/usr/bin/env python3
"""Hook PreToolUse (matcher Agent|Task): niega un ejecutor-critico sin invariante y un agente
generico sin `model` (ADR-0049, ADR-0031). Falla abierto: es un control de costo, no de seguridad.
Parametros: DELEGACION_CONFIG o ~/.claude/delegacion.json. Apagar: gate.modo = "apagado" o DELEGACION_GATE=off."""
import json
import os
import re
import sys

DEFECTO = {
    "modo": "bloquear",
    "exigir_modelo_en": ["general-purpose", "Explore", "claude", ""],
    "exigir_invariante_en": ["ejecutor-critico"],
    "patron_invariante": r"(?im)^[\s>*_-]*invariante[*_]*\s*:\s*\S",
}

MSG_MODELO = ("Falta `model` explícito (ADR-0031): `sonnet` para buscar, leer o implementar; "
              "`haiku` para lo mecánico; `opus` solo para juicio.")
MSG_INVARIANTE = ("`ejecutor-critico` exige una línea `Invariante: <qué debe cumplirse siempre> → "
                  "<prueba que lo rompe>` (ADR-0049). Si no hay un invariante de auth, dinero, dato "
                  "irreversible o contrato externo, usa `ejecutor` (con `effort: \"high\"` si la "
                  "lógica es delicada).")


def cargar_gate():
    gate = dict(DEFECTO)
    ruta = os.environ.get("DELEGACION_CONFIG") or os.path.expanduser("~/.claude/delegacion.json")
    try:
        with open(ruta, encoding="utf-8") as f:
            g = json.load(f).get("gate", {})
        if isinstance(g, dict):
            for k in DEFECTO:
                if k in g:
                    gate[k] = g[k]
    except Exception:
        pass
    return gate


def registrar(tipo, regla, decision):
    try:
        from datetime import datetime
        from zoneinfo import ZoneInfo
        ruta = os.environ.get("DELEGACION_GATE_LOG") or os.path.expanduser("~/.claude/delegacion-gate.tsv")
        nuevo = not os.path.exists(ruta)
        fecha = datetime.now(ZoneInfo("America/Santiago")).isoformat(timespec="seconds")
        with open(ruta, "a", encoding="utf-8") as f:
            if nuevo:
                f.write("fecha\ttipo\tregla\tdecision\n")
            f.write(f"{fecha}\t{tipo}\t{regla}\t{decision}\n")
    except Exception:
        pass


def evaluar(evento, gate):
    """Devuelve (regla, mensaje) o None."""
    if evento.get("tool_name") not in ("Agent", "Task"):
        return None
    ti = evento.get("tool_input")
    if not isinstance(ti, dict):
        return None
    tipo = ti.get("subagent_type") or ""
    if tipo in gate["exigir_modelo_en"] and not ti.get("model"):
        return tipo, "G-1", MSG_MODELO
    if tipo in gate["exigir_invariante_en"]:
        prompt = ti.get("prompt") or ""
        if not re.search(gate["patron_invariante"], prompt):
            return tipo, "G-2", MSG_INVARIANTE
    return None


def main():
    try:
        if os.environ.get("DELEGACION_GATE", "").lower() == "off":
            return
        raw = sys.stdin.read()
        if not raw.strip():
            return
        evento = json.loads(raw)
        if not isinstance(evento, dict):
            return
        gate = cargar_gate()
        if gate["modo"] not in ("bloquear", "avisar"):
            return
        r = evaluar(evento, gate)
        if not r:
            return
        tipo, regla, msg = r
        if gate["modo"] == "bloquear":
            registrar(tipo, regla, "negado")
            print(json.dumps({"hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": msg}}, ensure_ascii=False))
        else:
            registrar(tipo, regla, "avisado")
            print(json.dumps({"systemMessage": msg}, ensure_ascii=False))
    except Exception:
        pass


if __name__ == "__main__":
    main()
    sys.exit(0)
