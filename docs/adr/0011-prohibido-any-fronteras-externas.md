# ADR-0011: Prohibido `any` en fronteras externas (DB/API)

- **Estado**: Propuesto
- **Fecha**: 2026-06-02
- **Decisor**: edaza
- **Aplica a**: `@devground/eslint-config` y todos los proyectos que tocan DB/API externas (Supabase, ORMs, clientes HTTP)

## Contexto

La auditoría de 6 proyectos encontró el patrón `as any` repetido justo en la **frontera más peligrosa**: el límite con la base de datos. El caso recurrente fue el cliente de Supabase:

```ts
// ANTIPATRÓN — castear la frontera a any
const { data } = await (supabase as any).from('leads').select('*');
//                      ^^^^^^^^^^^^^^^ se pierde todo el tipado de la tabla
```

El `as any` (o `as unknown as Foo`) en la frontera con DB/API **destruye precisamente la garantía que más vale**: que el shape de los datos que entran al sistema coincide con lo que el código asume. A partir de ese cast, TODO lo que se deriva de `data` es `any`, y el compilador deja de ayudar. Bugs de columna renombrada, campo nullable no contemplado o tipo cambiado pasan silenciosos hasta runtime/producción.

Lo doloroso es que la solución existe y es barata: **generar los tipos desde la fuente**. Supabase, Prisma, OpenAPI, GraphQL — todos pueden emitir tipos. Castear a `any` es elegir trabajo manual frágil sobre tipos generados correctos.

## Decisión

### Generar tipos en la frontera, no castear

En el límite con DB/API, los tipos se **generan desde la fuente de verdad** en vez de castearse:

```bash
# Supabase: genera tipos de las tablas/vistas/funciones
supabase gen types typescript --project-id "$PROJECT_ID" > src/types/database.types.ts
```

```ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// El cliente queda tipado de punta a punta. `data` conoce el shape de la tabla.
const supabase = createClient<Database>(url, key);
const { data } = await supabase.from('leads').select('*'); // data: Lead[] | null
```

Análogo para otras fronteras: Prisma (`prisma generate`), OpenAPI (`openapi-typescript`), GraphQL (`graphql-codegen`).

### Enforcement automático (ESLint)

`@devground/eslint-config` activa explícitamente `@typescript-eslint/no-explicit-any` en sus presets. En el preset base (sin type-checking de proyecto) se documenta como **`warn`**; el preset Next.js, que ya extiende `eslint-config-next/typescript`, lo trae como parte de las reglas de TypeScript.

### Escape justificado

`any` no se prohíbe en términos absolutos — hay casos límite reales (una librería sin tipos, un genérico imposible de expresar). Cuando sea inevitable, el escape es **explícito y justificado**:

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- la lib `foo` no exporta tipos; issue #123
const client = thirdParty as any;
```

Reglas del escape:
- Siempre `eslint-disable-next-line` (puntual), nunca desactivar la regla a nivel de archivo o config.
- Siempre con comentario `-- <razón>` explicando por qué es inevitable.
- En la frontera DB/API **no** se acepta el escape: ahí siempre hay tipos generados.

## Consecuencias

**Positivas**
- El compilador recupera la garantía de shape en la frontera más crítica.
- Tipos generados se mantienen sincronizados con el esquema real (re-generar es un comando).
- Bugs de columna/tipo se atrapan en compile-time, no en producción.
- El escape justificado deja rastro auditable (grep de `eslint-disable.*no-explicit-any`).

**Negativas / Trade-offs**
- Hay que ejecutar (e idealmente automatizar en CI) la generación de tipos cuando cambia el esquema. Mitigación: script `gen:types` + recordatorio en CI.
- El archivo de tipos generado es grande y se versiona; genera diffs al cambiar el esquema (es información, no ruido).
- `no-explicit-any` puede chocar con código legacy migrado → resolver con escapes justificados durante la migración, no relajando la regla.

## Alternativas consideradas

1. **`as unknown as Foo`**: a veces presentado como "más seguro" que `as any`. Descartado en la frontera DB/API: sigue siendo un cast manual no verificado, solo que más verboso. El tipo generado es la respuesta correcta.
2. **Desactivar `no-explicit-any` globalmente**: descartado — es renunciar al beneficio. El escape puntual justificado cubre los casos legítimos sin abrir la puerta.
3. **`no-explicit-any` como `error` en el preset base**: razonable, pero se deja `warn` en base para no romper consumidores existentes de golpe; los proyectos pueden subirlo a `error`. El preset Next.js ya lo trae vía `eslint-config-next/typescript`.

## Referencias

- Punto ciego de origen: auditoría de 6 proyectos — `supabase as any` repetido en la frontera con la DB.
- Enforcement: `packages/eslint-config/index.mjs` (`@typescript-eslint/no-explicit-any`), heredado en `next.mjs` vía `eslint-config-next/typescript`.
- `supabase gen types`: https://supabase.com/docs/guides/api/rest/generating-types
- Regla: https://typescript-eslint.io/rules/no-explicit-any/
- Construye sobre [ADR-0004 — TypeScript strict](0004-typescript-strict.md) y [ADR-0003 — ESLint Flat Config](0003-eslint-flat-config.md).
