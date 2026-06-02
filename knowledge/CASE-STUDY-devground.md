# Caso de Estudio — Aplicando BEST-PRACTICES al propio devground

Ejercicio de validación: recorrer el checklist de 6 pasos de [BEST-PRACTICES.md](BEST-PRACTICES.md) sobre el repo `devground-1` y documentar **qué aplica, qué no, y por qué**.

El objetivo no es forzar el conocimiento a encajar — es **probar la guía** detectando dónde ayuda y dónde sobra.

---

## Contexto del repo

`devground-1` es un monorepo pnpm de **9 paquetes npm de tooling**:
- 7 configuraciones compartidas (ESLint, Prettier, TypeScript, commitlint, lint-staged, husky, AGENTS.md).
- 1 paquete meta `@devground/devground` que las orquesta.
- 1 CLI `devground-init` para scaffolding interactivo.

**No es** una app web, no tiene BD, no tiene tráfico de usuarios, no escala. Es **una herramienta consumida vía `npx` o `pnpm install`** una vez por proyecto.

---

## Paso 1 — Mapear dominios

| Dominio identificado | Existe en el repo |
|---|---|
| Configuración estática (presets) | Sí: 7 paquetes de configs |
| Orquestación / scaffolding interactivo | Sí: `devground-init` CLI |
| Distribución (publish a npm) | Sí: Changesets workflow |
| Documentación (README, AGENTS.md) | Sí, transversal |

**No aplica del checklist genérico**:
- Catálogo de productos, pagos, usuarios, sesiones → no hay dominio de negocio.
- Eventos / tracking / telemetría → el CLI no tiene analytics.
- Autenticación / autorización → no hay usuarios.

**Conclusión**: el "mapeo de dominios" se reduce a 4 áreas técnicas, no a bounded contexts de negocio. La guía aplica en versión simplificada.

---

## Paso 2 — Identificar patrones de acceso

| Subsistema | Lectura/Escritura | Volumen | Latencia crítica |
|---|---|---|---|
| Configs estáticas | Read-only para consumidores | Bajo (1 lectura en cada `tsc`/`eslint` run) | No |
| CLI interactivo | Escritura una vez (instalación) | Muy bajo (1 ejecución por proyecto) | No |
| npm registry | Lectura externa | Bajo en publish, alto agregado en install | Externa, fuera de nuestro control |

**Patrón dominante**: **tráfico esporádico, sin estado, sin concurrencia**.

Implicación derivada de [ADR-0007](adr/0007-serverless-vs-servidor-dedicado.md): si devground fuera un servicio web, este patrón justificaría **serverless** o **distribución como CLI**. La decisión de **distribuir como paquetes npm** (no como SaaS) es exactamente coherente con el patrón.

---

## Paso 3 — Elegir arquitectura

