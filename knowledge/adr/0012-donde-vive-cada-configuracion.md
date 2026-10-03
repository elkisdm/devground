# ADR-0012: Dónde vive cada configuración (código, env, flags, DB, datos)

- **Estado**: Template (derivado de fuente)
- **Fecha**: 2026-10-03
- **Fuente**: [configuracion.md](../sources/configuracion.md)

## Contexto

Todo sistema acumula valores "configurables": credenciales, proveedores, umbrales, límites, copy, prompts, toggles. Sin un criterio, terminan en uno de dos extremos:

- **Todo en `.env`**: el negocio no puede ajustar un umbral sin un deploy, y en multi-tenant aparecen `CLIENTE_A_MAX_CALLS`, `CLIENTE_B_MAX_CALLS`… que no escalan.
- **Todo en la base de datos**: la DB se vuelve un `.env` gigante editable desde un dashboard. Cambiar el proveedor de pagos o de auth queda a un clic, sin revisión ni deploy.

La pregunta "¿quiero cambiarlo sin redeploy?" no basta: casi todo es más cómodo sin deploy. La pregunta correcta es **quién debería poder cambiarlo y cuánto daño hace si cambia mal**.

## Decisión

### 1. Cinco capas, cada valor en una sola

| Capa              | Responde                                       | Quién la cambia                          | Cómo cambia               | Ejemplos                                                                                                                                      |
| ----------------- | ---------------------------------------------- | ---------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Código**        | ¿Cómo funciona el sistema?                     | Developer                                | PR + deploy               | lógica de scoring, algoritmo, integración con un proveedor                                                                                    |
| **Env / secrets** | ¿Con qué infraestructura corre?                | Developer / DevOps                       | deploy o restart          | `DATABASE_URL`, API keys, JWT secret, buckets, región, proveedor de email/telefonía/pagos/auth, timeout HTTP global, modelos de IA permitidos |
| **Feature flags** | ¿Qué código nuevo está encendido y para quién? | Developer / producto                     | sin deploy, gradual       | agente nuevo, pipeline V2, algoritmo de scoring nuevo, UI para 10 %                                                                           |
| **Config en DB**  | ¿Cómo queremos que opere hoy?                  | Admin del sistema o cliente (por tenant) | sin deploy, con auditoría | umbrales, límites, horarios, precios, copy, mensajes de WhatsApp, prompts, temperatura, modelo elegido por cliente                            |
| **Datos**         | ¿Qué ocurrió?                                  | La aplicación                            | operación normal          | leads, llamadas, propiedades, eventos                                                                                                         |

Regla de entrada: **si cambiar el valor cambia la estructura del sistema → código o env, y pasa por deploy. Si cambia una decisión operativa del negocio → config en DB.**

### 2. Blast radius: cuanto más daño, más difícil de cambiar

| Blast radius | Ejemplo                                       | Capa         | Control mínimo                                             |
| ------------ | --------------------------------------------- | ------------ | ---------------------------------------------------------- |
| Bajo         | texto de un mensaje de WhatsApp               | DB           | `updated_at`, `updated_by`                                 |
| Medio        | umbral de calificación, máx. de llamadas      | DB           | + audit log (valor anterior → nuevo) + validación de rango |
| Alto         | algoritmo de scoring nuevo                    | Feature flag | rollout gradual + kill switch                              |
| Enorme       | proveedor de auth, de pagos, de base de datos | Código / env | PR + deploy, nunca un botón                                |

### 3. Reglas que acompañan a la config en DB

- **Default en código, override en DB.** El código define el esquema, el tipo, el rango válido y el valor por defecto. Si la fila no existe o es inválida, se usa el default; la app nunca se cae por config ausente.
- **La DB elige dentro de lo que env permite.** "Modelo usado por el cliente" vive en DB, pero se valida contra "modelos permitidos" de env. Lo mismo con proveedores: el cliente elige entre los que la infraestructura habilitó.
- **Columnas tipadas para lo importante.** `agent_settings(organization_id, max_call_attempts INTEGER, qualification_threshold INTEGER, …)` con `CHECK` de rango. Una tabla clave/valor sirve para copy y valores de bajo riesgo; un `JSONB settings` que crece sin esquema termina sin validar, sin migrar y sin que nadie sepa qué contiene.
- **Multi-tenant = fila por organización**, nunca una env var por cliente.
- **Prompts y reglas comerciales de agentes: versionados.** Una versión nueva es una fila nueva (`prompt_version`), no un `UPDATE` encima; poder volver atrás es parte del contrato.

