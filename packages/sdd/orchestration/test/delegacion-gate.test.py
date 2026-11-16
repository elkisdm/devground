#!/usr/bin/env python3
"""Pruebas de delegacion-gate.py: python3 delegacion-gate.test.py
Sin dependencias. Usa config y registro temporales; nunca escribe en ~/.claude.
DELEGACION_GATE_SCRIPT permite apuntar a otra copia del hook (para verificar las pruebas en ambos sentidos)."""
import json
import os
import subprocess
import sys
import tempfile
import unittest

AQUI = os.path.dirname(os.path.abspath(__file__))


def ubicar():
    if os.environ.get("DELEGACION_GATE_SCRIPT"):
        return os.environ["DELEGACION_GATE_SCRIPT"]
    for d in (AQUI, os.path.join(AQUI, "..", "scripts")):
        p = os.path.join(d, "delegacion-gate.py")
        if os.path.exists(p):
            return p
    raise FileNotFoundError("delegacion-gate.py")


SCRIPT = ubicar()

GATE = {
    "modo": "bloquear",
    "exigir_modelo_en": ["general-purpose", "Explore", "claude", ""],
    "exigir_invariante_en": ["ejecutor-critico"],
    "patron_invariante": r"(?im)^[\s>*_-]*invariante[*_]*\s*:\s*\S",
}


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.cfg = os.path.join(self.tmp.name, "delegacion.json")
        self.log = os.path.join(self.tmp.name, "gate.tsv")
        self.escribir_cfg({})

    def escribir_cfg(self, gate):
        with open(self.cfg, "w") as f:
            json.dump({"gate": {**GATE, **gate}}, f)

    def correr(self, entrada, extra_env=None):
        env = {**os.environ, "DELEGACION_CONFIG": self.cfg, "DELEGACION_GATE_LOG": self.log}
        env.pop("DELEGACION_GATE", None)
        env.update(extra_env or {})
        if not isinstance(entrada, str):
            entrada = json.dumps(entrada)
        p = subprocess.run([sys.executable, SCRIPT], input=entrada, capture_output=True,
                           text=True, env=env, timeout=10)
        return p.returncode, p.stdout.strip()

    def agente(self, tipo=None, model=None, prompt="haz algo", tool="Agent"):
        ti = {"prompt": prompt, "description": "x"}
        if tipo is not None:
            ti["subagent_type"] = tipo
        if model is not None:
            ti["model"] = model
        return {"tool_name": tool, "tool_input": ti}

    def filas(self):
        if not os.path.exists(self.log):
            return []
        with open(self.log) as f:
            return [l.rstrip("\n").split("\t") for l in f.read().splitlines()[1:]]

    def assertNegado(self, salida, fragmento):
        d = json.loads(salida)["hookSpecificOutput"]
        self.assertEqual(d["hookEventName"], "PreToolUse")
        self.assertEqual(d["permissionDecision"], "deny")
        self.assertIn(fragmento, d["permissionDecisionReason"])


class G1Modelo(Base):
    def test_niega_generico_sin_model(self):
        for tipo in ("general-purpose", "Explore", "claude"):
            code, out = self.correr(self.agente(tipo))
            self.assertEqual(code, 0)
            self.assertNegado(out, "Falta `model` explícito")

    def test_pasa_con_model(self):
        code, out = self.correr(self.agente("general-purpose", model="sonnet"))
        self.assertEqual((code, out), (0, ""))

    def test_tipo_ausente_es_generico(self):
        _, out = self.correr(self.agente(None))
        self.assertNegado(out, "Falta `model` explícito")
        _, out = self.correr(self.agente(None, model="haiku"))
        self.assertEqual(out, "")

    def test_task_equivale_a_agent(self):
        _, out = self.correr(self.agente("Explore", tool="Task"))
        self.assertNegado(out, "model")