Aplico el [algoritmo de decisión](02-architectural-patterns.md#algoritmo-de-decisi%C3%B3n):

1. ¿Transacciones fuertes frecuentes entre dominios? → **NO** (configs independientes).
2. ¿Requisitos claros, vida >2 años? → **SÍ**. Pero el "dominio" es configuración estática, no lógica de negocio compleja → **Clean/Hexagonal sería sobre-ingeniería**.
3. ¿Algún módulo con 10x tráfico? → **NO**.
4. ¿Tráfico en picos? → **N/A, no es un servicio**.
5. ¿Eventos asíncronos masivos? → **NO**.

**Arquitectura efectiva del repo**: **monorepo modular**, sin capas internas profundas en cada paquete (cada uno es esencialmente un único archivo de configuración).

Aplicar Clean/Hexagonal a un paquete de 50 líneas de config sería ridículo. Ver [ADR-0005 en knowledge](adr/0005-cuando-aplicar-clean-hexagonal.md): la condición "dominio comprendido + vida >2 años" se cumple, pero la condición tácita "lógica de negocio real que aislar" **no se cumple**. Decisión correcta: **no aplicar**.

---

## Paso 4 — Elegir BDs por dominio

**No aplica**. No hay base de datos. El "estado persistente" del proyecto vive en:
- `package.json` (versiones, dependencias).
- `pnpm-lock.yaml` (lockfile).
- Archivos generados por Changesets en `.changeset/`.

Todos son archivos de texto versionados en git. El propio git es la "BD" del proyecto.

**Lección**: la guía genérica asume que todo proyecto tiene BD. Para tooling, la sección se salta limpiamente. Esto es un **hallazgo útil**: la guía debería tener una frase explícita "si tu proyecto no es una app con datos persistentes externos, salta este paso".

---

## Paso 5 — Resiliencia y escalado

| Estrategia genérica | Aplica a devground |
|---|---|
| CDN | No (npm registry ya cumple esta función) |
| Caché (Redis) | No |
| Read replicas | No |
| Message queue | No |
| **Timeouts en llamadas externas** | **SÍ** — el CLI hace `pnpm add` que llama al registry; un timeout razonable evita colgarse en redes lentas |
| **Circuit breakers** | No es necesario en CLI puntual (el usuario reintenta manualmente) |

**Hallazgo**: solo 1 de las 6 estrategias aplica. Y es una aplicación parcial (timeout en `pnpm add` del CLI). La guía es claramente diseñada para servicios long-running, no para herramientas puntuales.

---

## Paso 6 — Documentar decisiones

**Sí aplica, y se ejecutó como parte de este ejercicio**: ver [docs/adr/](../docs/adr/) — los **12 ADRs** propios del repo. Los primeros 5 documentan el tooling base (pnpm, Changesets, ESLint Flat Config, TypeScript strict y Husky); el 0006 cubre `dev-metrics`; y los 6 ADRs de seguridad/calidad 0007-0012 fijan estándares con enforcement: rate-limiting distribuido (0007), higiene de secretos (0008), validación de entrada + firma de webhooks (0009), límite de tamaño de módulo/función (0010), prohibición de `any` en fronteras externas (0011) y tests obligatorios en rutas críticas (0012).

Esta es la sección de la guía que más valor aporta a un proyecto de tooling. Las decisiones técnicas (qué bundler, qué versionado, qué linter) son **exactamente** las que se olvidan o se cuestionan 6 meses después. El propio ejercicio creció de 5 a 12 ADRs precisamente por esto: documentar primero hizo barato añadir estándares de seguridad y calidad después.

---

## Síntesis del ejercicio

| Sección de BEST-PRACTICES | Aplicabilidad a devground |
|---|---|
| Paso 1 — Mapear dominios | **Parcial** (simplificado a 4 áreas técnicas) |
| Paso 2 — Patrones de acceso | **Sí** (informa la decisión de "CLI npm vs SaaS") |
| Paso 3 — Arquitectura | **Sí** (el algoritmo correctamente predice "no apliques Clean") |
| Paso 4 — BDs | **No aplica** (no hay datos persistentes externos) |
| Paso 5 — Resiliencia | **Casi nada** (1 de 6 estrategias) |
| Paso 6 — Documentar | **Sí, alto valor** (motivó los 12 ADRs propios) |

**Conclusión**: la guía cumple con **3 de 6 pasos** en proyectos de tooling. No es un fracaso — es coherente con el principio rector: *"no existe arquitectura mejor en abstracto, depende del contexto"*. La guía está optimizada para apps con dominio de negocio, BD y tráfico de usuarios. Para herramientas, hay que ejercer juicio.

---

## Mejoras propuestas a la guía

Derivadas de este ejercicio:

1. **Añadir nota en BEST-PRACTICES.md Paso 4**: "Si tu proyecto no tiene datos persistentes externos (CLIs, librerías, configs), salta este paso."
2. **Añadir sección "Pequeña gramática de excepción"**: tabla rápida de qué pasos aplican según tipo de proyecto (app web, CLI, librería, servicio batch, etc.).
3. **Reforzar Paso 6** como universalmente valioso — incluso un proyecto trivial se beneficia de un puñado de ADRs.

Estas mejoras pueden quedarse como **TODO** o entrar en una próxima iteración de la guía. No las aplico ahora para no inflar scope.

---

## Veredicto

La guía **pasa el test ácido** con honestidad: aplica donde tiene sentido, no aplica donde no, y produjo valor concreto (12 ADRs reales en `docs/adr/`). El ejercicio también reveló mejoras menores, lo cual es exactamente el feedback que se buscaba.
