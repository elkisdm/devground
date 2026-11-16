#!/usr/bin/env python3
"""Pruebas de encargar.py (contrato C2). Herméticas: ejecutores falsos declarados en un
delegacion.json temporal, repos git temporales con un remoto origin local (bare) y todas las
rutas de entorno apuntando a carpetas temporales. Nunca llaman a codex, cursor-agent ni agy.

  python3 encargar.test.py
  ENCARGAR_SCRIPT=<ruta> python3 encargar.test.py   # contra una copia (comprobar invariantes quitando un guard)
"""
import json
import os
import shlex
import signal
import subprocess
import sys
import tempfile
import time
import unittest
from collections import namedtuple


def buscar_script():
    if os.environ.get("ENCARGAR_SCRIPT"):
        return os.environ["ENCARGAR_SCRIPT"]
    aqui = os.path.dirname(os.path.abspath(__file__))
    for c in (os.path.join(aqui, "encargar.py"), os.path.join(aqui, "..", "scripts", "encargar.py")):
        if os.path.exists(c):
            return c
    raise FileNotFoundError("no encuentro encargar.py")


SCRIPT = buscar_script()
PUSHURL_ORIGINAL = "https://ejemplo.invalido/repo.git"
BLOQUEADO = "no-push://encargo-en-curso"
Resultado = namedtuple("Resultado", "codigo datos err")


def leer(ruta):
    with open(ruta) as f:
        return f.read()


def esperar(condicion, tope=20):
    fin = time.time() + tope
    while time.time() < fin:
        if condicion():
            return True
        time.sleep(0.05)
    return False


