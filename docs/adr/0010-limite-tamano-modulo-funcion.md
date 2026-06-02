# ADR-0010: Límite de tamaño de módulo/función + container-presentational

- **Estado**: Propuesto
- **Fecha**: 2026-06-02
- **Decisor**: edaza
- **Aplica a**: `@devground/eslint-config` y todos los paquetes/proyectos que la consumen

## Contexto

La auditoría de 6 proyectos encontró **componentes de 1300 a 1790 líneas**: archivos monolíticos donde conviven el render JSX, lógica imperativa pesada (construcción de mapas, players de audio/video, estado complejo, llamadas a APIs, transformaciones de datos) y efectos. Síntomas directos de esto:

- Imposibles de testear: la lógica está enredada con el render, no se puede ejercitar sin montar todo el componente.
- Imposibles de revisar: un PR que toca 1700 líneas no recibe review real.
- Re-renders y bugs de estado difíciles de aislar.
- Acoplamiento total: cambiar el layout obliga a navegar lógica de negocio y viceversa.

El tamaño excesivo es un **síntoma medible** de una falta de separación de responsabilidades. No es el problema en sí, pero es una señal barata de detectar automáticamente que casi siempre apunta a un problema real.

## Decisión

### Umbrales como señal de refactor

Se fijan umbrales orientativos que, al superarse, son **señal de que hay que refactorizar** (no una prohibición dura):

- **Archivo/módulo > ~400 líneas** → señal de refactor.
- **Función/componente > ~80 líneas** → señal de refactor.

### Separación obligatoria de responsabilidades

- **Lógica imperativa fuera del render.** La construcción de mapas, players, clientes de API, máquinas de estado, parsers y transformaciones se extraen a módulos/hooks propios (`useMapController`, `createAudioPlayer`, `mapToViewModel`). El componente consume, no implementa.
- **Patrón container-presentational en frontend.** Separar el **contenedor** (obtiene datos, mantiene estado, orquesta) del **presentacional** (recibe props, renderiza, sin side-effects). Esto hace el presentacional trivialmente testeable y reusable.

### Enforcement automático (ESLint)

Se añaden a `@devground/eslint-config` (preset base, heredado por el preset Next.js) las reglas:

```js
'max-lines': ['warn', { max: 400, skipBlankLines: true, skipComments: true }],
'max-lines-per-function': ['warn', { max: 80, skipBlankLines: true, skipComments: true, IIFEs: true }],
```

Se eligen como **`warn`**, no `error`, deliberadamente: el tamaño es una *señal*, no una falta categórica. Hay funciones legítimamente largas (un `switch` exhaustivo, un schema grande). El `warn` genera una conversación en el review sin bloquear el build. Si un proyecto quiere endurecerlo, puede subirlo a `error` en su config local.

## Consecuencias

**Positivas**
- Señal automática y temprana de archivos/funciones que crecieron demasiado.
- Empuja la lógica imperativa fuera del render → componentes testeables (habilita [ADR-0011](0011-tests-rutas-criticas.md)).
- Container-presentational mejora reuso y aísla el estado.
- `warn` mantiene DX: informa sin frenar.

**Negativas / Trade-offs**
- `max-lines-per-function` puede marcar funciones largas pero legítimas (schemas, configs, switches exhaustivos). Mitigación: `// eslint-disable-next-line max-lines-per-function` justificado con comentario, o extraer la constante.
- Los umbrales (400/80) son heurísticos, no verdades absolutas. Se documentan como tales.
- El warn puede ignorarse; depende de la cultura de review prestarle atención.

## Alternativas consideradas

1. **`error` en vez de `warn`**: descartado para el default. Bloquearía builds por un *síntoma* y empujaría a la gente a partir funciones de forma artificial solo para callar al linter. El proyecto puede endurecerlo si quiere.
2. **Sin límite, confiar en review**: descartado — es lo que permitió los componentes de 1790 líneas.
3. **`complexity` / `max-statements` adicionales**: buenas reglas complementarias, pero generan más ruido y falsos positivos al inicio. Se dejan fuera de este ADR para no sobrecargar; re-evaluables.
4. **Umbrales más bajos (ej. 200/50)**: descartado por ahora — demasiado ruido inicial en bases existentes. 400/80 atrapa los casos patológicos sin avalancha de warnings.

## Referencias

- Punto ciego de origen: auditoría de 6 proyectos — componentes de 1300–1790 líneas mezclando lógica y render.
- Enforcement implementado en: `packages/eslint-config/index.mjs` (reglas `max-lines`, `max-lines-per-function`).
- Reglas ESLint: [`max-lines`](https://eslint.org/docs/latest/rules/max-lines), [`max-lines-per-function`](https://eslint.org/docs/latest/rules/max-lines-per-function).
- Construye sobre [ADR-0003 — ESLint Flat Config](0003-eslint-flat-config.md).
