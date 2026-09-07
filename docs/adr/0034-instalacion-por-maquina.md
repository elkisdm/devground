# ADR-0034: Instalar el estándar una vez por máquina, no una vez por proyecto

- **Estado**: Aceptado
- **Fecha**: 2026-09-07
- **Decisor**: edaza
- **Aplica a**: `packages/cli/` (subcomando `machine`), configuración global de git de la máquina

## Contexto

[ADR-0033](0033-salida-de-consolidacion.md) documenta la brecha medida: la capa de paquetes npm
llegó a 12 de 42 repos y a **ninguno** de los 8 donde ocurre el gasto real. La causa no es
desidia: el modelo de instalación es **por proyecto**, y adoptar el estándar en un repo existente
exige tocar `package.json`, lockfile y CI. En un repo grande y vivo, eso compite con el trabajo
real y pierde siempre. Resultado: 7 de los 8 repos más caros no tienen ningún gate de commits, y
ninguno tiene commitlint.

Git ofrece un mecanismo que cubre repos existentes sin tocarlos: `core.hooksPath` global. Antes de
diseñar sobre él, se verificó empíricamente cada supuesto (2026-09-07, sandbox con repos reales):

| Supuesto | Resultado |
| --- | --- |
| `core.hooksPath` global aplica a un repo sin configuración local | ✅ el hook global corrió |
| La configuración local gana sobre la global | ✅ el repo con `.husky` corrió el suyo e ignoró el global |
| Prettier resuelve config desde un directorio ancestro | ✅ encontró `../.prettierrc` |
| ESLint (flat config) resuelve config desde un ancestro | ✅ encontró `../eslint.config.js` |
| `core.hooksPath` global ya ocupado en esta máquina | libre |

La verificación destapó además un riesgo que habría sido invisible hasta romper algo: **fijar
`core.hooksPath` hace que git deje de leer `.git/hooks/` por completo.** En esta máquina hay **13
repos con un `post-commit` propio** (la automatización de changelog). Una instalación ingenua los
habría dejado sin correr, sin un solo mensaje de error.

## Decisión

Agregar `devground-init machine`: instala **una vez** un conjunto de **despachadores** de hooks en
`~/.config/devground/hooks` (respetando `XDG_CONFIG_HOME`) y apunta ahí el `core.hooksPath` global.

**1. Es un despachador, no un hook que se impone.** Actúa solo si el repo optó:

| Regla | Efecto |
| --- | --- |
| `.devground-ignore` en la raíz | NO actúa (opt-out explícito, gana siempre) |
| `.devground` en la raíz | actúa (opt-in explícito, sirve fuera de las raíces) |
| El repo cuelga de una raíz configurada (`~/Developer` por defecto) | actúa |
| Cualquier otro caso | NO actúa |

El último caso es el que protege los repos de terceros que se clonen: se instala una vez, pero no
toca nada que no se haya declarado propio.

**2. Encadena siempre al hook local del repo**, antes de lo suyo. Se instalan despachadores incluso
para eventos donde devground no agrega nada (`post-commit`, `pre-push`, `prepare-commit-msg`,
`post-merge`, `post-checkout`, `post-rewrite`), con el único fin de que lo que ya vivía en
`.git/hooks/` siga corriendo. El hook local manda: si falla, el commit falla.

**3. Impone solo lo que no depende del ecosistema del repo.** Esta es la restricción de diseño
central:

- **`commit-msg`**: si el repo tiene commitlint, manda su configuración. Si no lo tiene —repo
  Python, Go, o JS sin la dependencia— valida Conventional Commits con una implementación en shell
  puro. **Es la razón de ser del hook**: los repos que más lo necesitan son justamente los que no
  pueden instalar commitlint.
- **`pre-commit`**: escaneo de secretos con gitleaks (ADR-0008), que sirve igual en cualquier
  lenguaje; después **delega en las herramientas del proyecto** — `lint-staged` si existe,
  `pre-commit` si hay un `.pre-commit-config.yaml` (el patrón de atlas). Siempre con
  `npx --no-install`: un hook de máquina que resuelve su propia versión de un linter formatea
  distinto que el CI del proyecto, y esa discrepancia es peor que no correr el linter.

**4. Lo que NO se globaliza, explícitamente**: dependencias de proyecto, `tsconfig` y la
configuración de tests. La instalación por máquina cubre **secretos, formato/lint delegado y
mensajes de commit**, no type-check ni tests. La cascada de configs por directorio ancestro de
ESLint y Prettier queda **verificada y documentada** pero fuera del instalador: escribir un
`eslint.config.js` en `~/Developer` afectaría repos de forma no obvia, y el opt-in por repo es
preferible.

**5. Se niega a pisar un `core.hooksPath` ajeno.** Si otra herramienta ya lo reclamó, el
instalador aborta y explica las dos salidas, en vez de romperla en silencio.

**Rollback**: `git config --global --unset core.hooksPath`. Una línea, sin residuos: los
despachadores quedan en disco, inertes.

## Consecuencias

**Positivas**

- Cubre repos **existentes y futuros** sin tocar su `package.json`, su lockfile ni su CI — que es
  exactamente lo que bloqueaba la adopción.
- Lleva validación de Conventional Commits a repos donde commitlint no es instalable (Python, Go),
  cerrando la brecha medida en los 8 repos más caros.
- No rompe nada existente: los repos con husky conservan su hook (la config local gana) y los hooks
  propios siguen corriendo (el despachador encadena). Ambas cosas están cubiertas por tests de
  integración que corren git de verdad.

**Negativas / Trade-offs**

- Toca configuración **global** de la máquina: el blast radius más grande de cualquier cosa que
  devground haya hecho. Se mitiga con opt-in por repo, encadenado, negativa a pisar un hooksPath
  ajeno y rollback de una línea.
- La lógica de opt-in vive **duplicada** (TypeScript para razonar y testear, shell para ejecutar).
  Si una cambia sin la otra, divergen. Se mitiga con tests de integración que ejecutan el shell
  real, no la réplica.
- Un hook global se olvida: alguien puede pasar meses sin recordar por qué un commit se rechaza en
  un repo que "no tiene nada instalado". Los mensajes de error nombran el archivo y dicen cómo
  excluir el repo.
- No cubre entornos con PATH mínimo (algunos clientes gráficos de git): ahí `npx` o `gitleaks`
  pueden no resolverse. La degradación es explícita y deja pasar, igual que los hooks por proyecto.

## Alternativas consideradas

1. **Retrofitear los 8 repos caros uno por uno**: descartado — es el trabajo que ya perdió contra
   el trabajo real durante cinco meses.
2. **Un hook global sin opt-in, para todos los repos de la máquina**: descartado por el autor —
   molestaría en cada repo de terceros que se clone.
3. **Escribir configs de ESLint/Prettier en `~/Developer` para aprovechar la cascada**: verificado
   que funciona, pero descartado de momento: afecta repos de forma no obvia y sin rastro en el
   propio repo.
4. **Instalar los binarios (eslint, prettier, commitlint) globalmente y usarlos desde el hook**:
   descartado — la versión global divergiría de la del CI de cada proyecto, y un gate que dice algo
   distinto que CI es peor que no tener gate.
