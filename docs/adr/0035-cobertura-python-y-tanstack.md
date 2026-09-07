# ADR-0035: Cubrir Python/FastAPI y TanStack cosechando configuración ya rodada

- **Estado**: Aceptado
- **Fecha**: 2026-09-07
- **Decisor**: edaza
- **Aplica a**: `packages/python-config/` (nuevo), `packages/eslint-config/tanstack.mjs` (nuevo preset)

## Contexto

[ADR-0033](0033-salida-de-consolidacion.md) reabrió la expansión con una vara de evidencia: un
frente nuevo entra solo si cierra una brecha **medida**. Estos dos la tienen:

- **Python/FastAPI.** `atlas` es el repo más caro del autor —US$22,4k de valor-API-equivalente en
  43 días, el 17,7% del total— y es Python puro (FastAPI + asyncpg). devground no tenía **nada**
  que ofrecerle: los 23 paquetes asumían un `package.json`.
- **TanStack.** Seis repos ya usan `@tanstack/*` (`redify-inbox-tanstack`, `brekto/next`, `khoda`,
  `Operacionrenta`, `ored-next`, `Resumen-Next`), y los dos principales ya consumen el
  `@tanstack/eslint-config` oficial.

La tentación en ambos casos es escribir el estándar desde cero. Se rechaza: `atlas` ya tiene un
`.pre-commit-config.yaml` con meses de uso (ruff + ruff-format + pytest para `apps/mcp` +
detección de secretos, con comentarios que explican **por qué** mypy y pytest van en CI y no en el
hook), y TanStack ya publica un eslint-config oficial mantenido por su equipo.

## Decisión

Ambos frentes **cosechan** en vez de inventar.

### `@devground/python-config` (nuevo, `0.1.0`)

Empaqueta la configuración de `atlas` como plantillas instalables con `npx @devground/python-config`
(sin `package.json`, igual que `agents-md` o `ui-conventions`): `ruff.toml`, `pytest.ini` y
`.pre-commit-config.yaml`.

Tres decisiones heredadas de `atlas`, que son la parte valiosa del hallazgo:

1. **Reglas de ruff conservadoras** (`E4`, `E7`, `E9`, `F`, `I`, `W`). Un preset agresivo produce
   cientos de hallazgos el primer día en un repo existente y termina desactivado. Las familias
   `B`/`C4`/`SIM`/`UP` se suman en pasadas posteriores.
2. **Ni mypy ni pytest en el pre-commit.** Un gate lento se saltea con `--no-verify`, y un gate que
   se saltea no es un gate. Van en CI, donde el tiempo no interrumpe.
3. **Detección de `.env` como hook local.** `detect-private-key` solo ve claves privadas; un `.env`
   commiteado se le escapa y es la fuga más común en la práctica.

Lo que **agrega** sobre lo cosechado: detecta FastAPI en los manifiestos y, cuando lo encuentra,
instala una variante de `pytest.ini` con `asyncio_mode = auto`. Sin eso, cada test asíncrono se
marca *skipped* en silencio y la suite pasa en verde **sin haber corrido nada** — un falso positivo
peor que no tener tests. La detección lee el contenido de `pyproject.toml`, no solo nombres de
archivo, para no partir en dos una configuración de ruff o pytest ya declarada ahí.

### Preset `@devground/eslint-config/tanstack` (opt-in)

**No reemplaza** al `@tanstack/eslint-config` oficial: se compone encima y cubre dos cosas que el
oficial no toca, elegidas porque cuestan una tarde de depuración cada una:

| Regla | Severidad | Por qué |
| --- | --- | --- |
| Import de cliente de base de datos en un archivo de ruta | **error** | En Start, servidor y cliente conviven en el mismo archivo. Un import fuera de `createServerFn()` empaqueta el cliente **y sus credenciales** en el bundle del navegador. Es una fuga, no un problema de estilo. |
| `queryKey` literal inline en `useQuery` | warn | Una key escrita a mano en cada llamada es el origen habitual de la caché que no invalida. Es convención de mantenibilidad: como error rompería los repos existentes en el primer lint y terminaría desactivado entero. |

La asimetría de severidad es deliberada y es la decisión de diseño del preset: se bloquea lo que
filtra credenciales, se avisa lo que ensucia.

## Consecuencias

**Positivas**

- El repo donde ocurre el 17,7% del gasto pasa de "nada que consumir" a tener un estándar
  instalable en un comando.
- Lo que se distribuye ya sobrevivió meses en producción: es configuración validada, no una
  opinión.
- El preset de TanStack no compite con el oficial, así que no hay que mantener en paralelo lo que
  su equipo ya mantiene.

**Negativas / Trade-offs**

- `python-config` nace en `0.1.0` como experimental, justo después de congelar ocho experimentales.
  Queda sujeto al mismo ciclo de graduación del ADR-0026 §2; su brecha medida es la única razón por
  la que entra.
- Las plantillas fijan versiones (`rev:` de pre-commit, `target-version = "py312"`) que envejecen.
  Sin dependabot sobre archivos de plantilla, la actualización es manual.
- La regla de `queryKey` es sintáctica: no distingue una key literal legítima (una consulta global
  sin parámetros) de una peligrosa. Por eso es `warn` y no `error`.

## Alternativas consideradas

1. **Escribir el estándar Python desde cero con las mejores prácticas del ecosistema**: descartado —
   `atlas` ya resolvió los trade-offs reales (qué va en el hook y qué en CI) con meses de uso.
   Reescribirlo desde teoría habría perdido justamente eso.
2. **Publicar el preset Python como paquete de PyPI**: descartado por ahora — obliga a mantener
   publicación en dos registros. `npx` ya está disponible en la máquina y los repos son políglotas.
3. **Bifurcar `@tanstack/eslint-config`**: descartado — obliga a seguir el upstream a mano para
   siempre.
4. **Incluir mypy en el pre-commit de Python**: descartado — es exactamente lo que `atlas` probó y
   documentó como error; el gate lento se saltea.