class Base(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        t = self.tmp = os.path.realpath(self._tmp.name)
        self.bare = os.path.join(t, "origin.git")
        self.repo = os.path.join(t, "producto")
        self.cfg_ruta = os.path.join(t, "delegacion.json")
        self.codex_home = os.path.join(t, "codex")
        os.makedirs(self.codex_home)
        os.makedirs(os.path.join(t, "bin"))
        self.reglas = os.path.join(t, "reglas.md")
        with open(self.reglas, "w") as f:
            f.write("## Reglas de prueba\n- no hagas commit\n")
        vacio = os.path.join(t, "gitconfig-vacio")
        open(vacio, "w").close()
        self.env = dict(os.environ,
                        DELEGACION_CONFIG=self.cfg_ruta,
                        ENCARGOS_DIR=os.path.join(t, "encargos"),
                        ENCARGOS_REGISTRO=os.path.join(t, "encargos.tsv"),
                        ENCARGOS_REGLAS=self.reglas,
                        CODEX_HOME=self.codex_home,
                        GIT_CONFIG_GLOBAL=vacio, GIT_CONFIG_NOSYSTEM="1")
        subprocess.run(["git", "init", "-q", "--bare", "-b", "main", self.bare], check=True, env=self.env)
        os.makedirs(self.repo)
        self.git("init", "-q", "-b", "main")
        self.git("config", "user.email", "t@t.t")
        self.git("config", "user.name", "t")
        self.git("remote", "add", "origin", self.bare)
        with open(os.path.join(self.repo, "base.txt"), "w") as f:
            f.write("base\n")
        self.git("add", "-A")
        self.git("commit", "-q", "-m", "base")
        self.git("push", "-q", "origin", "main")
        self.git("config", "remote.origin.pushurl", PUSHURL_ORIGINAL)
        self.config = {"ejecutores_externos": {}}
        self.encargo = os.path.join(t, "encargo.md")
        with open(self.encargo, "w") as f:
            f.write("Haz X en el repo.\n")
        self.procesos = []

    def tearDown(self):
        for p in self.procesos:
            if p.poll() is None:
                p.kill()
                p.wait()
        self._tmp.cleanup()

    # ---- utilidades ----
    def git(self, cwd_o_arg, *args):
        if os.path.isdir(cwd_o_arg):
            cwd, resto = cwd_o_arg, args
        else:
            cwd, resto = self.repo, (cwd_o_arg, *args)
        r = subprocess.run(["git", "-C", cwd, *resto], capture_output=True, text=True, env=self.env)
        if r.returncode != 0:
            raise RuntimeError(f"git {resto}: {r.stderr}")
        return r.stdout

    def pushurl(self):
        r = subprocess.run(["git", "-C", self.repo, "config", "--get", "remote.origin.pushurl"],
                           capture_output=True, text=True, env=self.env)
        return r.stdout.strip() if r.returncode == 0 else None

    def ejecutor(self, nombre, cuerpo, informe="archivo", errores_cupo=None, sonda=False, cupo=None):
        script = os.path.join(self.tmp, "bin", nombre.replace(":", "_") + ".sh")
        with open(script, "w") as f:
            f.write('#!/bin/sh\nDIR="$1"; INFORME="$2"; ENCARGO="$3"; SANDBOX="$4"\n' + cuerpo + "\n")
        os.chmod(script, 0o755)
        ej = {"activo": True, "comando": [script, "{dir}", "{informe}", "{encargo}", "{sandbox}"],
              "informe": informe, "sandbox": "workspace-write", "sonda": sonda,
              "errores_cupo": errores_cupo or ["^ERROR: You've hit"],
              "sirve_para": "pruebas", "no_sirve_para": "nada"}
        if cupo:
            ej["cupo"], ej["cupo_max_pct"] = cupo, 85
        self.config["ejecutores_externos"][nombre] = ej
        with open(self.cfg_ruta, "w") as f:
            json.dump(self.config, f)
        return nombre

    def argumentos(self, ej, nombre, extra):
        return [sys.executable, SCRIPT, "lanzar", ej, "--repo", self.repo, "--nombre", nombre,
                "--encargo", self.encargo, *extra]

    def lanzar(self, ej, nombre="t1", *extra):
        r = subprocess.run(self.argumentos(ej, nombre, extra), capture_output=True, text=True,
                           env=self.env, stdin=subprocess.DEVNULL, timeout=60)
        try:
            datos = json.loads(r.stdout)
        except ValueError:
            datos = None
        return Resultado(r.returncode, datos, r.stderr)

    def lanzar_bg(self, ej, nombre, *extra):
        p = subprocess.Popen(self.argumentos(ej, nombre, extra), stdout=subprocess.PIPE,
                             stderr=subprocess.PIPE, text=True, env=self.env, stdin=subprocess.DEVNULL)
        self.procesos.append(p)
        return p

    def arbol(self, nombre):
        return f"{self.repo}-wt-enc-{nombre}"

    def common(self):
        return os.path.join(self.repo, ".git")

    def activos(self):
        return os.path.join(self.common(), "encargos-activos")

    def ramas(self):
        return self.git("branch", "--list", "encargo/*").split()

    def assert_nada_creado(self, nombre):
        self.assertFalse(os.path.exists(self.arbol(nombre)), "no debe existir el árbol")
        self.assertEqual(self.ramas(), [], "no debe existir la rama")
        self.assertFalse(os.path.exists(self.activos()), "no debe existir la marca de candado")
        self.assertEqual(self.pushurl(), PUSHURL_ORIGINAL)

    def sesion_codex(self, usado, ts, nombre="rollout.jsonl", subcarpeta="2026/11/16"):
        d = os.path.join(self.codex_home, "sessions", subcarpeta)
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, nombre), "a") as f:
            f.write(json.dumps({"timestamp": ts, "payload": {"info": {}, "rate_limits": {
                "plan_type": "prolite", "primary": {"used_percent": usado, "window_minutes": 10080,
                                                    "resets_at": 1795000000}}}}) + "\n")


CAMBIA = 'echo hola > nuevo.txt'
INFORME = 'echo "hecho: nuevo.txt" > "$INFORME"'
OK = CAMBIA + "\n" + INFORME


