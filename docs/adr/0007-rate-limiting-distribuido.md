# ADR-0007: Rate-limiting distribuido obligatorio

- **Estado**: Propuesto
- **Fecha**: 2026-06-02
- **Decisor**: edaza
- **Aplica a**: cualquier proyecto del repo que exponga rutas API o webhooks en entornos serverless (Vercel, Netlify Functions, Cloudflare Workers, Lambda)

## Contexto

Una auditoría de 6 proyectos detectó un punto ciego **recurrente (visto en 3 proyectos)**: el rate-limiting se implementaba con un `Map` o un contador en memoria del proceso, del tipo:

```ts
// ANTIPATRÓN — control de seguridad ilusorio en serverless
const hits = new Map<string, number>();

export function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'anon';
  const count = (hits.get(ip) ?? 0) + 1;
  hits.set(ip, count);
  if (count > 10) return new Response('Too many requests', { status: 429 });
  // ...
}
```

En un servidor monolítico de larga vida (un solo proceso Node) esto *parece* funcionar. Pero en **entornos serverless el modelo de ejecución es otro**: la plataforma crea múltiples instancias concurrentes y las recicla con frecuencia. Cada instancia tiene **su propio heap**, así que:

- El `Map` no se comparte entre instancias → con N instancias activas el límite real es `N × 10`, no `10`.
- En cold start el `Map` arranca vacío → el contador se resetea de forma impredecible.
- Un atacante con suficiente concurrencia satura el endpoint porque sus requests caen en instancias distintas, cada una con su propio contador en cero.

El resultado: el límite es **ilusorio**. Da una falsa sensación de seguridad (brute-force de login, abuso de endpoints de costo, scraping) sin protección real.

## Decisión

**Prohibido** usar un `Map` / contador en memoria de proceso como mecanismo de rate-limiting (u otro control de seguridad que dependa de estado compartido) en cualquier ruta desplegada en entorno serverless.

El rate-limiting **debe** apoyarse en un **store compartido** entre instancias. Opciones aceptadas, en orden de preferencia:

1. **Upstash Redis** (`@upstash/ratelimit` + `@upstash/redis`): serverless-native, HTTP-based, sin conexiones persistentes. Patrón de referencia:

   ```ts
   import { Ratelimit } from '@upstash/ratelimit';
   import { Redis } from '@upstash/redis';

   const ratelimit = new Ratelimit({
     redis: Redis.fromEnv(),
     limiter: Ratelimit.slidingWindow(10, '60 s'),
     analytics: true,
   });

   export async function POST(req: Request) {
     const ip = req.headers.get('x-forwarded-for') ?? 'anon';
     const { success, limit, remaining, reset } = await ratelimit.limit(ip);
     if (!success) {
       return new Response('Too many requests', {
         status: 429,
         headers: {
           'RateLimit-Limit': String(limit),
           'RateLimit-Remaining': String(remaining),
           'RateLimit-Reset': String(reset),
         },
       });
     }
     // ...
   }
   ```

2. **Redis gestionado** (cualquier proveedor) con un algoritmo de ventana (fixed/sliding window) o token bucket implementado de forma atómica (Lua script / `INCR` + `EXPIRE`).

3. **Tabla en la base de datos** con columna `expires_at`, cuando ya existe una DB y no se quiere añadir infra. El conteo debe hacerse con una operación atómica (`INSERT ... ON CONFLICT` / `UPSERT` transaccional) y limpiarse por `expires_at`. Es la opción más lenta pero válida si el volumen es bajo.

Cualquier store elegido debe ser **atómico** (la lectura+incremento no puede tener carrera entre instancias) y **con expiración** (TTL), para no acumular estado indefinidamente.

## Consecuencias

**Positivas**
- El límite es real: todas las instancias comparten el mismo contador.
- Resiste cold starts y autoscaling.
- Upstash y similares exponen métricas, lo que da observabilidad del abuso.
- Patrón explícito y copiable → menos probabilidad de reintroducir el antipatrón.

**Negativas / Trade-offs**
- Añade una dependencia de infraestructura (Redis/Upstash) y variables de entorno.
- Cada request paga una latencia de red extra (mitigable: Upstash es HTTP de baja latencia y soporta caché local de *no contar dos veces*).
- La opción de tabla en DB añade carga de escritura; hay que dimensionar y limpiar.
- Costo monetario (aunque Upstash tiene tier gratuito generoso para la mayoría de proyectos pequeños).

## Alternativas consideradas

1. **Rate-limit en el edge / WAF de la plataforma** (Vercel Firewall, Cloudflare Rate Limiting): válido y complementario. No lo hacemos obligatorio porque no todos los proyectos lo tienen disponible o configurado, y el control a nivel de aplicación permite reglas por usuario/ruta más finas. Recomendado **además** del store compartido cuando esté disponible.
2. **Map en memoria "para casos simples"**: descartado. Es justo el antipatrón que origina este ADR; no hay umbral de "suficientemente simple" donde un control de seguridad ilusorio sea aceptable.
3. **Sin rate-limiting**: descartado para rutas sensibles (login, endpoints de costo, formularios públicos).

## Referencias

- Punto ciego de origen: auditoría de 6 proyectos — `Map` en memoria como rate-limit en 3 de ellos.
- Upstash Ratelimit: https://github.com/upstash/ratelimit
- Modelo de ejecución serverless (instancias efímeras, sin estado compartido): documentación de Vercel Functions / AWS Lambda.
- Relacionado: [ADR-0009 — validación de entrada y firma de webhooks](0009-validacion-entrada-webhooks.md).
