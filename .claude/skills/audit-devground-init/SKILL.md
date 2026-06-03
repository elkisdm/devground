---
name: audit-devground-init
description: >-
  Skill de auditoría destilada para el flujo "devground-init". Acumula el conocimiento
  de auditorías previas: invariantes confirmadas, falsos positivos ya descartados,
  y edge cases descubiertos. La cargas ANTES de re-auditar devground-init para partir de
  un piso más alto y reducir ruido. Generada y mantenida por @devground/deepcheck.
---

# Auditoría destilada — devground-init

> Generada por deepcheck. Última corrida: 2026-06-03T13:50:00-04:00. Corridas acumuladas: 1.

## Mapa del flujo

`packages/cli/src/index.ts` es el orquestador: parsea `--yes`/`--preset`, lee el manifest de versión, llama `detectStack` (→ `utils/package-json.ts`: `readPackageJson` con `readFileSync`+`JSON.parse`), resuelve el set de herramientas (preset estático o prompt interactivo vía `prompts`), e itera los installers acumulando fallos para decidir el `process.exit`.
Cada herramienta vive en `packages/cli/src/installers/*.ts` (prettier, eslint, tsconfig, commitlint, lint-staged, husky, agents-md, architecture-guide). El patrón típico es: `addDevDependency(...)` (que shellea `npm/pnpm/yarn add -D` vía `utils/exec.ts` → `run()` con `execSync`) y luego `writeFileGuarded(...)` para el config.
`writeFileGuarded` es la garantía central de "no sobreescribir"; husky/agents-md/architecture-guide la EVADEN delegando la escritura a un binario externo.
El contrato público se documenta en tres lugares que tienden a desincronizarse: `README.md` raíz, `packages/cli/README.md` y la tabla "What it does".

## Invariantes confirmadas

Cosas que SON verdad de este flujo y no hay que re-verificar desde cero (pero sí
re-chequear que sigan siendo verdad si el código cambió):

- `run()` (`utils/exec.ts:8`) usa `execSync(cmd, ...)` con `stdio:'pipe'` y string interpolado (shell habilitado). El patrón es inyectable POR DISEÑO pero NO explotable en este flujo: todos los inputs son listas estáticas internas o el nombre del PM detectado, no datos de usuario no confiables. No re-reportar como vuln de seguridad.
- Los casts `as` en fronteras (`readPackageJson` → `as Record<string, unknown>`, manifest → `as { version: string }`, `response.tools as string[]`) NO violan ADR-0011 (su alcance es DB/API, no CLI args/FS local). No re-reportar como hallazgo de tipos por sí solos.
- El callback `.action()` de `index.ts` queda JUSTO bajo el umbral de función de ADR-0010. No dispara ni la señal `warn`. No re-reportar como violación de límites.
- `getInstallCmd` (`package-json.ts:27-44`) mapea correctamente pnpm/yarn/npm a `pnpm add -D` / `yarn add -D` / `npm install -D`. La lógica es correcta; lo que falta es TEST, no fix.
- La promesa del README raíz (línea 63: "package.json ← prettier, lint-staged, prepare script") respecto al script `prepare` SÍ se cumple (lo escribe husky vía su binario, fuera de `packages/cli/src/`). No confundir con el hallazgo HIGH de lint-staged (ese SÍ es real: ver hotspots).
- El installer prettier (y el patrón general) ejecuta `addDevDependency` ANTES del guard. Esto es estructural y confirmado; el guard solo protege el archivo de config, nunca los side effects de instalación.

## Hotspots por dimensión

Dónde mirar primero en cada dimensión, aprendido de corridas anteriores:

- **val-requirements (doc↔código):** la fuente #1 de hallazgos HIGH/MEDIUM. Comparar SIEMPRE las 3 docs (`README.md` raíz, `packages/cli/README.md`, tabla "What it does") contra el comportamiento real de cada installer. Confirmados: (1) lint-staged escribe `lint-staged.config.cjs` pero el doc promete la clave `"lint-staged"` en package.json (`installers/lint-staged.ts:19-25`); (2) la garantía "No sobreescribe nada existente" (`README.md:66`) NO está respaldada por código para husky/agents-md/architecture-guide; (3) architecture-guide corre con `--yes`/`--preset full` pero falta en la tabla del CLI (`packages/cli/README.md:27-35`).
- **val-contracts:** el manejo de `--preset` inválido. Confirmado: cae silenciosamente al prompt sin error ni `exit(1)` (`index.ts:49,74-100`), inconsistente con el manejo defensivo del propio archivo (líneas 59-63, 120-125). Verificar que cualquier flag de enum valide y haga `error()+exit(1)`.
- **qa-edge:** revisar primero el orden `addDevDependency` vs `writeFileGuarded` en CADA installer, y los installers que NO usan el guard. Confirmados: prettier instala dependencias aunque omita el config (`installers/prettier.ts:9-19`); tsconfig Next deja estado PARCIAL pero declara éxito total y la rama de dos archivos no tiene test (`installers/tsconfig.ts:31-61`); agents-md y architecture-guide ignoran el guard por completo (`installers/agents-md.ts:9-12`); `readPackageJson` acepta JSON no-objeto (array/string/number/null) sin validar forma (`utils/package-json.ts:9-13`).
- **qa-errors:** el `catch` que envuelve `detectStack` (`index.ts:57-63`) es `catch` SIN binding: se traga el error real (SyntaxError de JSON malformado, EACCES) y siempre culpa a un package.json ausente. Diagnóstico falso y no accionable.
- **aud-perf:** el loop de installers (`index.ts:106-114`) dispara hasta 7-8 subprocesos de PM en serie; cada uno re-resuelve el grafo, re-lee/escribe lockfile y reconstruye node_modules. Los paquetes se conocen ANTES (listas estáticas salvo la rama Next de eslint): se podrían recolectar y pasar en UNA sola llamada. Costo dominante del flujo; escribir configs es trivial al lado.
- **qa-edge (no-TTY/CI):** `prompts` sin TTY o cancelado devuelve objeto sin `tools`; el código lo trata como "nada seleccionado" y hace `process.exit(0)` → falso éxito instalando CERO herramientas (`index.ts:79-94`). Confundir cancelación deliberada con fallo de no-TTY es la trampa.

