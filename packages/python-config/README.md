# @devground/python-config

Configuracion devground para proyectos **Python y FastAPI**: `ruff`, `pytest` y `pre-commit`.

```bash
npx @devground/python-config
```

No necesita `package.json`. Detecta el proyecto por sus manifiestos (`pyproject.toml`,
`requirements.txt`, `setup.py`...) y **nunca sobreescribe** una configuracion existente:
te dice que salto y por que.

## Que instala

| Archivo | Que trae |
|---|---|
| `ruff.toml` | Reglas conservadoras: `E4`, `E7`, `E9`, `F` (pyflakes), `I` (isort), `W`. Formato con comillas dobles. |
| `pytest.ini` | Descubrimiento estandar de tests. **Con FastAPI** agrega `asyncio_mode = auto`. |
| `.pre-commit-config.yaml` | Higiene de archivos, `ruff` + `ruff-format`, y un guard contra commitear `.env`. |

Despues de instalar, para que el gate corra en cada commit:

```bash
pip install pre-commit && pre-commit install
```

> **Si ya corriste `devground-init machine`**, instala solo la herramienta:
> `pip install pre-commit`. NO corras `pre-commit install` — se niega a operar
> con un `core.hooksPath` global (*"Cowardly refusing to install hooks with
> core.hooksPath set"*), y los hooks de maquina ya ejecutan esta configuracion
> en cada commit. El instalador detecta el caso y te dice cual corresponde.

## Tres decisiones que no son arbitrarias

Esta configuracion esta **cosechada de un repo en produccion** (ADR-0035), no escrita desde
teoria. Las tres decisiones que mas importan y por que:

1. **Reglas de ruff conservadoras.** Un preset agresivo produce cientos de hallazgos el primer
   dia en un repo existente y termina desactivado. `B`/`C4`/`SIM`/`UP` se suman despues, cuando
   ya convives con esto.
2. **Ni mypy ni pytest en el pre-commit.** Un gate lento se saltea con `--no-verify`, y un gate
   que se saltea no es un gate. Van en CI, donde el tiempo no te interrumpe.
3. **Guard explicito contra `.env`.** `detect-private-key` solo ve claves privadas; un `.env`
   commiteado se le escapa, y es la fuga mas comun en la practica.

## FastAPI: por que cambia el `pytest.ini`

Sin `asyncio_mode = auto`, cada test asincrono se marca **skipped en silencio** y la suite pasa
en verde sin haber corrido nada. Es peor que no tener tests, porque parece que los tienes.
El instalador detecta FastAPI en tus manifiestos y elige la plantilla correcta.

## Relacionado

- [ADR-0035](../../docs/adr/0035-cobertura-python-y-tanstack.md) — por que se cosecha en vez de inventar
- [ADR-0034](../../docs/adr/0034-instalacion-por-maquina.md) — `devground-init machine` corre estos hooks a nivel de maquina