### 4. Reglas que acompañan a env y a los flags

- **Secrets nunca en texto plano en DB.** Si un cliente trae sus propias credenciales (su cuenta de Twilio, su WhatsApp), van cifradas (por ejemplo Supabase Vault) y la config guarda la referencia, no el valor.
- **Un comportamiento, un selector.** Dos variables que eligen el mismo camino (`TELEFONIA_PROVEEDOR` y `TELEFONIA=telnyx`) terminan divergiendo: un gate mira una y el código real usa la otra.
- **Env o flag para un toggle:** si encenderlo requiere infraestructura distinta (otra cola, otro servicio, otra credencial) → env + deploy. Si solo elige entre caminos de código ya desplegados y quieres encenderlo por partes → flag.
- **Los flags son temporales.** Al llegar al 100 %, se borra el flag y el camino viejo. Un flag que vive para siempre es config disfrazada: muévelo a la capa que le corresponde.
- **Flags sin plataforma hasta necesitarla.** Mientras no haya rollout por porcentaje, un booleano por organización en la config basta. Una tabla `feature_flags` o un servicio externo se justifican cuando el rollout gradual es real.

## Implementación recomendada

- **Validación del env al arrancar** (Zod / Pydantic Settings): si falta una variable o es inválida, el proceso no levanta. Falla en el deploy, no en el primer request.
- **Config de DB leída por un solo módulo** (`getOrgSettings(orgId)`), con caché corta si se lee en el hot path y default de código si falta.
- **Audit log** para config de blast radius medio o mayor: `config_audit(organization_id, key, old_value, new_value, changed_by, changed_at)`.
- **RLS** en tablas de config por tenant: un cliente nunca lee ni edita la config de otro.

## Consecuencias

**Positivas**

- El negocio ajusta umbrales, copy y prompts sin depender del equipo técnico.
- Los cambios peligrosos siguen pasando por revisión y deploy.
- Cada valor tiene un único lugar donde buscarlo, y un historial de quién lo cambió.
- Las funcionalidades nuevas se encienden por partes y se apagan sin redeploy.

**Negativas / Trade-offs**

- Más piezas: esquema de settings, validación, auditoría y, si llega, un sistema de flags.
- La config en DB introduce un modo de falla nuevo (fila ausente, valor fuera de rango) que el default de código debe cubrir.
- Los flags acumulan deuda si no se borran al terminar el rollout.

## Alternativas consideradas

1. **Todo en env**: simple y auditable, pero el negocio queda bloqueado por cada ajuste y el multi-tenant no escala.
2. **Todo en DB**: máxima flexibilidad, pero convierte producción en una caja negra editable y pone decisiones estructurales a un clic.
3. **Un `JSONB settings` único por organización**: rápido de empezar; difícil de validar, migrar y entender a medida que crece. Aceptable solo para valores de bajo riesgo.
4. **Plataforma de flags externa desde el día 1** (LaunchDarkly, Unleash, PostHog): útil con rollouts frecuentes y equipos grandes; sobre-ingeniería mientras no exista un rollout gradual real.

## Cita de respaldo

> _"Si cambiar el valor cambia el comportamiento estructural de la aplicación, configúralo fuera de la base de datos y haz que pase por deploy/restart. Si cambia una decisión operativa del negocio, guárdalo como configuración dinámica."_ — [configuracion.md](../sources/configuracion.md)

> _"Poder cambiar algo sin redeploy no significa que deba poder cambiarse sin control."_ — [configuracion.md](../sources/configuracion.md)
