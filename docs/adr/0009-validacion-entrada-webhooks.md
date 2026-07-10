# ADR-0009: Validación de entrada en toda ruta API + firma en webhooks

- **Estado**: Propuesto
- **Fecha**: 2026-06-02
- **Decisor**: edaza
- **Aplica a**: cualquier proyecto del repo con rutas API (Next.js Route Handlers, serverless functions) y receptores de webhooks

## Contexto

La auditoría de 6 proyectos encontró dos clases de ruta insegura:

1. **Rutas API que confían en el payload sin validarlo.** Se hace `const body = await req.json()` y se accede a `body.email`, `body.amount`, etc. directamente. Si el cliente manda campos faltantes, tipos incorrectos o datos maliciosos, el código revienta en runtime o —peor— procesa basura (un `amount` negativo, un `email` que es un objeto). No hay un límite explícito y tipado entre "entrada no confiable" y "lógica de negocio".

2. **Webhooks sin verificación de firma, o verificada solo en algunos métodos.** El caso concreto: un webhook verificaba la firma HMAC en `POST` pero exponía un `GET` (para "health check" / verificación de suscripción) **sin firma**, dejando una puerta abierta. Un atacante podía invocar el `GET` para disparar lógica o filtrar información. La verificación de firma debe cubrir **todos** los métodos que ejecuten lógica, no solo el "principal".

El patrón común: la validación es **ad-hoc y opcional**, así que se omite bajo presión. Necesitamos un **punto único obligatorio** que haga imposible escribir una ruta sin validar.

## Decisión

### Validación de payload con un wrapper único

Toda ruta API valida su entrada con un **schema (Zod)** a través de un wrapper compartido `withValidation`. La ruta nunca toca el body crudo:

```ts
import { z } from 'zod';

type Handler<T> = (data: T, req: Request) => Promise<Response> | Response;

export function withValidation<T>(schema: z.ZodType<T>, handler: Handler<T>) {
  return async (req: Request): Promise<Response> => {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return Response.json(
        { error: 'Validation failed', issues: parsed.error.flatten() },
        { status: 422 },
      );
    }
    return handler(parsed.data, req);
  };
}
```

Uso:

```ts
const CreateLead = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  source: z.enum(['form', 'import']),
});

export const POST = withValidation(CreateLead, async (lead) => {
  // `lead` está tipado y validado. La lógica jamás ve datos sin verificar.
  await saveLead(lead);
  return Response.json({ ok: true }, { status: 201 });
});
```

El handler recibe datos **ya tipados y validados**. El status `422` (Unprocessable Entity) distingue "payload mal formado" de otros 400.

### Verificación de firma en webhooks — todos los métodos

Todo receptor de webhook verifica la firma con **HMAC comparado en tiempo constante** (`crypto.timingSafeEqual`), y la verificación se aplica a **todos los métodos HTTP expuestos** que ejecuten lógica (incluidos `GET` de verificación/health):

```ts
import crypto from 'node:crypto';

export function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  // timingSafeEqual exige longitudes iguales: chequear antes evita el throw y la fuga por timing.
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
```

Reglas:
- Usar **`timingSafeEqual`**, nunca `===` (la comparación naïve filtra el secreto por timing de bytes).
- Verificar sobre el **cuerpo crudo** (raw body), no sobre el JSON re-serializado (el orden de claves cambiaría el HMAC).
- **Ningún método sin firma**: si un `GET` de verificación existe, también valida firma (o un token equivalente). No hay "métodos de confianza".

## Consecuencias

**Positivas**
- Frontera única y obligatoria entre entrada no confiable y lógica de negocio.
- Tipos derivados del schema (`z.infer`) → un solo lugar define forma + validación + tipo.
- Respuestas de error consistentes (`422` con `issues`) en todo el proyecto.
- Webhooks resistentes a spoofing y a ataques de timing; cierre del agujero del `GET` sin firma.

**Negativas / Trade-offs**
- Cada ruta paga el costo de definir un schema (es deliberado: ese costo es la documentación de la entrada).
- Zod añade peso al bundle (aceptable; es el estándar de facto y tree-shakeable).
- El wrapper asume body JSON; rutas con `multipart`/streams necesitan una variante (`withValidationForm`, etc.) — documentar cuando aparezca.

## Alternativas consideradas

1. **Validación manual con `if`s**: descartado — es justo lo ad-hoc que la auditoría encontró omitido bajo presión.
2. **Otra librería (Yup, Valibot, io-ts)**: Valibot es más liviano y es candidato futuro; Zod gana hoy por adopción, DX y ecosistema. Re-evaluable.
3. **Verificar firma solo en el método "principal"**: descartado — es exactamente el bug del `GET` sin firma que origina este ADR.
4. **Comparar firmas con `===`**: descartado — vulnerable a timing attacks. `timingSafeEqual` es obligatorio.

## Referencias

- Punto ciego de origen: auditoría de 6 proyectos — rutas sin validación de payload + webhook con `GET` sin firma.
- Zod: https://zod.dev
- Node `crypto.timingSafeEqual`: https://nodejs.org/api/crypto.html
- Relacionado: [ADR-0007 — rate-limiting distribuido](0007-rate-limiting-distribuido.md), [ADR-0012 — tests en rutas críticas](0012-tests-rutas-criticas.md).