class Estados(Base):
    def test_ok(self):
        ej = self.ejecutor("falso", OK)
        r = self.lanzar(ej)
        self.assertEqual(r.codigo, 0, r.err)
        d = r.datos
        self.assertEqual(d["estado"], "ok")
        self.assertEqual(d["archivos"], ["nuevo.txt"])
        self.assertEqual(d["rama"], "encargo/t1")
        self.assertEqual(d["base"], self.git("rev-parse", "HEAD").strip())
        self.assertEqual(d["arbol"], self.arbol("t1"))
        self.assertIn("nuevo.txt", d["diffstat"])
        self.assertIn("+hola", leer(d["parche"]))  # el archivo nuevo entra al parche
        self.assertIn("hecho", leer(d["informe"]))
        self.assertTrue(os.path.exists(d["log"]))
        self.assertTrue(os.path.exists(os.path.join(d["salida"], "resultado.json")))
        # el ejecutor no hizo commit: el HEAD del árbol sigue en la base
        self.assertEqual(self.git(self.arbol("t1"), "rev-parse", "HEAD").strip(), d["base"])
        self.assertEqual(self.pushurl(), PUSHURL_ORIGINAL)

    def test_cupo_por_log(self):
        ej = self.ejecutor("falso", "echo \"ERROR: You've hit your usage limit\"")
        r = self.lanzar(ej)
        self.assertEqual((r.codigo, r.datos["estado"]), (3, "cupo"))

    def test_cupo_por_porcentaje(self):
        ej = self.ejecutor("falso", OK, cupo="codex")
        self.sesion_codex(90.0, "2026-11-16T10:00:00Z")
        r = self.lanzar(ej)
        self.assertEqual((r.codigo, r.datos["estado"]), (3, "cupo"))
        self.assertEqual(r.datos["cupo_antes"], 90.0)
        self.assert_nada_creado("t1")

    def test_cupo_usa_la_medicion_mas_nueva_por_timestamp(self):
        ej = self.ejecutor("falso", OK, cupo="codex")
        # la más nueva (90) va ANTES en el archivo que la más vieja (10): manda el timestamp
        self.sesion_codex(90.0, "2026-11-16T10:00:00Z")
        self.sesion_codex(10.0, "2026-11-16T09:00:00Z")
        self.assertEqual(self.lanzar(ej).datos["estado"], "cupo")

    def test_cupo_bajo_el_maximo_sigue_y_mide_antes_y_despues(self):
        sesion = os.path.join(self.codex_home, "sessions", "x")
        nueva = json.dumps({"timestamp": "2026-11-16T11:00:00Z", "rate_limits": {"primary": {"used_percent": 60.0}}})
        ej = self.ejecutor("falso", OK + f"\nmkdir -p {shlex.quote(sesion)}\necho {shlex.quote(nueva)} > {shlex.quote(sesion)}/n.jsonl",
                           cupo="codex")
        self.sesion_codex(50.0, "2026-11-16T09:00:00Z")
        r = self.lanzar(ej)
        self.assertEqual(r.datos["estado"], "ok", r.err)
        self.assertEqual((r.datos["cupo_antes"], r.datos["cupo_despues"]), (50.0, 60.0))

    def test_sin_dato_de_cupo_sigue(self):
        ej = self.ejecutor("falso", OK, cupo="codex")
        r = self.lanzar(ej)
        self.assertEqual(r.datos["estado"], "ok")
        self.assertIsNone(r.datos["cupo_antes"])

    def test_no_responde_por_sonda(self):
        ej = self.ejecutor("falso", "exit 1", sonda=True)
        r = self.lanzar(ej)
        self.assertEqual((r.codigo, r.datos["estado"]), (3, "no-responde"))
        self.assert_nada_creado("t1")

    def test_sonda_que_responde_sigue(self):
        ej = self.ejecutor("falso", 'if [ "$ENCARGO" = "Responde solo: OK" ]; then echo OK; exit 0; fi\n' + OK, sonda=True)
        r = self.lanzar(ej)
        self.assertEqual(r.datos["estado"], "ok", r.err)

    def test_cupo_por_sonda(self):
        ej = self.ejecutor("falso", 'echo "ERROR: You\'ve hit your limit"', sonda=True)
        r = self.lanzar(ej)
        self.assertEqual((r.codigo, r.datos["estado"]), (3, "cupo"))
        self.assert_nada_creado("t1")

    def test_sin_informe(self):
        ej = self.ejecutor("falso", CAMBIA)
        r = self.lanzar(ej)
        self.assertEqual((r.codigo, r.datos["estado"]), (4, "sin-informe"))

    def test_sin_cambios(self):
        ej = self.ejecutor("falso", INFORME)
        r = self.lanzar(ej)
        self.assertEqual((r.codigo, r.datos["estado"]), (4, "sin-cambios"))

    def test_commit_indebido_deja_el_trabajo_en_el_parche(self):
        ej = self.ejecutor("falso", CAMBIA + '\ngit add -A\ngit commit -qm "x"\n' + INFORME)
        r = self.lanzar(ej)
        self.assertEqual((r.codigo, r.datos["estado"]), (5, "commit-indebido"))
        self.assertIn("+hola", leer(r.datos["parche"]))
        self.assertEqual(r.datos["archivos"], ["nuevo.txt"])

    def test_tiempo(self):
        ej = self.ejecutor("falso", CAMBIA + "\nsleep 30")
        r = self.lanzar(ej, "t1", "--timeout-min", "0.02")
        self.assertEqual((r.codigo, r.datos["estado"]), (1, "tiempo"))
        self.assertEqual(self.pushurl(), PUSHURL_ORIGINAL)

    def test_fallo(self):
        ej = self.ejecutor("falso", CAMBIA + "\nexit 3")
        r = self.lanzar(ej)
        self.assertEqual((r.codigo, r.datos["estado"]), (1, "fallo"))

    def test_informe_por_stdout(self):
        ej = self.ejecutor("falso", CAMBIA + '\necho "informe por stdout"', informe="stdout")
        r = self.lanzar(ej)
        self.assertEqual(r.datos["estado"], "ok", r.err)
        self.assertIn("informe por stdout", leer(r.datos["informe"]))

    def test_stdout_vacio_es_sin_informe(self):
        ej = self.ejecutor("falso", CAMBIA, informe="stdout")
        self.assertEqual(self.lanzar(ej).datos["estado"], "sin-informe")


