---
name: audit-devground-init
description: >-
  Skill de auditoría destilada para el flujo "devground-init". Acumula el conocimiento
  de auditorías previas: invariantes confirmadas, falsos positivos ya descartados,
  y edge cases descubiertos. La cargas ANTES de re-auditar devground-init para partir de
  un piso más alto y reducir ruido. Generada y mantenida por @devground/deepcheck.
---

# Auditoría destilada — devground-init

> Generada por deepcheck. Última corrida: 2026-06-03T15:00:00-04:00. Corridas acumuladas: 2.

## Cambios entre corridas (delta crítico — leer primero)

Entre la corrida 1 y la 2, TRES hallazgos previos se ARREGLARON en `index.ts`. Verifica que sigan
arreglados; si una de estas guardas desaparece, vuelve a ser hallazgo:

- **`--preset` inválido** ya valida y hace `error()+exit(1)` (`index.ts:57-60`). Lo que queda es la falta de TEST del cableado, no el bug.
- **no-TTY/CI sin `--yes`** ya se rechaza con `exit(1)` ANTES del prompt (`index.ts:100-103`). El falso éxito desapareció. Lo que queda es la falta de TEST de esa guarda.
- **`catch` de `detectStack`** ya tiene binding y discrimina `ENOENT` vs error real (`index.ts:67-77`). El diagnóstico falso desapareció.

Estos tres viven en ruta crítica de integridad en CI y NO tienen red de tests: una regresión que los mueva/invierta no la detecta ninguna suite.

## Mapa del flujo

`packages/cli/src/index.ts` es el orquestador: valida `--preset` (exit 1 si inválido), rechaza entornos no-TTY sin `--yes`/`--preset`, lee el manifest de versión, llama `detectStack` (`src/detect-stack.ts` → `utils/package-json.ts:readPackageJson` con `readFileSync`+`JSON.parse`), resuelve el set de herramientas (preset estático vía `selectPresetValues` o prompt `prompts`), itera los installers en serie acumulando `failures`, y al final imprime un tally `succeeded/total` que decide el `process.exit`.
Cada herramienta vive en `packages/cli/src/installers/*.ts` (prettier, eslint, tsconfig, commitlint, lint-staged, husky, agents-md, architecture-guide). Patrón típico: `addDevDependency(...)` (que shellea `npm/pnpm/yarn add -D` vía `utils/exec.ts:run()` con `execSync`) y luego escritura del config protegida por el write-guard (`installers/write-guard.ts`).
El write-guard es la garantía central de "no sobreescribir"; husky/agents-md/architecture-guide la EVADEN delegando la escritura a un binario externo.
El contrato público se documenta en tres lugares que tienden a desincronizarse: `README.md` raíz, `packages/cli/README.md` y la tabla "What it does".

## Invariantes confirmadas

Cosas que SON verdad de este flujo y no hay que re-verificar desde cero (pero sí
re-chequear que sigan siendo verdad si el código cambió):

