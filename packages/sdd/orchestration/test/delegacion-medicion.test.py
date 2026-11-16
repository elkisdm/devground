#!/usr/bin/env python3
"""Pruebas de delegacion-medicion.py con un árbol sintético (nunca toca ~/.claude)."""
import contextlib
import importlib.util
import io
import json
import os
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone

AQUI = os.path.dirname(os.path.abspath(__file__))
SCRIPT = next(p for p in (os.path.join(AQUI, "delegacion-medicion.py"),
                          os.path.join(AQUI, "..", "scripts", "delegacion-medicion.py")) if os.path.exists(p))
INV = "Invariante: nadie lee pedidos ajenos → prueba con dos espacios"


def iso(dias_atras=0):
    return (datetime.now(timezone.utc) - timedelta(days=dias_atras)).isoformat().replace("+00:00", "Z")


def escribir(path, lineas):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        for l in lineas:
            f.write((l if isinstance(l, str) else json.dumps(l)) + "\n")


def lanz(tipo, model=None, prompt="x", dias=0, desc="d"):
    inp = {"prompt": prompt, "description": desc}
    if tipo:
        inp["subagent_type"] = tipo
    if model:
        inp["model"] = model
    return {"type": "assistant", "timestamp": iso(dias),
            "message": {"content": [{"type": "tool_use", "name": "Agent", "input": inp}]}}


def texto(*bloques, dias=0):
    return {"type": "assistant", "timestamp": iso(dias),
            "message": {"content": [{"type": "text", "text": b} for b in bloques]}}


def turno(mid, modelo, i=0, o=0, cr=0, cw=0, dias=0):
    return {"type": "assistant", "timestamp": iso(dias),
            "message": {"id": mid, "model": modelo,
                        "usage": {"input_tokens": i, "output_tokens": o,
                                  "cache_read_input_tokens": cr, "cache_creation_input_tokens": cw}}}


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        t = self.tmp.name
        self.root = os.path.join(t, "projects")
        self.cfgp = os.path.join(t, "delegacion.json")
        self.env = {**os.environ, "CLAUDE_PROJECTS": self.root, "DELEGACION_CONFIG": self.cfgp,
                    "ENCARGOS_REGISTRO": os.path.join(t, "encargos.tsv"),
                    "DELEGACION_GATE_LOG": os.path.join(t, "gate.tsv"),
                    "DELEGACION_MEDICION_CACHE": os.path.join(t, "cache.json")}
        self.env.pop("DELEGACION_MEDICION_HOOK_DRYRUN", None)
        self.cache = self.env["DELEGACION_MEDICION_CACHE"]
        self.config({})

    def tearDown(self):
        self.tmp.cleanup()

    def config(self, extra):
        cfg = {"umbrales": {"ventana_dias": 7, "critico_pct_lanzamientos": 12, "critico_pct_tokens": 30,
                            "max_agentes_por_cambio": 5},
               "gate": {"patron_invariante": r"(?im)^[\s>*_-]*invariante[*_]*\s*:\s*\S"},
               "precios_usd_por_millon": {"opus": {"entrada": 5.0, "salida": 25.0},
                                          "sonnet": {"entrada": 3.0, "salida": 15.0},
                                          "haiku": {"entrada": 1.0, "salida": 5.0}, "fable": None,
                                          "cache_lectura_x": 0.1, "cache_escritura_x": 1.25}}
        for k, v in extra.items():
            cfg.setdefault(k, {}).update(v)
        with open(self.cfgp, "w") as f:
            json.dump(cfg, f)

    def sub(self, tipo, nombre, lineas, sesion="ses1", proy="p", desc=None):
        base = os.path.join(self.root, proy, sesion, "subagents", nombre)
        escribir(base + ".jsonl", lineas)
        meta = {"agentType": tipo}
        if desc is not None:
            meta["description"] = desc
        with open(base + ".meta.json", "w") as f:
            json.dump(meta, f)

    def main(self, lineas, sesion="ses1", proy="p"):
        escribir(os.path.join(self.root, proy, sesion + ".jsonl"), lineas)

    def run_cli(self, *args, env=None):
        return subprocess.run([sys.executable, SCRIPT, *args], capture_output=True, text=True,
                              env=env or self.env, timeout=60)

    def json(self, *args):
        r = self.run_cli("--json", *args)
        self.assertEqual(r.returncode, 0, r.stderr)
        return json.loads(r.stdout)

    def fila(self, d, tipo):
        return next(x for x in d["por_tipo"] if x["tipo"] == tipo)