class Invariantes(Base):
    def registrar_pushurl_durante(self):
        return f'git config --get remote.origin.pushurl > {shlex.quote(os.path.join(self.tmp, "durante.txt"))}'

    def test_E1_pushurl_se_bloquea_durante_y_se_restaura_tras_ok(self):
        ej = self.ejecutor("falso", self.registrar_pushurl_durante() + "\n" + OK)
        self.assertEqual(self.lanzar(ej).datos["estado"], "ok")
        self.assertEqual(leer(os.path.join(self.tmp, "durante.txt")).strip(), BLOQUEADO)
        self.assertEqual(self.pushurl(), PUSHURL_ORIGINAL)
        self.assertFalse(os.path.exists(self.activos()))

    def test_E1_pushurl_restaurado_tras_fallo_y_tiempo(self):
        ej = self.ejecutor("falla", "exit 2")
        self.assertEqual(self.lanzar(ej, "falla").datos["estado"], "fallo")
        self.assertEqual(self.pushurl(), PUSHURL_ORIGINAL)
        ej = self.ejecutor("cuelga", "sleep 30")
        self.assertEqual(self.lanzar(ej, "cuelga", "--timeout-min", "0.02").datos["estado"], "tiempo")
        self.assertEqual(self.pushurl(), PUSHURL_ORIGINAL)
        self.assertFalse(os.path.exists(self.activos()))

    def test_E1_pushurl_ausente_vuelve_a_ausente(self):
        self.git("config", "--unset-all", "remote.origin.pushurl")
        ej = self.ejecutor("falso", self.registrar_pushurl_durante() + "\n" + OK)
        self.assertEqual(self.lanzar(ej).datos["estado"], "ok")
        self.assertEqual(leer(os.path.join(self.tmp, "durante.txt")).strip(), BLOQUEADO)
        self.assertIsNone(self.pushurl())

    def test_E1_pushurl_restaurado_ante_sigterm(self):
        pid_f = os.path.join(self.tmp, "pid.txt")
        ej = self.ejecutor("duerme", f'echo $$ > {shlex.quote(pid_f)}\nexec sleep 60')
        p = self.lanzar_bg(ej, "t1")
        self.assertTrue(esperar(lambda: os.path.exists(pid_f) and leer(pid_f).strip()))
        self.assertEqual(self.pushurl(), BLOQUEADO)
        os.kill(p.pid, signal.SIGTERM)
        p.communicate(timeout=30)
        self.assertNotEqual(p.returncode, 0)
        self.assertEqual(self.pushurl(), PUSHURL_ORIGINAL)
        self.assertFalse(os.path.exists(self.activos()))
        hijo = int(leer(pid_f).strip())

        def muerto():
            try:
                os.kill(hijo, 0)
                return False
            except ProcessLookupError:
                return True
        self.assertTrue(esperar(muerto, 5), "el ejecutor no debe quedar vivo")

    def test_E2_con_dos_encargos_solapados_se_restaura_al_terminar_el_ultimo(self):
        def espera(clave):
            ini, go = (os.path.join(self.tmp, f"{clave}-{x}") for x in ("ini", "go"))
            cuerpo = f'touch {shlex.quote(ini)}\nwhile [ ! -e {shlex.quote(go)} ]; do sleep 0.05; done\n' + OK
            return self.ejecutor("espera-" + clave, cuerpo), ini, go
        ea, ini_a, go_a = espera("a")
        eb, ini_b, go_b = espera("b")
        pa = self.lanzar_bg(ea, "ta")
        pb = self.lanzar_bg(eb, "tb")
        self.assertTrue(esperar(lambda: os.path.exists(ini_a) and os.path.exists(ini_b)))
        self.assertEqual(self.pushurl(), BLOQUEADO)
        open(go_a, "w").close()
        out_a, _ = pa.communicate(timeout=30)
        self.assertEqual(json.loads(out_a)["estado"], "ok")
        self.assertEqual(self.pushurl(), BLOQUEADO, "B sigue en curso: el pushurl no se restaura")
        open(go_b, "w").close()
        out_b, _ = pb.communicate(timeout=30)
        self.assertEqual(json.loads(out_b)["estado"], "ok")
        self.assertEqual(self.pushurl(), PUSHURL_ORIGINAL)
        self.assertFalse(os.path.exists(self.activos()))

    def test_E3_commit_en_el_arbol_da_commit_indebido(self):
        ej = self.ejecutor("falso", CAMBIA + '\ngit add -A\ngit commit -qm "x"\n' + INFORME)
        r = self.lanzar(ej)
        self.assertEqual(r.datos["estado"], "commit-indebido")
        parche = leer(r.datos["parche"])
        self.assertIn("nuevo.txt", parche)
        self.assertIn("+hola", parche)

    def test_E4_cupo_y_no_responde_no_crean_arbol_rama_ni_marca(self):
        self.sesion_codex(99.0, "2026-11-16T10:00:00Z")
        ej = self.ejecutor("codex-falso", OK, cupo="codex")
        self.assertEqual(self.lanzar(ej, "uno").datos["estado"], "cupo")
        self.assert_nada_creado("uno")
        ej = self.ejecutor("mudo", OK + "\nexit 1", sonda=True)
        self.assertEqual(self.lanzar(ej, "dos").datos["estado"], "no-responde")
        self.assert_nada_creado("dos")

    def test_E5_codigo_0_sin_informe_nunca_es_ok(self):
        ej = self.ejecutor("falso", CAMBIA + "\nexit 0")
        r = self.lanzar(ej)
        self.assertNotEqual(r.datos["estado"], "ok")
        self.assertEqual(r.datos["estado"], "sin-informe")
        ej = self.ejecutor("espacios", CAMBIA + '\necho "   " > "$INFORME"')
        self.assertEqual(self.lanzar(ej, "t2").datos["estado"], "sin-informe")


