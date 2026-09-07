---
"@devground/eslint-config": minor
---

Cobertura para los dos stacks que el toolkit no alcanzaba (ADR-0035). Los dos frentes **cosechan** configuracion ya rodada en vez de inventarla.

**`@devground/python-config@0.1.0`** (nuevo; sin entrada de version propia a proposito, para que su primer release salga como 0.1.0 y no 0.2.0): `ruff.toml`, `pytest.ini` y `.pre-commit-config.yaml` instalables con `npx @devground/python-config`, sin necesidad de `package.json`. Sale del `.pre-commit-config.yaml` de atlas — el repo mas caro del autor, Python puro, con meses de uso — incluidas sus tres decisiones no obvias: reglas de ruff conservadoras (un preset agresivo termina desactivado), ni mypy ni pytest en el hook (un gate lento se saltea con `--no-verify`), y un guard explicito contra commitear `.env` (que `detect-private-key` no ve). Agrega deteccion de FastAPI: cuando lo encuentra instala un `pytest.ini` con `asyncio_mode = auto`, sin el cual cada test asincrono se marca skipped en silencio y la suite pasa en verde sin correr nada.

**Preset `@devground/eslint-config/tanstack`** (opt-in): se compone ENCIMA del `@tanstack/eslint-config` oficial, no lo reemplaza. Cubre dos cosas que el oficial no toca: importar el cliente de base de datos en un archivo de ruta de Start (**error** — en Start el codigo de servidor y cliente conviven, y fuera de `createServerFn()` eso empaqueta las credenciales en el bundle del navegador) y las `queryKey` literales inline (**warn** — origen habitual de la cache que no invalida, pero como error rompe repos existentes al primer lint).