class Consumo(Base):
    def test_m1_message_id_repetido_cuenta_una_vez(self):
        self.sub("ejecutor", "a", [turno("m1", "claude-sonnet-5-5", i=100, o=10),
                                   turno("m1", "claude-sonnet-5-5", i=100, o=10),
                                   turno("m2", "claude-sonnet-5-5", i=50, o=5)])
        f = self.fila(self.json(), "ejecutor")
        self.assertEqual(f["turnos"], 2)
        self.assertEqual(f["tokens"], 165)

    def test_m1_sentido_contrario_ids_distintos_suman(self):
        self.sub("ejecutor", "a", [turno("m1", "claude-sonnet-5-5", i=100), turno("m2", "claude-sonnet-5-5", i=100)])
        f = self.fila(self.json(), "ejecutor")
        self.assertEqual((f["turnos"], f["tokens"]), (2, 200))

    def test_m2_precio_null_da_pendiente(self):
        self.sub("general-purpose", "a", [turno("m1", "claude-fable-5-2", i=1000)])
        d = self.json()
        self.assertIsNone(self.fila(d, "general-purpose")["costo_usd"])
        self.assertIsNone(d["costo_total_usd"])
        r = self.run_cli()
        self.assertIn("pendiente", r.stdout)

    def test_m2_sentido_contrario_con_precio_calcula(self):
        # 1M entrada*3 + 1M salida*15 + 1M lectura*3*0.1 + 1M escritura*3*1.25 = 3+15+0.3+3.75
        self.sub("ejecutor", "a", [turno("m1", "claude-sonnet-5-5", i=10**6, o=10**6, cr=10**6, cw=10**6)])
        d = self.json()
        self.assertAlmostEqual(self.fila(d, "ejecutor")["costo_usd"], 22.05, places=2)
        self.assertAlmostEqual(d["costo_total_usd"], 22.05, places=2)

    def test_m2_fila_pendiente_contamina_el_total_pero_no_otras_filas(self):
        self.sub("ejecutor", "a", [turno("m1", "claude-sonnet-5-5", i=1000)])
        self.sub("general-purpose", "b", [turno("m2", "claude-fable-5-2", i=1000)])
        d = self.json()
        self.assertIsNotNone(self.fila(d, "ejecutor")["costo_usd"])
        self.assertIsNone(d["costo_total_usd"])

    def test_agente_sin_meta_es_desconocido(self):
        escribir(os.path.join(self.root, "p", "ses1", "subagents", "z.jsonl"), [turno("m1", "claude-opus-5-5", i=5)])
        self.assertEqual(self.fila(self.json(), "desconocido")["tokens"], 5)

    def test_lineas_corruptas_se_ignoran(self):
        self.sub("ejecutor", "a", ["{no es json \"usage\"", turno("m1", "claude-sonnet-5-5", i=7)])
        self.assertEqual(self.fila(self.json(), "ejecutor")["tokens"], 7)