class Opciones(Base):
    def test_registro_tsv_con_encabezado_y_hora_de_santiago(self):
        ej = self.ejecutor("falso", OK)
        self.lanzar(ej, "uno")
        self.lanzar(ej, "dos")
        filas = [f.split("\t") for f in leer(self.env["ENCARGOS_REGISTRO"]).splitlines()]
        self.assertEqual(filas[0], ["fecha", "ejecutor", "nombre", "repo", "estado", "duracion_s",
                                    "archivos", "cupo_antes", "cupo_despues", "salida"])
        self.assertEqual(len(filas), 3)
        self.assertEqual(filas[1][1:5], ["falso", "uno", self.repo, "ok"])
        self.assertEqual(filas[1][6], "1")
        self.assertRegex(filas[1][0], r"^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d-0[34]:00$")

    def test_encargo_final_lleva_las_reglas_y_sin_reglas_las_omite(self):
        recibido = os.path.join(self.tmp, "recibido.txt")
        ej = self.ejecutor("falso", f'printf %s "$ENCARGO" > {shlex.quote(recibido)}\n' + OK)
        r = self.lanzar(ej, "con")
        final = leer(recibido)
        self.assertIn("Haz X en el repo.", final)
        self.assertIn("## Reglas de prueba", final)
        self.assertEqual(final, leer(os.path.join(r.datos["salida"], "encargo.md")))
        r = self.lanzar(ej, "sin", "--sin-reglas")
        self.assertNotIn("Reglas de prueba", leer(recibido))

    def test_marcadores_dir_informe_y_sandbox(self):
        vistos = os.path.join(self.tmp, "vistos.txt")
        ej = self.ejecutor("falso", f'echo "$DIR|$INFORME|$SANDBOX" > {shlex.quote(vistos)}\n' + OK)
        r = self.lanzar(ej, "t1", "--sandbox", "read-only")
        dir_, informe, sandbox = leer(vistos).strip().split("|")
        self.assertEqual((dir_, informe, sandbox), (self.arbol("t1"), r.datos["informe"], "read-only"))

    def test_repo_sin_origin_no_toca_el_candado(self):
        self.git("remote", "remove", "origin")
        ej = self.ejecutor("falso", OK)
        r = self.lanzar(ej)
        self.assertEqual(r.datos["estado"], "ok", r.err)
        self.assertFalse(os.path.exists(self.activos()))

    def test_dir_existente_no_crea_arbol(self):
        otro = os.path.join(self.tmp, "manual")
        self.git("worktree", "add", "-q", "-b", "manual", otro)
        ej = self.ejecutor("falso", OK)
        r = self.lanzar(ej, "t1", "--dir", otro)
        self.assertEqual(r.datos["estado"], "ok", r.err)
        self.assertEqual(r.datos["arbol"], otro)
        self.assertEqual(r.datos["rama"], "manual")
        self.assertFalse(os.path.exists(self.arbol("t1")))
        self.assertTrue(os.path.exists(os.path.join(otro, "nuevo.txt")))

    def test_base_explicita(self):
        self.git("branch", "otra")
        with open(os.path.join(self.repo, "mas.txt"), "w") as f:
            f.write("x\n")
        self.git("add", "-A")
        self.git("commit", "-q", "-m", "mas")
        ej = self.ejecutor("falso", OK)
        r = self.lanzar(ej, "t1", "--base", "otra")
        self.assertEqual(r.datos["base"], self.git("rev-parse", "otra").strip())
        self.assertFalse(os.path.exists(os.path.join(self.arbol("t1"), "mas.txt")))

    def test_preparar_corre_dentro_del_arbol(self):
        ej = self.ejecutor("falso", OK + '\ntest -e preparado.txt || exit 9')
        r = self.lanzar(ej, "t1", "--preparar", "echo listo > preparado.txt")
        self.assertEqual(r.datos["estado"], "ok", r.err)
        self.assertIn("preparado.txt", r.datos["archivos"])

    def test_preparar_que_falla_no_corre_el_ejecutor(self):
        marca = os.path.join(self.tmp, "corrio.txt")
        ej = self.ejecutor("falso", f"touch {shlex.quote(marca)}\n" + OK)
        r = self.lanzar(ej, "t1", "--preparar", "exit 7")
        self.assertEqual((r.codigo, r.datos["estado"]), (1, "fallo"))
        self.assertFalse(os.path.exists(marca))
        self.assertEqual(self.pushurl(), PUSHURL_ORIGINAL)

    def test_disponibles_json(self):
        self.ejecutor("falso", OK)
        self.ejecutor("sin-binario", OK)
        self.config["ejecutores_externos"]["sin-binario"]["comando"][0] = "/no/existe/binario"
        self.config["ejecutores_externos"]["inactivo"] = dict(self.config["ejecutores_externos"]["falso"], activo=False)
        self.ejecutor("codex-falso", OK, cupo="codex")
        with open(self.cfg_ruta, "w") as f:
            json.dump(self.config, f)
        self.sesion_codex(90.0, "2026-11-16T10:00:00Z")
        r = subprocess.run([sys.executable, SCRIPT, "disponibles", "--json"], capture_output=True,
                           text=True, env=self.env)
        filas = {f["ejecutor"]: f for f in json.loads(r.stdout)}
        self.assertEqual(set(filas), {"falso", "sin-binario", "codex-falso"})
        self.assertTrue(filas["falso"]["apto"])
        self.assertFalse(filas["sin-binario"]["apto"])
        self.assertFalse(filas["codex-falso"]["apto"])
        self.assertEqual(filas["codex-falso"]["cupo_pct"], 90.0)
        self.assertEqual(filas["falso"]["sirve_para"], "pruebas")

    def fila_registro(self, ej, estado, horas_atras, corta=False):
        import datetime
        from zoneinfo import ZoneInfo
        f = (datetime.datetime.now(ZoneInfo("America/Santiago")) - datetime.timedelta(hours=horas_atras)).isoformat()
        cols = [f, ej, "n", "r", estado] if corta else [f, ej, "n", "r", estado, "1", "", "", "", "3"]
        ruta = self.env["ENCARGOS_REGISTRO"]
        nuevo = not os.path.exists(ruta)
        with open(ruta, "a") as fh:
            fh.write(("fecha\tejecutor\tnombre\trepo\testado\n" if nuevo else "") + "\t".join(cols) + "\n")
        return f

    def disponibles(self):
        r = subprocess.run([sys.executable, SCRIPT, "disponibles", "--json"], capture_output=True,
                           text=True, env=self.env)
        self.assertEqual(r.returncode, 0, r.stderr)
        return {f["ejecutor"]: f for f in json.loads(r.stdout)}

    def test_B_cupo_reciente_no_apto_con_fecha(self):
        self.ejecutor("x", OK)
        self.fila_registro("x", "cupo", 1)
        f = self.disponibles()["x"]
        self.assertFalse(f["apto"])
        self.assertEqual(f["ultimo_estado"], "cupo")
        self.assertIn("ultimo_fecha", f)
        r = subprocess.run([sys.executable, SCRIPT, "disponibles"], capture_output=True, text=True, env=self.env)
        self.assertIn("no apto", r.stdout)
        self.assertIn(f"sin cupo en el último encargo ({f['ultimo_fecha']})", r.stdout)

    def test_B_no_responde_reciente_fila_corta_tambien_cuenta(self):
        self.ejecutor("x", OK)
        self.fila_registro("x", "no-responde", 2, corta=True)
        self.assertFalse(self.disponibles()["x"]["apto"])

    def test_B_cupo_viejo_fuera_de_memoria_es_apto(self):
        self.ejecutor("x", OK)
        self.fila_registro("x", "cupo", 30)
        f = self.disponibles()["x"]
        self.assertTrue(f["apto"])
        self.assertNotIn("ultimo_estado", f)

    def test_B_ok_posterior_lo_vuelve_apto(self):
        self.ejecutor("x", OK)
        self.fila_registro("x", "cupo", 3)
        self.fila_registro("x", "ok", 1)
        self.assertTrue(self.disponibles()["x"]["apto"])

    def test_B_memoria_es_por_ejecutor(self):
        self.ejecutor("x", OK)
        self.ejecutor("y", OK)
        self.fila_registro("x", "cupo", 1)
        d = self.disponibles()
        self.assertFalse(d["x"]["apto"])
        self.assertTrue(d["y"]["apto"])

    def test_B_registro_corrupto_decide_como_antes(self):
        self.ejecutor("x", OK)
        with open(self.env["ENCARGOS_REGISTRO"], "w") as fh:
            fh.write("basura\n\t\t\n\x00\xff x\tx\tx\tx\tcupo\nno-fecha\tx\tn\tr\tcupo\n")
        self.assertTrue(self.disponibles()["x"]["apto"])

    def test_B_registro_ausente_es_apto(self):
        self.ejecutor("x", OK)
        self.assertFalse(os.path.exists(self.env["ENCARGOS_REGISTRO"]))
        self.assertTrue(self.disponibles()["x"]["apto"])

    def test_B_memoria_configurable_en_horas(self):
        self.ejecutor("x", OK)
        self.config["ejecutores_externos_memoria_cupo_horas"] = 0.5
        with open(self.cfg_ruta, "w") as fh:
            json.dump(self.config, fh)
        self.fila_registro("x", "cupo", 1)
        self.assertTrue(self.disponibles()["x"]["apto"])

    def test_E6_lanzar_no_consulta_la_memoria_de_cupo(self):
        ej = self.ejecutor("falso", OK)
        self.fila_registro("falso", "cupo", 0.01)
        r = self.lanzar(ej)
        self.assertEqual((r.codigo, r.datos["estado"]), (0, "ok"), r.err)

    def test_cupo_muestra_plan_y_porcentaje(self):
        self.sesion_codex(42.5, "2026-11-16T15:00:00Z")
        r = subprocess.run([sys.executable, SCRIPT, "cupo"], capture_output=True, text=True, env=self.env)
        self.assertEqual(r.returncode, 0)
        self.assertIn("plan prolite", r.stdout)
        self.assertIn("42.5 % usado", r.stdout)
        self.assertIn("hora de Chile", r.stdout)
        self.assertIn("12:00", r.stdout)  # 15:00Z = 12:00 en Chile (UTC-3)
        sin = subprocess.run([sys.executable, SCRIPT, "cupo"], capture_output=True, text=True,
                             env=dict(self.env, CODEX_HOME=os.path.join(self.tmp, "vacio")))
        self.assertEqual(sin.returncode, 1)


