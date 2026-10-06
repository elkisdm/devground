# ADR-0041: Desplegar un servicio solo cuando cambia lo que entra a su build

- **Estado**: Aceptado
- **Fecha**: 2026-10-06
- **Decisor**: edaza
- **Aplica a**: todo proyecto con despliegue automático desde git (Railway, Netlify, Vercel, GitHub Actions), en especial monorepos con varios servicios

## Contexto

Las plataformas que despliegan desde git reconstruyen el servicio con **cada** commit a la rama
de producción, salvo que se les diga qué rutas importan. En Atlas (6-oct-2026) un commit que solo
tocaba documentación reconstruía y **reiniciaba la API de producción** y el sitio web:

- El servicio de la API en Railway tenía `watchPatterns` vacío.
- El sitio en Netlify no tenía comando `ignore`.
- En cambio, los servicios de la réplica de staging sí filtraban por rutas, configuradas a mano en la
  UI de cada servicio, y saltaron el mismo commit (SKIPPED).

Cada redeploy innecesario cuesta un reinicio en producción (conexiones cortadas, workers en
proceso reiniciados, ventana de errores mientras el healthcheck no pasa), minutos de build y ruido
al rastrear qué deploy introdujo un problema. En un monorepo el efecto se multiplica: un cambio en
`apps/web` redespliega también la API, y viceversa.

## Decisión

**Todo servicio con despliegue automático declara, versionado en el repo, el filtro de rutas que
dispara su build. Ese filtro se deriva de lo que el build realmente consume.**

### 1. Derivar las rutas del build, no adivinarlas

- **Imagen Docker:** cada `COPY` del Dockerfile, más el propio Dockerfile.
- **App JS de un workspace:** la carpeta de la app, los paquetes del workspace que importa, el
  lockfile (`pnpm-lock.yaml`), el `package.json` raíz y el manifiesto del workspace.
- **Siempre:** el archivo de configuración del deploy (`railway.toml`, `netlify.toml`,
  `vercel.json`), para que un cambio en él se aplique.
- **Nunca:** `docs/`, `*.md` de la raíz, `CHANGELOG.md`, ADRs, specs ni tests de otros servicios.

### 2. Dónde se declara, por plataforma

| Plataforma     | Mecanismo                                                       | Ejemplo                                                                                                                     |
| -------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Railway        | `watchPatterns` en `railway.toml` (o `railway.ts`), por entorno | `watchPatterns = ["apps/api/**", "contracts/**", "infra/docker/api.Dockerfile", "railway.toml"]`                            |
| Netlify        | `[build] ignore` en `netlify.toml`                              | `ignore = "git diff --quiet $CACHED_COMMIT_REF $COMMIT_REF -- apps/web contracts package.json pnpm-lock.yaml netlify.toml"` |
| Vercel         | `ignoreCommand` en `vercel.json`                                | `"ignoreCommand": "git diff --quiet HEAD^ HEAD -- apps/web package.json pnpm-lock.yaml vercel.json"`                        |
| GitHub Actions | `on.push.paths` del workflow de deploy                          | `paths: ["apps/api/**", "Dockerfile", ".github/workflows/deploy-api.yml"]`                                                  |

En Netlify y Vercel, `git diff --quiet` sale con **0 cuando no hay cambios → la plataforma salta
el build**, y con 1 cuando sí hay cambios → construye.

Se declara en el archivo del repo y **no en la UI** de la plataforma: así es revisable en un PR,
viaja con la rama y no se pierde al recrear el servicio.

### 3. Verificar en los dos sentidos antes de mergear

1. Probar el comando o los patrones contra commits reales de la rama principal: uno solo de docs
   debe saltarse y uno que toca el servicio debe construir. Para los comandos `git diff --quiet`,
   basta correrlos en local sobre esos commits.
2. Después del merge, el primer commit de solo docs debe aparecer como SKIPPED (Railway) o
   "Canceled / ignored" (Netlify, Vercel).
   En Netlify, `$CACHED_COMMIT_REF` es el commit del último deploy **terminado**. Si el commit de
   prueba empieza a construirse antes de que termine el deploy del cambio de filtro, compara
   contra un commit anterior, ve el propio `netlify.toml` modificado y construye igual. No es una
   falla del filtro: la prueba válida es el siguiente commit de docs, con el deploy anterior ya
   publicado. Pasó en Atlas el 6-oct-2026.

### Fuera de alcance

- Servicios que se despliegan a mano (`railway up`, scripts de deploy): no tienen disparador.
- Redeploys sin cambio de código (rotar una variable, forzar un rebuild): se hacen desde la
  plataforma (Redeploy, "Clear cache and deploy").

## Consecuencias

**Positivas**

- Un commit de documentación deja de reiniciar producción.
- En un monorepo, cada servicio se despliega solo cuando cambia lo suyo: menos builds, menos
  reinicios y un historial de deploys que apunta al cambio real.
- El filtro queda en git, revisable y portable entre entornos.

**Negativas / Trade-offs**

- **Riesgo principal: una ruta faltante hace que un cambio real no se despliegue en silencio.**
  Mitigación: derivar las rutas del Dockerfile y de las dependencias del workspace (punto 1). Al
  agregar un `COPY` o un paquete nuevo del workspace, actualizar el filtro en el mismo PR. Y
  verificar en los dos sentidos (punto 3).
- Un archivo leído en runtime fuera de las rutas del build (por ejemplo, un volumen o un bucket) no
  se ve afectado: el filtro solo gobierna el build.
- Railway marcó `railway.toml` como obsoleto a partir del 2026-12-01. Al migrar a
  `.railway/railway.ts`, se trasladan los `watchPatterns`.

## Alternativas consideradas

1. **Configurar el filtro en la UI de cada plataforma**: funciona, pero no se revisa en PRs, no viaja
   con la rama y se pierde al recrear el servicio. Es como estaba la réplica de Atlas; sirve, pero
   no como estándar.
2. **Excluir solo `docs/**`y`\*.md`\*\* (lista negra): es más simple, pero cualquier carpeta nueva que
   no sea código (scripts, research, datos) vuelve a disparar deploys. La lista blanca derivada del
   build es precisa por construcción.
3. **No filtrar y aceptar el redeploy**: es el estado previo, y su costo es un reinicio de
   producción por cada commit.

## Referencias

- Caso de origen: Atlas, PR giovannimarisio/Atlas#418 (`railway.toml` + `netlify.toml`).
- [ADR-0008](0008-higiene-de-secretos.md): mismo principio de mover el control al repo en vez de
  depender de la memoria del equipo.
- Railway: Watch Paths (config as code). Netlify: Ignore builds. Vercel: Ignored Build Step.