class Ventana(Base):
    def test_dias_excluye_lo_viejo(self):
        self.main([lanz("ejecutor", dias=0), lanz("ejecutor", dias=10)])
        self.assertEqual(self.fila(self.json("--dias", "3"), "ejecutor")["lanzamientos"], 1)
        self.assertEqual(self.fila(self.json("--dias", "30"), "ejecutor")["lanzamientos"], 2)

    def test_desde_fecha(self):
        self.main([lanz("ejecutor", dias=0), lanz("ejecutor", dias=10)])
        antes = (datetime.now() - timedelta(days=20)).strftime("%Y-%m-%d")
        despues = (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d")
        self.assertEqual(self.fila(self.json("--desde", antes), "ejecutor")["lanzamientos"], 2)
        self.assertEqual(self.fila(self.json("--desde", despues), "ejecutor")["lanzamientos"], 1)

    def test_archivo_con_mtime_viejo_no_se_abre(self):
        self.main([lanz("ejecutor")])
        p = os.path.join(self.root, "p", "ses1.jsonl")
        viejo = (datetime.now() - timedelta(days=40)).timestamp()
        os.utime(p, (viejo, viejo))
        self.assertEqual(self.json()["por_tipo"], [])

    def test_desde_invalido(self):
        self.assertEqual(self.run_cli("--desde", "ayer").returncode, 2)


class Critico(Base):
    def test_proporcion_dentro_del_umbral_m4(self):
        self.main([lanz("ejecutor")] * 9 + [lanz("ejecutor-critico", prompt=INV)])
        c = self.json()["critico"]
        self.assertEqual(c["pct_lanzamientos"], 10.0)
        self.assertFalse(c["sobre_lanzamientos"])
        self.assertIn("dentro", self.run_cli().stdout)

    def test_proporcion_sobre_el_umbral(self):
        self.main([lanz("ejecutor-mecanico")] + [lanz("ejecutor")] * 3 + [lanz("ejecutor-critico", prompt=INV)] * 2)
        c = self.json()["critico"]
        self.assertEqual(c["pct_lanzamientos"], round(100 * 2 / 6, 1))
        self.assertTrue(c["sobre_lanzamientos"])
        self.assertIn("sobre el umbral", self.run_cli().stdout)

    def test_tokens_sobre_umbral(self):
        self.sub("ejecutor", "a", [turno("m1", "claude-sonnet-5-5", i=100)])
        self.sub("ejecutor-critico", "b", [turno("m2", "claude-opus-5-5", i=100)])
        c = self.json()["critico"]
        self.assertEqual(c["pct_tokens"], 50.0)
        self.assertTrue(c["sobre_tokens"])

    def test_m4_cero_ejecutores_no_divide_ni_avisa(self):
        self.main([lanz("Explore", "sonnet")])
        c = self.json()["critico"]
        self.assertIsNone(c["pct_lanzamientos"])
        self.assertIsNone(c["pct_tokens"])
        self.assertFalse(c["sobre_lanzamientos"] or c["sobre_tokens"])

    def test_con_y_sin_invariante(self):
        self.main([lanz("ejecutor-critico", prompt="Tarea\n**Invariante:** algo → prueba"),
                   lanz("ejecutor-critico", prompt="Invariante (fila 2): no calza"),
                   lanz("ejecutor-critico", prompt="sin nada")])
        c = self.json()["critico"]
        self.assertEqual((c["con_invariante"], c["sin_invariante"]), (1, 2))


class Genericos(Base):
    def test_por_modelo_y_sin_model(self):
        self.main([lanz("general-purpose", "opus"), lanz("general-purpose"), lanz(None),
                   lanz("Explore", "sonnet"), lanz("claude", "haiku"), lanz("planner")])
        g = self.json()["genericos"]
        self.assertEqual(g["general-purpose"]["lanzamientos"], 3)  # sin tipo = general-purpose
        self.assertEqual(g["general-purpose"]["sin_model"], 2)
        self.assertEqual(g["general-purpose"]["por_modelo"]["opus"], 1)
        self.assertEqual(g["Explore"]["sin_model"], 0)
        self.assertEqual(g["claude"]["por_modelo"], {"haiku": 1})

    def test_task_tambien_cuenta(self):
        l = lanz("ejecutor")
        l["message"]["content"][0]["name"] = "Task"
        self.main([l])
        self.assertEqual(self.fila(self.json(), "ejecutor")["lanzamientos"], 1)

    def test_sesiones_sobre_tope(self):
        self.main([lanz("ejecutor")] * 6, sesion="a")
        self.main([lanz("ejecutor")] * 5, sesion="b")
        self.assertEqual(self.json()["sesiones_sobre_tope"]["sesiones"], 1)


class Registros(Base):
    def test_externos_por_estado_con_mediana(self):
        h = "fecha\tejecutor\tnombre\trepo\testado\tduracion_s\tarchivos\tcupo_antes\tcupo_despues\tsalida\n"
        f = lambda e, n, est, d, dias=0: f"{iso(dias)}\t{e}\t{n}\t/r\t{est}\t{d}\t2\t\t\t/s\n"
        with open(self.env["ENCARGOS_REGISTRO"], "w") as fh:
            fh.write(h + f("codex", "a", "ok", 100) + f("codex", "b", "ok", 300) + f("codex", "c", "cupo", 200)
                     + f("cursor:grok", "d", "fallo", 50) + f("codex", "viejo", "ok", 999, dias=30))
        e = self.json()["externos"]
        self.assertEqual(e["codex"]["estados"], {"ok": 2, "cupo": 1})
        self.assertEqual(e["codex"]["duracion_mediana_s"], 200)
        self.assertEqual(e["cursor:grok"]["total"], 1)
        self.assertIn("codex: 3 encargos", self.run_cli().stdout)

    def test_gate_por_regla(self):
        with open(self.env["DELEGACION_GATE_LOG"], "w") as fh:
            for regla, dec in [("G-1", "negado"), ("G-1", "negado"), ("G-2", "negado"), ("G-2", "avisado")]:
                fh.write(f"{iso()}\tgeneral-purpose\t{regla}\t{dec}\n")
        g = self.json()["gate"]
        self.assertEqual(g["G-1"], {"negado": 2})
        self.assertEqual(g["G-2"], {"negado": 1, "avisado": 1})

    def test_sin_registros_no_falla(self):
        r = self.run_cli()
        self.assertEqual(r.returncode, 0)
        self.assertIn("Sin encargos", r.stdout)


class Guardar(Base):
    def test_guardar_escribe_cache_con_generado(self):
        self.main([lanz("ejecutor")])
        r = self.run_cli("--guardar")
        self.assertEqual(r.returncode, 0)
        with open(self.cache) as f:
            d = json.load(f)
        self.assertIn("generado", d)
        self.assertEqual(self.fila(d, "ejecutor")["lanzamientos"], 1)

    def test_sin_guardar_no_escribe(self):
        self.run_cli()
        self.assertFalse(os.path.exists(self.cache))


class Hook(Base):
    def escribir_cache(self, pl=None, pt=None, dias=0, crudo=None):
        if crudo is not None:
            with open(self.cache, "w") as f:
                f.write(crudo)
            return
        with open(self.cache, "w") as f:
            json.dump({"generado": iso(dias), "critico": {"pct_lanzamientos": pl, "pct_tokens": pt}}, f)

    def hook(self, dry=True):
        env = dict(self.env)
        if dry:
            env["DELEGACION_MEDICION_HOOK_DRYRUN"] = "1"
        r = self.run_cli("--hook", env=env)
        self.assertEqual(r.returncode, 0)
        return r.stdout, os.path.exists(self.cache + ".lanzado")

    def test_fresca_sobre_umbral_avisa_una_linea(self):
        self.escribir_cache(pl=25.0, pt=10.0)
        out, lanzado = self.hook()
        self.assertEqual(len(out.strip().splitlines()), 1)
        self.assertIn("25 %", out)
        self.assertIn("umbral 12 %", out)
        self.assertFalse(lanzado)

    def test_fresca_sobre_umbral_en_tokens(self):
        self.escribir_cache(pl=5.0, pt=45.0)
        out, _ = self.hook()
        self.assertIn("45 %", out)

    def test_fresca_bajo_umbral_calla(self):
        self.escribir_cache(pl=5.0, pt=10.0)
        out, lanzado = self.hook()
        self.assertEqual((out, lanzado), ("", False))

    def test_fresca_sin_datos_calla(self):
        self.escribir_cache(pl=None, pt=None)
        self.assertEqual(self.hook(), ("", False))

    def test_vieja_lanza_refresco_y_calla(self):
        self.escribir_cache(pl=99.0, pt=99.0, dias=10)
        self.assertEqual(self.hook(), ("", True))

    def test_ausente_lanza_refresco(self):
        self.assertEqual(self.hook(), ("", True))

    def test_corrupta_lanza_refresco_sin_fallar(self):
        self.escribir_cache(crudo="{ esto no es json")
        self.assertEqual(self.hook(), ("", True))

    def test_corrupta_con_forma_rara_no_falla(self):
        self.escribir_cache(crudo='{"generado": "' + iso() + '", "critico": 5}')
        out, _ = self.hook()
        self.assertEqual(out, "")

    def test_lanzamiento_real_desligado_y_sin_esperar(self):
        # Sin DRYRUN: el hook debe volver rápido y dejar el refresco corriendo por su cuenta.
        import time
        self.main([lanz("ejecutor")])
        t0 = time.time()
        r = self.run_cli("--hook")
        self.assertEqual(r.returncode, 0)
        self.assertLess(time.time() - t0, 1.0)
        for _ in range(50):  # el hijo escribe la caché cuando termina
            if os.path.exists(self.cache):
                break
            time.sleep(0.1)
        self.assertTrue(os.path.exists(self.cache))

    def test_m3_hook_no_abre_transcripts(self):
        spec = importlib.util.spec_from_file_location("medicion", SCRIPT)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)

        def prohibido(*a, **k):
            raise AssertionError("el hook abrió un transcript")
        mod.lineas_json = prohibido
        mod.leer_lanzamientos = prohibido
        mod.leer_consumo = prohibido
        mod.medir = prohibido
        self.main([lanz("ejecutor")])
        viejos = {k: os.environ.get(k) for k in self.env if k.startswith(("DELEGACION", "CLAUDE_PROJECTS"))}
        os.environ.update({k: self.env[k] for k in viejos})
        os.environ["DELEGACION_MEDICION_HOOK_DRYRUN"] = "1"
        try:
            for crudo in ("{ roto", None):
                if crudo:
                    self.escribir_cache(crudo=crudo)
                self.assertEqual(mod.main(["--hook"]), 0)
            self.escribir_cache(pl=50.0, pt=50.0)
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(mod.main(["--hook"]), 0)
        finally:
            os.environ.pop("DELEGACION_MEDICION_HOOK_DRYRUN", None)
            for k, v in viejos.items():
                if v is None:
                    os.environ.pop(k, None)
                else:
                    os.environ[k] = v