class Validacion(Base):
    def assert_uso(self, args, nombre="t1"):
        antes = set(os.listdir(self.tmp))
        r = subprocess.run([sys.executable, SCRIPT, *args], capture_output=True, text=True, env=self.env)
        self.assertEqual(r.returncode, 2, r.stdout + r.stderr)
        self.assertEqual(len(r.stderr.strip().splitlines()), 1, r.stderr)
        self.assertEqual(set(os.listdir(self.tmp)), antes)
        self.assertFalse(os.path.exists(self.arbol(nombre)))
        self.assertEqual(self.ramas(), [])
        self.assertFalse(os.path.exists(self.env["ENCARGOS_DIR"]))
        self.assertFalse(os.path.exists(self.env["ENCARGOS_REGISTRO"]))

    def base(self, ej, **cambios):
        a = {"--repo": self.repo, "--nombre": "t1", "--encargo": self.encargo}
        a.update(cambios)
        return ["lanzar", ej] + [x for k, v in a.items() for x in (k, v)]

    def test_entradas_invalidas_dan_exit_2_sin_crear_nada(self):
        ej = self.ejecutor("falso", OK)
        self.config["ejecutores_externos"]["apagado"] = dict(self.config["ejecutores_externos"]["falso"], activo=False)
        self.config["ejecutores_externos"]["sin-bin"] = dict(self.config["ejecutores_externos"]["falso"],
                                                             comando=["/no/existe/bin", "{encargo}"])
        with open(self.cfg_ruta, "w") as f:
            json.dump(self.config, f)
        no_git = os.path.join(self.tmp, "no-git")
        os.makedirs(no_git)
        casos = {
            "ejecutor desconocido": self.base("fantasma"),
            "ejecutor inactivo": self.base("apagado"),
            "binario fuera del PATH": self.base("sin-bin"),
            "repo no git": self.base(ej, **{"--repo": no_git}),
            "encargo inexistente": self.base(ej, **{"--encargo": os.path.join(self.tmp, "no.md")}),
            "nombre con mayúsculas": self.base(ej, **{"--nombre": "Malo"}),
            "nombre con barra": self.base(ej, **{"--nombre": "a/b"}),
            "nombre largo": self.base(ej, **{"--nombre": "a" * 42}),
        }
        for caso, args in casos.items():
            with self.subTest(caso):
                self.assert_uso(args, nombre=dict(zip(args[2::2], args[3::2])).get("--nombre", "t1"))

    def test_arbol_existente_da_exit_2(self):
        ej = self.ejecutor("falso", OK)
        os.makedirs(self.arbol("t1"))
        r = subprocess.run([sys.executable, SCRIPT, *self.base(ej)], capture_output=True, text=True, env=self.env)
        self.assertEqual(r.returncode, 2)
        self.assertEqual(self.ramas(), [])