## Falsos positivos conocidos (supresiones)

Hallazgos reportados antes y descartados. **Cada uno lleva fecha + razón.** El
destilador los RE-VALIDA periódicamente: una supresión no es para siempre.

| Hallazgo | Razón del descarte | Fecha | Re-validar después de |
|----------|--------------------|-------|------------------------|
| README raíz promete un script `prepare` que ningún installer escribe | Falso positivo por grep mal acotado a `packages/cli/src/`. La promesa SÍ se cumple (lo escribe husky vía su binario, fuera de ese path) | 2026-06-03T13:50:00-04:00 | re-validar si cambia README.md o packages/cli/src/installers/husky.ts |
| detectFramework/readPackageJson no validan forma y castean con `as` en frontera no confiable | Falso positivo: invoca ADR-0011 cuyo alcance explícito (DB/API) NO cubre CLI args/FS local | 2026-06-03T13:50:00-04:00 | re-validar si cambia knowledge/adr/0011-*.md o packages/cli/src/utils/package-json.ts |
| Errores de npx/instalación pierden detalle cuando la tool escribe diagnósticos en stdout | Mecanismo real pero impacto no aplica: run() usa stdio:'pipe' y descarta e.stdout; index.ts solo imprime err.message — el detalle ya estaba fuera del alcance del flujo | 2026-06-03T13:50:00-04:00 | re-validar si cambia packages/cli/src/utils/exec.ts o el manejo de error en index.ts |
| Falla parcial en installers que shellean deja entorno inconsistente sin rollback | Descripción mecánica exacta pero descartado en esta corrida; tratado bajo qa-edge de tsconfig/instalación, no como hallazgo de errores independiente | 2026-06-03T13:50:00-04:00 | re-validar si cambia husky.ts, agents-md.ts o architecture-guide.ts |
| run() ejecuta execSync con string interpolado (inyectable) y addDevDependency es sink latente | Código factualmente correcto pero NO explotable: inputs son listas estáticas internas / nombre de PM, no datos no confiables | 2026-06-03T13:50:00-04:00 | re-validar si exec.ts o package-json.ts empiezan a interpolar input de usuario |
| El callback .action() concentra demasiadas responsabilidades (borde de ADR-0010) | Auto-clasificado info; NO viola el umbral, ni dispara la señal warn; premisa numérica débil | 2026-06-03T13:50:00-04:00 | re-validar si crece index.ts o cambia knowledge/adr/0010-*.md |
| La selección del prompt se castea a string[] sin validar | Cast real (index.ts:96) y response.tools es any por @types/prompts, pero no genera daño en este flujo (mismo razonamiento que ADR-0011 sobre fronteras) | 2026-06-03T13:50:00-04:00 | re-validar si cambia index.ts:96 o el manejo del response del prompt |
| El manifest se castea a { version: string } sin validar | Cierto a nivel sintáctico pero la atribución de riesgo no aplica: el manifest es artefacto interno controlado, no frontera no confiable | 2026-06-03T13:50:00-04:00 | re-validar si el manifest pasa a leerse de fuente externa |
| El orquestador index.ts no tiene NINGÚN test | Hecho crudo cierto (no hay index.test.ts) pero descartado como hallazgo en esta corrida; es deuda de cobertura, no defecto de comportamiento | 2026-06-03T13:50:00-04:00 | re-validar si se agrega/quita cobertura sobre index.ts |
| package-json.ts: addDevDependency y getInstallCmd sin test | Descripción correcta pero es falta de test, no fix; getInstallCmd ya está confirmado como lógicamente correcto (ver invariantes) | 2026-06-03T13:50:00-04:00 | re-validar si cambia packages/cli/src/utils/package-json.ts |

## Edge cases descubiertos

- **package.json JSON-válido-pero-no-objeto** (`[]`, `""`, `null`, `42`): pasa `JSON.parse` + cast, `detectStack` devuelve framework `'unknown'` silenciosamente en vez de detectar corrupción. El try/catch solo cubre JSON inválido o archivo ausente, no tipo equivocado.
- **package.json existente pero malformado** (SyntaxError) o sin permisos (EACCES): el `catch` sin binding reporta "Could not read package.json... run from a project root", diagnóstico falso — el archivo SÍ existe.
- **Entorno no-TTY / CI sin `--yes`**: el prompt resuelve sin `tools`, sale con `exit(0)` habiendo instalado CERO herramientas. El pipeline lee éxito. Indistinguible de cancelación deliberada con Ctrl+C.
- **`--preset` con valor inválido**: no valida el enum, cae al prompt; en no-TTY termina exit(0) como falso éxito.
- **Config preexistente con guard**: el config se respeta (skip) pero las dependencias YA se instalaron antes del guard → árbol modificado + commit sucio pese al mensaje "skipped / left untouched".
- **tsconfig Next con UN solo archivo preexistente** (tsconfig.json XOR tsconfig.typecheck.json): estado parcial, uno se omite y otro se escribe, pero siempre imprime success de "next.json + typecheck variant". Pérdida silenciosa de config (daño directo según ADR-0012).