class Revisiones(Base):
    def test_a1_cuenta_revisiones_en_opus_y_no_la_busqueda(self):
        self.main([lanz("general-purpose", "opus", desc="Revisión de módulo X")] * 3
                  + [lanz("general-purpose", "sonnet", desc="Buscar Y")])
        self.sub("general-purpose", "a", [turno("m1", "claude-opus-5-5", i=300)], desc="Revisión de módulo X")
        self.sub("general-purpose", "b", [turno("m2", "claude-sonnet-5-5", i=100)], desc="Buscar Y")
        v = self.json()["revisiones"]
        self.assertEqual(v["por_modelo"], {"opus": 3})
        self.assertEqual(v["lanzamientos"], 3)
        self.assertEqual(v["tokens"], 300)
        self.assertEqual(v["pct_tokens"], 75.0)
        out = self.run_cli().stdout
        self.assertIn("Revisiones y auditorías genéricas", out)
        self.assertIn("opus: 3", out)

    def test_a1_sin_tipo_y_claude_cuentan_y_sin_model_se_marca(self):
        self.main([lanz(None, desc="Re-review final"), lanz("claude", "haiku", desc="Audit")])
        self.assertEqual(self.json()["revisiones"]["por_modelo"], {"(sin model)": 1, "haiku": 1})

    def test_m5_no_cuenta_agentes_no_genericos(self):
        d = "Revisión de hallazgos"
        self.main([lanz("ejecutor", desc=d), lanz("Explore", "sonnet", desc=d), lanz("planner", desc=d)])
        for t in ("ejecutor", "Explore", "planner"):
            self.sub(t, t, [turno("m" + t, "claude-sonnet-5-5", i=100)], desc=d)
        v = self.json()["revisiones"]
        self.assertEqual((v["lanzamientos"], v["tokens"], v["por_modelo"]), (0, 0, {}))

    def test_m5_sentido_contrario_generico_si_cuenta(self):
        self.main([lanz("general-purpose", "opus", desc="Revisión")])
        self.sub("general-purpose", "g", [turno("m1", "claude-opus-5-5", i=100)], desc="Revisión")
        v = self.json()["revisiones"]
        self.assertEqual((v["lanzamientos"], v["tokens"]), (1, 100))

    def test_subagente_sin_meta_no_entra_y_titulo_vacio_no_calza(self):
        escribir(os.path.join(self.root, "p", "ses1", "subagents", "z.jsonl"), [turno("m1", "claude-opus-5-5", i=5)])
        self.main([lanz("general-purpose", "opus", desc="")])
        v = self.json()["revisiones"]
        self.assertEqual((v["lanzamientos"], v["tokens"]), (0, 0))

    def test_patron_invalido_usa_el_defecto(self):
        self.config({"medicion": {"patron_revision": "(["}})
        self.main([lanz("general-purpose", "opus", desc="Revisión")])
        self.assertEqual(self.json()["revisiones"]["lanzamientos"], 1)