class LimpiarYDesbloquear(Base):
    def test_limpiar_borra_arbol_y_rama_si_el_trabajo_esta_en_el_parche(self):
        ej = self.ejecutor("falso", OK)
        self.assertEqual(self.lanzar(ej).datos["estado"], "ok")
        r = subprocess.run([sys.executable, SCRIPT, "limpiar", "--repo", self.repo, "--nombre", "t1"],
                           capture_output=True, text=True, env=self.env)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertFalse(os.path.exists(self.arbol("t1")))
        self.assertEqual(self.ramas(), [])

    def test_limpiar_se_niega_con_cambios_sin_parche_y_forzar_lo_borra(self):
        ej = self.ejecutor("falso", OK)
        self.lanzar(ej)
        with open(os.path.join(self.arbol("t1"), "extra.txt"), "w") as f:
            f.write("trabajo posterior\n")
        args = [sys.executable, SCRIPT, "limpiar", "--repo", self.repo, "--nombre", "t1"]
        r = subprocess.run(args, capture_output=True, text=True, env=self.env)
        self.assertEqual(r.returncode, 2)
        self.assertTrue(os.path.exists(self.arbol("t1")))
        r = subprocess.run(args + ["--forzar"], capture_output=True, text=True, env=self.env)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertFalse(os.path.exists(self.arbol("t1")))

    def poner_marca(self, nombre, pid):
        os.makedirs(self.activos(), exist_ok=True)
        with open(os.path.join(self.activos(), ".pushurl-original"), "w") as f:
            f.write("valor\n" + PUSHURL_ORIGINAL)
        with open(os.path.join(self.activos(), nombre), "w") as f:
            f.write(str(pid))
        self.git("config", "remote.origin.pushurl", BLOQUEADO)

    def desbloquear(self):
        return subprocess.run([sys.executable, SCRIPT, "desbloquear", "--repo", self.repo],
                              capture_output=True, text=True, env=self.env)

    def test_desbloquear_quita_marca_de_pid_muerto_y_restaura(self):
        p = subprocess.Popen(["true"])
        p.wait()
        self.poner_marca("huerfano", p.pid)
        r = self.desbloquear()
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(self.pushurl(), PUSHURL_ORIGINAL)
        self.assertFalse(os.path.exists(self.activos()))

    def test_desbloquear_respeta_una_marca_con_pid_vivo(self):
        self.poner_marca("vivo", os.getpid())
        r = self.desbloquear()
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(self.pushurl(), BLOQUEADO)
        self.assertTrue(os.path.exists(os.path.join(self.activos(), "vivo")))

    def test_desbloquear_sin_candado_no_hace_nada(self):
        r = self.desbloquear()
        self.assertEqual(r.returncode, 0)
        self.assertEqual(self.pushurl(), PUSHURL_ORIGINAL)


if __name__ == "__main__":
    unittest.main()