class G2Invariante(Base):
    def test_niega_sin_linea(self):
        code, out = self.correr(self.agente("ejecutor-critico", prompt="Migra la tabla de pagos"))
        self.assertEqual(code, 0)
        self.assertNegado(out, "Invariante:")

    def test_pasa_con_variantes_validas(self):
        for p in ("Tarea\nInvariante: nunca se lee otro espacio → prueba con dos espacios",
                  "Tarea\n**Invariante:** nunca se lee otro espacio → prueba",
                  "Tarea\n- Invariante: nunca se lee otro espacio → prueba"):
            self.assertEqual(self.correr(self.agente("ejecutor-critico", prompt=p)), (0, ""), p)

    def test_no_pasa_con_fila_ni_en_frase(self):
        for p in ("Invariante (fila 2): nunca se lee otro espacio → prueba",
                  "Este encargo protege un invariante importante: el saldo"):
            _, out = self.correr(self.agente("ejecutor-critico", prompt=p))
            self.assertNegado(out, "Invariante:")

    def test_critico_no_exige_model(self):
        p = "Invariante: x siempre → prueba"
        self.assertEqual(self.correr(self.agente("ejecutor-critico", prompt=p)), (0, ""))


class G3FallaAbierto(Base):
    def test_entradas_invalidas(self):
        for e in ("", "   \n", "{no es json", "[]", '"texto"',
                  {"tool_name": "Agent"},
                  {"tool_name": "Agent", "tool_input": None},
                  {"tool_name": "Agent", "tool_input": "x"}):
            self.assertEqual(self.correr(e), (0, ""), repr(e))
        self.assertEqual(self.filas(), [])

    def test_otra_herramienta(self):
        self.assertEqual(self.correr({"tool_name": "Bash", "tool_input": {"command": "ls"}}), (0, ""))

    def test_config_ausente_o_rota_usa_defecto(self):
        os.remove(self.cfg)
        _, out = self.correr(self.agente("general-purpose"))
        self.assertNegado(out, "model")
        with open(self.cfg, "w") as f:
            f.write("{roto")
        _, out = self.correr(self.agente("ejecutor-critico", prompt="sin linea"))
        self.assertNegado(out, "Invariante:")

    def test_registro_no_escribible_no_cambia_decision(self):
        _, out = self.correr(self.agente("Explore"),
                             {"DELEGACION_GATE_LOG": os.path.join(self.tmp.name, "no", "existe", "g.tsv")})
        self.assertNegado(out, "model")


class Modos(Base):
    def test_avisar(self):
        self.escribir_cfg({"modo": "avisar"})
        code, out = self.correr(self.agente("general-purpose"))
        self.assertEqual(code, 0)
        d = json.loads(out)
        self.assertIn("model", d["systemMessage"])
        self.assertNotIn("hookSpecificOutput", d)
        self.assertEqual(self.filas()[0][1:], ["general-purpose", "G-1", "avisado"])

    def test_apagado(self):
        self.escribir_cfg({"modo": "apagado"})
        self.assertEqual(self.correr(self.agente("general-purpose")), (0, ""))
        self.assertEqual(self.filas(), [])

    def test_bypass_por_entorno(self):
        self.assertEqual(self.correr(self.agente("general-purpose"), {"DELEGACION_GATE": "off"}), (0, ""))
        self.assertEqual(self.filas(), [])


class PasanSiempre(Base):
    def test_otros_agentes(self):
        for t in ("ejecutor", "ejecutor-mecanico", "fork", "planner"):
            self.assertEqual(self.correr(self.agente(t)), (0, ""), t)
        self.assertEqual(self.filas(), [])


class Registro(Base):
    def test_negaciones_dejan_fila(self):
        self.correr(self.agente("general-purpose"))
        self.correr(self.agente("ejecutor-critico", prompt="nada"))
        f = self.filas()
        self.assertEqual([r[1:] for r in f], [["general-purpose", "G-1", "negado"],
                                              ["ejecutor-critico", "G-2", "negado"]])
        self.assertRegex(f[0][0], r"^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[-+]\d\d:\d\d$")


if __name__ == "__main__":
    unittest.main()
