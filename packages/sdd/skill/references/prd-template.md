# PRD — <nombre de la iniciativa>

> Plantilla de spec-flow (ADR-0043). Úsala solo cuando un objetivo de negocio se reparte en
> varios cambios. Un cambio suelto no necesita PRD: su brief basta. Guárdalo en
> `docs/prd/<iniciativa>.md` y enlázalo desde la línea `**Origen**` de cada brief.

- **Estado**: borrador | en curso | cerrado
- **Responsable**: <persona que decide el alcance>
- **Épica / ítem en el registro de trabajo**: <enlace, si hay>
- **Fecha**: AAAA-MM-DD

## Problema
Qué pasa hoy, a quién le duele y cómo lo sabemos (dato, reunión, incidente). Sin fuente, no va.

## Para quién
Usuarios o roles afectados y qué necesitan lograr.

## Métrica de éxito
El número que debe moverse, su valor actual y la meta. Cómo y dónde se mide.

## Alcance
- Lo que entra (cada punto se volverá uno o más cambios con su brief).

## Fuera de alcance
- Lo que deliberadamente no se hace ahora.

## Requisitos no funcionales
Los atributos de `knowledge/nfr-catalogo.md` que aplican y su nivel esperado
(p. ej. «responde en < 500 ms p95», «datos personales: solo con consentimiento»).

## Riesgos y dependencias
Servicios externos, accesos, otros equipos, plazos legales.

## Decisiones abiertas
Lo que falta decidir y quién lo decide. Cada decisión de arquitectura tomada se registra como ADR.

## Cambios
| Cambio | Tier | Estado | Brief / PR |
|---|---|---|---|