- `readPackageJson` vive en `src/utils/package-json.ts:9-13` (NO en `src/ops/package-json.ts` — ese path no existe; los installers la consumen vía `ops.readPackageJson` y `detect-stack.ts` directamente). Hace `JSON.parse(raw) as Record<string, unknown>` SIN validar que el resultado sea un objeto plano. Es la fuente raíz del hallazgo HIGH de forma (ver hotspots qa-edge).
- `run()` (`utils/exec.ts`) usa `execSync(cmd, ...)` con `stdio:'pipe'` y string interpolado (shell habilitado). Inyectable POR DISEÑO pero NO explotable en este flujo: todos los inputs son listas estáticas internas o el nombre del PM detectado, no datos de usuario no confiables. No re-reportar como vuln de seguridad.
- Los casts `as` en fronteras (`readPackageJson` → `as Record<string, unknown>`, manifest → `as { version: string }`, `response.tools as string[]`) NO violan ADR-0011 (su alcance es DB/API, no CLI args/FS local). No re-reportar como hallazgo de tipos por sí solos. OJO: esto NO absuelve la falta de validación de FORMA en `readPackageJson` — ese sí es un defecto de correctitud real (ver hotspots), distinto del cast.
- El callback `.action()` de `index.ts` queda JUSTO bajo el umbral de función de ADR-0010. No dispara ni la señal `warn`. No re-reportar como violación de límites.
- `getInstallCmd` (`package-json.ts:27-35`) mapea correctamente pnpm/yarn/npm a `pnpm add -D` / `yarn add -D` / `npm install -D`. La lógica es correcta; lo que falta es TEST, no fix.
- La promesa del README raíz sobre el script `prepare` SÍ se cumple (lo escribe husky vía su binario, fuera de `packages/cli/src/`). No confundir con el hallazgo HIGH histórico de lint-staged.
- El installer prettier (y el patrón general) ejecuta `addDevDependency` ANTES del guard. Estructural y confirmado; el guard solo protege el archivo de config, nunca los side effects de instalación.
- La action ES `async` (`index.ts:52`) y se invoca con `program.parse()` síncrono (`index.ts:156`), NO `parseAsync`. Mecanismo factualmente correcto pero suprimido (ver supresiones); no re-reportar sin nueva evidencia de daño observable.
- Tests existentes (la red ACTUAL): `src/detect-stack.test.ts`, `src/select.test.ts`, `src/utils/package-json.test.ts`, `src/installers/installers.test.ts`. NINGUNO importa `index.ts` → toda la orquestación (tally, exit codes, guardas de preset/TTY) está sin cubrir.

## Hotspots por dimensión

Dónde mirar primero en cada dimensión, aprendido de corridas anteriores:

- **qa-edge (fuente raíz #1):** validación de forma en `readPackageJson` (`utils/package-json.ts:9-13`). `package.json` JSON-válido-pero-no-objeto produce tres daños del MISMO origen: (a) ARRAY `[]` → data loss silencioso (instala deps reales, reescribe package.json perdiendo el original, reporta success); (b) escalar `42`/`"x"` → TypeError engañoso atribuido a Prettier; (c) `null` → "Could not read package.json" factualmente falso. Fix correcto: validar forma en `readPackageJson`/`detectStack`, NO parchear cada installer. Severidad consolidada HIGH (por el caso array). Revisar también el orden `addDevDependency` antes de la escritura en cada installer, y los que evaden el guard (agents-md, architecture-guide).
- **aud-tests:** la orquestación de `index.ts` no tiene test (ninguna suite importa `index.ts`). Prioriza las guardas de ruta crítica recién añadidas: rechazo no-TTY (`index.ts:100-103`, HIGH sin red) y cableado de `--preset` inválido → exit 1 (`index.ts:57-60`, LOW: la función pura `isValidPreset`/`selectPresetValues` SÍ está testeada en `select.test.ts`, solo falta el efecto secundario). La rama de dos archivos de tsconfig Next tampoco tiene test.
- **val-contracts:** (1) el tally final (`index.ts:142-152`) cuenta `succeeded = total - failures`, así que un installer OMITIDO (skip por guard) se reporta como "configured successfully" → sobre-reporta el efecto real; debería distinguir installed/skipped/failed. NO es el `success()` interno de tsconfig (ese ya intenta ser honesto), es el AGREGADO de `index.ts`. (2) README raíz lista preset `next-loose` que NO se publica en el tarball y omite `next-typecheck` que SÍ se publica y que el CLI consume (`README.md:107`); la descripción del `package.json` del tsconfig sí es correcta.
- **val-requirements (doc↔código):** comparar SIEMPRE las 3 docs contra el comportamiento real. Confirmado run 2: el diff "Qué pasa en esos 30 segundos" del README raíz (`README.md:55`) promete `tsconfig.typecheck.json` como salida fija, pero el CLI solo lo crea en proyectos Next.js; la línea de eslint del mismo bloque SÍ anota la condicionalidad y `packages/cli/README.md:31` lo documenta bien. Hallazgos históricos a re-chequear: lint-staged config key, garantía "No sobreescribe" para husky/agents-md/architecture-guide, architecture-guide ausente de la tabla del CLI.
- **aud-perf:** el loop de installers (`index.ts:132-140`) dispara hasta 6 `add -D` (+3 npx) en serie; cada uno re-resuelve el grafo, re-lee/escribe lockfile y reconstruye node_modules. Los paquetes se conocen ANTES (listas estáticas; única variación = rama Next de eslint, determinística desde el stack ya detectado): recolectarlos y pasarlos en UNA sola invocación recorta latencia de ~6x a 1x. Costo dominante; el resto del I/O síncrono es aceptable para un CLI de un disparo.

## Falsos positivos conocidos (supresiones)

Hallazgos reportados antes y descartados. **Cada uno lleva fecha + razón.** El
destilador los RE-VALIDA periódicamente: una supresión no es para siempre.

| Hallazgo | Razón del descarte | Fecha | Re-validar después de |
|----------|--------------------|-------|------------------------|
| README raíz promete un script `prepare` que ningún installer escribe | Falso positivo por grep mal acotado a `packages/cli/src/`. La promesa SÍ se cumple (lo escribe husky vía su binario, fuera de ese path) | 2026-06-03T15:00:00-04:00 | re-validar si cambia README.md o packages/cli/src/installers/husky.ts |
| detectFramework/readPackageJson castean con `as` en frontera no confiable (invocando ADR-0011) | El cast en sí NO viola ADR-0011 (alcance DB/API, no CLI/FS). OJO: la falta de validación de FORMA en readPackageJson SÍ es defecto real y está PROMOVIDA a hallazgo HIGH (qa-edge) — esta supresión cubre solo la atribución a ADR-0011, no el bug de forma | 2026-06-03T15:00:00-04:00 | re-validar si cambia knowledge/adr/0011-*.md o utils/package-json.ts |
| Errores de npx/instalación pierden detalle cuando la tool escribe diagnósticos en stdout | Mecanismo real pero impacto no aplica: run() usa stdio:'pipe' y descarta e.stdout; index.ts solo imprime err.message — el detalle ya estaba fuera del alcance del flujo | 2026-06-03T15:00:00-04:00 | re-validar si cambia utils/exec.ts o el manejo de error en index.ts |
| Falla parcial en installers que shellean deja entorno inconsistente sin rollback | Descripción mecánica exacta pero tratado bajo qa-edge de tsconfig/instalación, no como hallazgo de errores independiente | 2026-06-03T15:00:00-04:00 | re-validar si cambia husky.ts, agents-md.ts o architecture-guide.ts |
| run() ejecuta execSync con string interpolado (inyectable) y addDevDependency es sink latente | Código factualmente correcto pero NO explotable: inputs son listas estáticas internas / nombre de PM, no datos no confiables | 2026-06-03T15:00:00-04:00 | re-validar si exec.ts o package-json.ts empiezan a interpolar input de usuario |
| El callback .action() concentra demasiadas responsabilidades (borde de ADR-0010) | Auto-clasificado info; NO viola el umbral ni dispara la señal warn; premisa numérica débil | 2026-06-03T15:00:00-04:00 | re-validar si crece index.ts o cambia knowledge/adr/0010-*.md |
| La selección del prompt se castea a string[] sin validar (index.ts:122) | Cast real y response.tools es any por @types/prompts, pero no genera daño en este flujo (mismo razonamiento que ADR-0011 sobre fronteras) | 2026-06-03T15:00:00-04:00 | re-validar si cambia index.ts:122 o el manejo del response del prompt |
| El manifest se castea a { version: string } sin validar (index.ts:41) | Cierto a nivel sintáctico pero la atribución de riesgo no aplica: el manifest es artefacto interno controlado, no frontera no confiable | 2026-06-03T15:00:00-04:00 | re-validar si el manifest pasa a leerse de fuente externa |
| El orquestador index.ts no tiene NINGÚN test (loop de orquestación / exit code) | Hecho crudo cierto (ninguna suite importa index.ts) pero descartado como hallazgo de correctitud; es deuda de cobertura. NOTA: las guardas específicas de no-TTY y preset SÍ se promovieron a hallazgos aud-tests por ser ruta crítica recién introducida | 2026-06-03T15:00:00-04:00 | re-validar si se agrega/quita cobertura sobre index.ts |
| package-json.ts: addDevDependency y getInstallCmd sin test | Descripción correcta pero es falta de test, no fix; getInstallCmd ya está confirmado como lógicamente correcto (ver invariantes) | 2026-06-03T15:00:00-04:00 | re-validar si cambia utils/package-json.ts |
| La action es async pero se invoca con program.parse() síncrono → unhandled rejection del prompt | Mecanismo factualmente verificado (action async en :52, parse() síncrono en :156) pero descartado: en este flujo no produce el camino de error sucio descrito de forma accionable; sin evidencia de daño observable | 2026-06-03T15:00:00-04:00 | re-validar si cambia index.ts:52/156 o se añade lógica async tras el prompt |
| La rama catch de detectStack (ENOENT vs error real) no tiene test que verifique diagnóstico y exit(1) | Factualmente cierto pero NO es defecto de correctitud (el catch YA discrimina bien en :67-77 desde run 2) y es repetición de la deuda de cobertura ya suprimida de index.ts | 2026-06-03T15:00:00-04:00 | re-validar si cambia index.ts:67-77 o se añade detect-stack/index integration test |

## Edge cases descubiertos

- **package.json JSON-válido-pero-no-objeto** — fuente raíz HIGH, tres manifestaciones del mismo bug en `readPackageJson` (`utils/package-json.ts:9-13`):
  - ARRAY `[]`: data loss silencioso (instala deps, reescribe package.json perdiendo el original, reporta success). Daño directo según ADR-0012.
  - escalar `42` / `"x"`: TypeError engañoso atribuido a Prettier (el installer real que primero lee propiedades).
  - `null`: "Could not read package.json" factualmente falso (el archivo existe y se leyó bien; el problema es el contenido).
- **package.json existente pero malformado (SyntaxError) o sin permisos (EACCES):** RESUELTO en run 2. El catch de `index.ts:67-77` ahora discrimina `ENOENT` (mensaje de "falta package.json") vs cualquier otro error (surfacea `err.message`). Re-verificar que la discriminación siga si se toca el catch.
- **Entorno no-TTY / CI sin `--yes`:** RESUELTO en run 2. `index.ts:100-103` rechaza con `exit(1)` antes del prompt. El falso éxito (exit 0 con cero instalado) desapareció. SIN TEST — regresión silenciosa posible.
- **`--preset` con valor inválido:** RESUELTO en run 2. `index.ts:57-60` valida y hace `error()+exit(1)`. Ya no cae al prompt. SIN TEST del cableado (la función pura sí está cubierta en `select.test.ts`).
- **Config preexistente con guard:** el config se respeta (skip) pero las dependencias YA se instalaron antes del guard → árbol modificado + commit sucio. Además, el tally agregado (`index.ts:142-152`) cuenta ese skip como "configured successfully" — sobre-reporte del efecto real.
- **tsconfig Next con UN solo archivo preexistente** (tsconfig.json XOR tsconfig.typecheck.json): estado parcial, uno se omite y otro se escribe, pero siempre imprime success de la variante completa. Pérdida silenciosa de config (daño directo según ADR-0012). La rama de dos archivos no tiene test.
- **Stack no-Next (React/Node/lib TS):** NO se genera `tsconfig.typecheck.json`, pese a que `README.md:55` lo presenta como salida fija. Promesa documentada incumplida para la mayoría de stacks.
