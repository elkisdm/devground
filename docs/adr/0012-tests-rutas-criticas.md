# ADR-0012: Tests obligatorios en rutas críticas

- **Estado**: Propuesto
- **Fecha**: 2026-06-02
- **Decisor**: edaza
- **Aplica a**: cualquier proyecto del repo con lógica de dinero, captación de leads o autenticación

## Contexto

La auditoría de 6 proyectos encontró un repo con **cero tests** que sin embargo **tocaba dinero** (cálculo de montos, cobros, comisiones). Es el escenario de mayor riesgo posible: la lógica donde un error cuesta dinero real o reputación es exactamente la que estaba sin red de seguridad.

El argumento de "no hay tiempo para tests" se invierte aquí: no testear la lógica de dinero/leads/auth no es ahorrar tiempo, es **diferir un costo mayor** (un cobro mal calculado, un lead perdido, un bypass de auth) hacia el peor momento posible: producción.

No se trata de exigir 100% de cobertura en todo. Se trata de identificar las **rutas críticas** y exigir que tengan tests **antes de desplegar**.

## Decisión

### Definición de "ruta crítica"

Una ruta crítica es cualquier unidad de lógica que cae en una de estas categorías:

1. **Dinero**: cálculo de precios, montos, impuestos, comisiones, descuentos; creación/modificación de cobros, pagos, reembolsos; conciliación.
2. **Leads / datos de conversión**: captura, validación, deduplicación y persistencia de leads o contactos; cualquier dato cuya pérdida cuesta negocio.
3. **Auth / autorización**: login, manejo de sesión/tokens, verificación de permisos, password reset, verificación de firma de webhooks (ver [ADR-0009](0009-validacion-entrada-webhooks.md)).

### Requisito

Toda ruta crítica **debe tener tests unitarios** que ejerciten su lógica de negocio (incluyendo casos borde y de error: monto cero/negativo, lead duplicado, token expirado, firma inválida) **antes de desplegar a producción**. La lógica debe estar extraída del render/handler para ser testeable de forma aislada — lo que conecta directamente con [ADR-0010](0010-limite-tamano-modulo-funcion.md) (separar lógica imperativa habilita el test).

### Gate en CI (recomendado, documentado — no implementado aquí)

Se **recomienda** un gate en CI que falle el pipeline si las rutas críticas no tienen cobertura. Este ADR **no implementa** el workflow de CI; lo documenta como el lugar donde el requisito se vuelve exigible de forma automática. El patrón recomendado:

- Job de tests obligatorio en el pipeline (`pnpm test`), bloqueante para merge.
- Umbral de cobertura **enfocado en los paths críticos** (no global): configurar el reporter para exigir cobertura mínima en los directorios de dinero/leads/auth, no en todo el repo (un umbral global alto genera tests de relleno sin valor).
- Para webhooks/firmas: tests de firma válida e inválida son obligatorios.

## Consecuencias

**Positivas**
- Red de seguridad donde más duele un error (dinero/leads/auth).
- Tests como documentación ejecutable de las reglas de negocio.
- Empuja a extraer la lógica (sinergia con [ADR-0010](0010-limite-tamano-modulo-funcion.md)): código testeable es código mejor estructurado.
- Refactors futuros de la lógica de dinero quedan respaldados.

**Negativas / Trade-offs**
- Costo inicial de escribir tests y montar el runner (Vitest/Jest). Es deliberado: ese costo es el seguro.
- Definir "ruta crítica" tiene zona gris; se resuelve con criterio en review (ante la duda, es crítica).
- El gate de CI no se implementa en este ADR → hasta que cada proyecto lo configure, el requisito es de "buen comportamiento". Se documenta el patrón para cerrar esa brecha.

## Alternativas consideradas

1. **Exigir cobertura global alta (ej. 90% de todo)**: descartado. Produce tests de relleno (getters, mappers triviales) que dan falsa confianza y poco valor. Mejor cobertura **profunda en lo crítico** que **ancha y superficial**.
2. **Tests E2E en vez de unitarios**: complementarios, no sustitutos. Los E2E son lentos y frágiles para ejercitar casos borde de cálculo; los unitarios cubren la combinatoria de la lógica de dinero. Recomendados además, no en lugar de.
3. **Confiar en QA manual**: descartado — no escala, no cubre regresiones y es justo lo ausente en el repo que motivó este ADR.
4. **Implementar el workflow de CI en este ADR**: fuera de alcance. CI es específico de cada proyecto (GitHub Actions, etc.); aquí se fija el estándar y el patrón, la implementación se hace por proyecto.

## Referencias

- Punto ciego de origen: auditoría de 6 proyectos — cero tests en un repo que toca dinero.
- Relacionado: [ADR-0010 — límite de tamaño / container-presentational](0010-limite-tamano-modulo-funcion.md) (habilita testabilidad), [ADR-0009 — validación y firma de webhooks](0009-validacion-entrada-webhooks.md) (firmas como ruta crítica de auth).
