# ADR-0022: Ratchet de cobertura global + gate en CI

- **Estado**: Propuesto
- **Fecha**: 2026-07-07
- **Decisor**: edaza
- **Aplica a**: cualquier proyecto JS/TS que adopte los estándares devground vía `devground-init`; el monorepo devground

## Contexto

[ADR-0012](0012-tests-rutas-criticas.md) fijó el estándar de tests en rutas críticas (dinero/leads/auth) pero dejó dos brechas **explícitas**: el gate de CI quedó "recomendado, no implementado aquí", y el umbral crítico no estaba cableado en ningún preset. En la práctica el requisito era de "buen comportamiento".

La telemetría de desarrollo lo confirma como el punto ciego real: los commits de test dedicados son ~2% y **no crecen** mes a mes (medición jun-jul 2026). No es falta de tests —van embebidos en commits `feat`— sino falta de un **invariante mecánico** que impida que la cobertura retroceda. El estándar existe como texto; falta como enforcement.

La tensión a resolver: se quería "amplíar la cobertura considerablemente, siempre", pero ADR-0012 **rechaza** a propósito el umbral global alto (ej. 90% de todo) porque produce tests de relleno (getters, mappers) que dan falsa confianza. Un umbral global fijo y alto reabre exactamente ese problema.

## Decisión

Adoptar un **ratchet de cobertura**: un piso global que solo puede subir, más el umbral alto y fijo de rutas críticas de ADR-0012, exigidos por un gate en CI.

1. **Rutas críticas (fijas, compartidas)** — `@devground/vitest-config` exporta `CRITICAL_GLOBS` + `CRITICAL_THRESHOLDS` (90% líneas/funciones/statements, 85% ramas) sobre `**/{payments,pricing,billing,checkout,commission,refund,auth,session,leads,webhooks,risk}/**`. Viven en el preset porque son estándar, no preferencia por-repo: no ratchetean ni se relajan.

2. **Piso global (ratchet, por-repo)** — el installer `vitest` del CLI escribe un `vitest.config.mjs` con `defineConfig({ ...base, ... })` que hereda el preset por spread e inyecta `thresholds: { ...CRITICAL_THRESHOLDS, autoUpdate: true, lines/functions/branches/statements: 0 }`. `autoUpdate` reescribe esos números a la cobertura real cuando la supera, y **nunca los baja**. Arrancan en 0 para sembrarse con la cobertura actual sin romper repos con poca cobertura hoy; de ahí, monótono hacia arriba. Vive en el repo del consumidor (committeado) porque autoUpdate solo puede reescribir el archivo de config que Vitest carga, no el preset en `node_modules`.

   **Por qué `defineConfig` + spread y NO `mergeConfig`:** verificado en dogfooding — `autoUpdate` hace una transformación *estática* del archivo de config y falla con `"configuration file is too complex"` cuando el config está envuelto en `mergeConfig(base, …)`. El spread mantiene el config plano (los literales numéricos son reescribibles) y a la vez hereda reporters/include/exclude + rutas críticas del preset. Es la diferencia entre que el ratchet ratchetee o quede muerto.

3. **Enforcement** — gate **duro en CI** (`pnpm -r test:coverage`, bloqueante; salta paquetes sin el script). Hook **suave** `pre-push` (ADR-0022, en `@devground/husky-config`): corre coverage y avisa si no alcanza, pero **nunca bloquea** (`SKIP_COVERAGE=1` para omitir). El patrón de degradación es el mismo que gitleaks en pre-commit ([ADR-0008](0008-higiene-de-secretos.md)): la garantía dura la da CI, el local solo avisa.

Los umbrales solo se exigen bajo `--coverage`; un `vitest run` normal (`pnpm -r test`) no cambia. Añadir el estándar no rompe la suite existente.

## Consecuencias

**Positivas**
- La cobertura se vuelve **monótona**: técnicamente imposible que un repo adoptante retroceda. "Amplíar siempre" pasa de intención a invariante.
- Reconcilia el pedido con ADR-0012: profundidad fija en lo crítico + piso que sube por mérito real, sin mandar un % global arbitrario que incentive relleno.
- Cero fricción al inicio (piso 0 se auto-siembra) y cero fricción diaria (hook no bloquea).

**Negativas / Trade-offs**
- `autoUpdate` reescribe el `vitest.config.mjs` cuando sube la cobertura → aparece en el diff. Es deliberado: el ratchet es visible y committeado, no mágico.
- El ratchet global no distingue código trivial de valioso; su valor real está en el suelo anti-regresión, no en el número. El umbral crítico es el que garantiza cobertura *donde importa*.
- El gate de CI de devground es no-op hasta que cada paquete define `test:coverage`; se adopta por-paquete, no de golpe.

## Alternativas consideradas

1. **Umbral global fijo y alto (~80-90%)**: descartado — es justo lo que ADR-0012 rechaza (tests de relleno). El ratchet da el efecto "sube siempre" sin fijar un número que premie el relleno.
2. **Solo rutas críticas (status quo ADR-0012)**: insuficiente para "amplíar considerablemente"; no crea presión al alza sobre el resto del código.
3. **Generador automático de tests**: descartado — tests autogenerados dan falsa confianza y no ejercitan reglas de negocio reales. El estándar instala la red y el gate; escribir el test sigue siendo del desarrollador.
4. **Gate bloqueante en pre-push**: descartado por fricción diaria (corre coverage en cada push). El usuario optó por CI duro + hook suave.

## Referencias

- [ADR-0012 — Tests obligatorios en rutas críticas](0012-tests-rutas-criticas.md) (esta ADR implementa su gate diferido).
- [ADR-0008 — Higiene de secretos](0008-higiene-de-secretos.md) (patrón de degradación explícita CI-duro / local-suave).
- Punto ciego de origen: telemetría de desarrollo jun-jul 2026 — commits de test ~2%, sin crecimiento.
- Vitest coverage thresholds + `autoUpdate`: https://vitest.dev/config/#coverage-thresholds-autoupdate