class Calidad(Base):
    def lanzar(self, arreglos):
        self.main([lanz("ejecutor", desc="Corregir hallazgos")] * arreglos
                  + [lanz("ejecutor", desc="Implementar")] * (10 - arreglos))

    def test_a2_tres_de_diez_sobre_el_umbral(self):
        self.config({"medicion": {"arreglos_max_por_100_ejecutores": 20}})
        self.lanzar(3)
        q = self.json()["calidad"]
        self.assertEqual((q["arreglos"], q["arreglos_por_100"], q["sobre_arreglos"]), (3, 30.0, True))
        self.assertIn("sobre el umbral", self.run_cli().stdout.split("8. Calidad")[1])

    def test_a2_uno_de_diez_dentro(self):
        self.config({"medicion": {"arreglos_max_por_100_ejecutores": 20}})
        self.lanzar(1)
        q = self.json()["calidad"]
        self.assertEqual((q["arreglos_por_100"], q["sobre_arreglos"]), (10.0, False))
        self.assertIn("dentro", self.run_cli().stdout.split("8. Calidad")[1])

    def test_m6_cero_ejecutores_no_divide_ni_marca(self):
        self.main([lanz("Explore", "sonnet", desc="Corregir")])
        q = self.json()["calidad"]
        self.assertIsNone(q["arreglos_por_100"])
        self.assertFalse(q["sobre_arreglos"])
        self.assertIn("no se calcula", self.run_cli().stdout)

    def test_a2_rechazo_solo_si_es_el_ultimo_texto(self):
        self.sub("ejecutor-critico", "a", [turno("m1", "claude-opus-5-5", i=1),
                                           texto("Esto no es una tarea crítica, devuelvo.")])
        self.sub("ejecutor-critico", "b", [turno("m2", "claude-opus-5-5", i=1),
                                           texto("no es una tarea crítica"), texto("Terminé el trabajo.")])
        self.assertEqual(self.json()["calidad"]["rechazos_critico"], 1)

    def test_a2_rechazo_ultimo_elemento_de_texto_del_mensaje(self):
        self.sub("ejecutor-critico", "a", [turno("m1", "claude-opus-5-5", i=1),
                                           texto("no es una tarea crítica", "Hecho igual.")])
        self.assertEqual(self.json()["calidad"]["rechazos_critico"], 0)


