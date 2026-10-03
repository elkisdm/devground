# Configuración: código vs env vs feature flags vs DB

> Fuente: conversación con un asistente de IA, 2026-10-03. Texto original sin editar; la
> síntesis está en [ADR-0012](../adr/0012-donde-vive-cada-configuracion.md).

La regla útil es esta:

> **Si cambiar el valor cambia el comportamiento estructural de la aplicación, configúralo fuera de la base de datos y haz que pase por deploy/restart. Si cambia una decisión operativa del negocio, guárdalo como configuración dinámica.**

El error común es convertir la base de datos en un `.env` gigante porque “es más cómodo cambiarlo sin deploy”.

### 1. Variables que deberían requerir deploy/restart

Úsalas para cosas que son parte de la **infraestructura, seguridad o contrato técnico del sistema**.

Ejemplos:

- `DATABASE_URL`
- URL de Supabase
- API keys
- credenciales de servicios
- endpoints internos
- región cloud
- nombres de buckets
- configuración de Redis
- provider de email
- claves JWT
- modelos de IA disponibles a nivel infraestructura
- toggles arquitectónicos importantes:
  - `USE_NEW_PIPELINE=true`
  - `ENABLE_V2_ROUTER=true`

¿Por qué?

Porque quieres que cambiar eso sea **deliberado, auditable y poco frecuente**.

Si alguien cambia accidentalmente:

```env
PAYMENT_PROVIDER=stripe
```

a otro proveedor, probablemente estás cambiando una pieza fundamental del sistema.

No debería existir un botón en un dashboard para hacerlo tranquilamente.

---

### 2. Configuración que debería vivir en DB

Cuando el negocio necesita modificarla **sin intervención del equipo técnico**.

Ejemplos inmobiliarios muy claros:

```txt
minimum_income_multiplier = 3
lead_expiration_days = 30
max_call_attempts = 5
appointment_duration = 45
commission_percentage = 2.5
qualification_score_threshold = 70
```

También:

- horarios
- precios
- límites comerciales
- reglas por cliente
- copy
- prompts configurables
- preguntas que realiza un agente
- mensajes de WhatsApp
- duración entre reintentos
- zonas disponibles
- criterios de calificación
- preferencias por organización

En tu caso, por ejemplo:

```txt
organization_settings

capital_inteligente
  agent_name = Claudia
  max_call_attempts = 4
  minimum_income = 1500000
  qualification_threshold = 65
```

Eso claramente no debería requerir redeploy.

---

### 3. La distinción más importante: código vs configuración vs datos

Yo lo pensaría en estas tres capas:

```txt
CODE
↓
¿Cómo funciona el sistema?

CONFIG
↓
¿Cómo queremos que funcione ahora?

DATA
↓
¿Qué ocurrió?
```

Ejemplo con Claudia:

**Código**

```ts
if (lead.score >= settings.qualificationThreshold) {
  scheduleMeeting();
}
```

**Configuración**

```json
{
  "qualificationThreshold": 70
}
```

**Datos**

```json
{
  "lead": "Juan",
  "score": 82,
  "qualified": true
}
```

Separar esas tres cosas te da una arquitectura mucho más mantenible.

---

## Una heurística todavía mejor

Hazte esta pregunta:

> **¿Quién debería poder cambiar esto?**

Si la respuesta es:

**Developer / DevOps**
→ environment variable / infrastructure config.

**Administrador del sistema**
→ configuración DB.

**Cliente**
→ configuración DB multi-tenant.

**Aplicación**
→ datos normales.

Ejemplo:

| Configuración            | Lugar         |
| ------------------------ | ------------- |
| `OPENAI_API_KEY`         | Secret/env    |
| `DATABASE_URL`           | Secret/env    |
| modelo default permitido | Env/config    |
| modelo usado por cliente | DB            |
| prompt del agente        | DB/versionado |
| temperatura del agente   | DB            |
| máximo llamadas/día      | DB            |
| proveedor de telefonía   | Env/config    |
| credenciales Twilio      | Secret        |
| mensaje inicial Claudia  | DB            |
| timeout HTTP global      | Env/config    |

---

## Hay una tercera categoría que suele faltar: Feature Flags

No todo debe ser `.env` o DB.

Para cambios como:

```txt
activar nuevo agente
activar pipeline V2
usar nuevo algoritmo de scoring
activar nueva UI para 10% de usuarios
```

usa **feature flags**.

Ejemplo:

```txt
feature_flags

new_qualification_agent
enabled = true
percentage = 20
organizations = ["capital_inteligente"]
```

Esto te permite hacer:

```txt
deploy código
↓
feature apagada
↓
activar para equipo interno
↓
activar 10%
↓
activar 100%
```

Sin volver a desplegar.

Eso reduce muchísimo el riesgo.

---

## En sistemas multi-tenant, hay otra regla

No hagas esto:

```env
CAPITAL_INTELIGENTE_MAX_CALLS=5
SELECT_CAPITAL_MAX_CALLS=3
IMAGINA_MAX_CALLS=4
```

Eso escala horrible.

Haz:

```txt
organizations
    ↓
organization_settings
```

Ejemplo:

```txt
organization_settings

organization_id
key
value
updated_at
updated_by
```

O mejor todavía, columnas tipadas cuando las configuraciones son importantes:

```txt
agent_settings

organization_id UUID
max_call_attempts INTEGER
qualification_threshold INTEGER
call_timeout_seconds INTEGER
prompt_version UUID
```

Evitaría abusar de un `JSONB settings` gigantesco porque con el tiempo termina siendo difícil de validar, migrar y entender.

---

## Y hay un criterio arquitectónico que considero especialmente importante

### Cuanto mayor sea el blast radius, más difícil debería ser cambiarlo.

Por ejemplo:

```txt
Texto WhatsApp
blast radius bajo
→ DB
```

```txt
Threshold de scoring
blast radius medio
→ DB + audit log
```

```txt
Algoritmo de scoring
blast radius alto
→ feature flag
```

```txt
Proveedor de autenticación
blast radius enorme
→ código/env + deploy
```

Esto es mejor criterio que simplemente:

> “¿Quiero cambiarlo sin redeploy?”

---

### Arquitectura que recomiendo

Para los sistemas que estás construyendo:

```txt
┌──────────────────────────┐
│ CODE                     │
│ Git / deploy             │
│ lógica y arquitectura    │
└────────────┬─────────────┘
             │
┌────────────▼─────────────┐
│ ENV / SECRETS            │
│ infraestructura          │
│ credenciales             │
│ endpoints                │
└────────────┬─────────────┘
             │
┌────────────▼─────────────┐
│ FEATURE FLAGS            │
│ rollout de funcionalidad │
│ experimentación          │
└────────────┬─────────────┘
             │
┌────────────▼─────────────┐
│ APP CONFIG               │
│ Supabase / DB            │
│ reglas comerciales       │
│ configuración cliente    │
└────────────┬─────────────┘
             │
┌────────────▼─────────────┐
│ BUSINESS DATA            │
│ leads                    │
│ llamadas                 │
│ propiedades              │
│ eventos                  │
└──────────────────────────┘
```

Y añadiría un principio más: **configuración dinámica importante debe tener versión, `updated_by`, `updated_at` y audit log**. Poder cambiar algo sin redeploy no significa que deba poder cambiarse sin control.

Para un sistema de agentes como Claudia, yo llevaría incluso los **prompts y reglas comerciales a configuración versionada en DB**, mientras dejaría modelos permitidos, credenciales, infraestructura y providers base fuera de DB. Esa separación te permite iterar rápido sin convertir producción en una caja negra.