class Invariantes(Base):
    def test_a3_lista_con_fecha_y_proyecto(self):
        self.main([lanz("ejecutor-critico", prompt="Tarea\n**Invariante:** A → B\notro"),
                   lanz("ejecutor-critico", prompt="sin nada"), lanz("ejecutor", prompt="Invariante: C → D")],
                  proy="proy1")
        r = self.run_cli("--invariantes")
        self.assertEqual(r.returncode, 0)
        filas = r.stdout.strip().splitlines()
        self.assertEqual(len(filas), 1)
        fecha, proy, txt = filas[0].split("\t")
        self.assertEqual((proy, txt), ("proy1", "A → B"))
        self.assertRegex(fecha, r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$")

    def test_a3_sin_criticos_no_imprime_y_sale_con_0(self):
        r = self.run_cli("--invariantes")
        self.assertEqual((r.returncode, r.stdout), (0, ""))

    def test_a3_informe_muestra_solo_las_5_mas_recientes(self):
        self.main([lanz("ejecutor-critico", prompt=f"Invariante: inv{i} → p", dias=i) for i in range(7)])
        rec = self.json()["critico"]["invariantes_recientes"]
        self.assertEqual([x["texto"] for x in rec], [f"inv{i} → p" for i in range(5)])
        self.assertEqual(self.run_cli().stdout.count("Invariante reciente"), 5)


class HookCalidad(Hook):
    def cache_con(self, calidad, dias=0, **extra):
        d = {"generado": iso(dias), "critico": {"pct_lanzamientos": 1.0, "pct_tokens": 1.0}}
        if calidad is not None:
            d["calidad"] = calidad
        with open(self.cache, "w") as f:
            json.dump(d, f)

    def test_a4_guardar_incluye_secciones_nuevas(self):
        self.main([lanz("ejecutor", desc="Corregir")])
        self.run_cli("--guardar")
        with open(self.cache) as f:
            d = json.load(f)
        self.assertIn("revisiones", d)
        self.assertEqual(d["calidad"]["arreglos"], 1)

    def test_a4_hook_avisa_arreglos_sobre_umbral_en_una_linea(self):
        self.config({"medicion": {"arreglos_max_por_100_ejecutores": 20}})
        self.cache_con({"arreglos_por_100": 30.0})
        out, lanzado = self.hook()
        self.assertEqual(len(out.strip().splitlines()), 1)
        self.assertIn("30 rondas de arreglo por cada 100 ejecutores (umbral 20)", out)
        self.assertFalse(lanzado)

    def test_a4_hook_arreglos_dentro_calla(self):
        self.cache_con({"arreglos_por_100": 10.0})
        self.assertEqual(self.hook(), ("", False))

    def test_a4_critico_tiene_prioridad(self):
        with open(self.cache, "w") as f:
            json.dump({"generado": iso(), "critico": {"pct_lanzamientos": 25.0, "pct_tokens": 1.0},
                       "calidad": {"arreglos_por_100": 50.0}}, f)
        out, _ = self.hook()
        self.assertEqual(len(out.strip().splitlines()), 1)
        self.assertIn("el crítico", out)

    def test_a4_cache_vieja_sin_claves_nuevas_sale_con_0(self):
        self.escribir_cache(pl=1.0, pt=1.0)
        self.assertEqual(self.hook(), ("", False))
        self.cache_con("raro")
        self.assertEqual(self.hook(), ("", False))


class Config(Base):
    def test_config_ausente_usa_defecto(self):
        os.remove(self.cfgp)
        self.main([lanz("ejecutor")])
        self.assertEqual(self.json()["umbrales"]["critico_pct_lanzamientos"], 12)

    def test_umbral_configurable(self):
        self.config({"umbrales": {"critico_pct_lanzamientos": 50}})
        self.main([lanz("ejecutor"), lanz("ejecutor-critico", prompt=INV)])
        self.assertFalse(self.json()["critico"]["sobre_lanzamientos"])


if __name__ == "__main__":
    unittest.main()
