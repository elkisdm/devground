# ADR-0050: Recorrido de punta a punta antes de publicar un rediseño o módulo grande

- **Estado**: Propuesto
- **Fecha**: 2026-11-20
- **Decisor**: edaza
- **Aplica a**: cualquier producto que pase un rediseño o un módulo grande de «opcional» a «para todos»
- **Extiende**: [ADR-0038](0038-trabajo-por-builds-con-gate-verificable.md) (gate verificable antes de salir)

## Contexto

En el CRM v2 de Capital (CRM-32) la suite estaba en verde (5.550 pruebas web, 2.634 de base,
281 de contactos) y el QA manual por pantalla no veía problemas graves. Al inventariar todas las
acciones del producto (328 casos) y recorrerlas en un navegador real, por rol, a 1440 y 390 px y
contra el prototipo, aparecieron ~25 defectos: una lectura caída tumbaba todo el Inicio, cuentas de
solo lectura veían botones de escritura, administración heredaba el panel del socio por una semilla,
la API respondía con una redirección en vez de 401, desbordes a 320 px. Nadie podía decir antes qué
acciones existían y cuáles funcionaban.

## Decisión

Antes de publicar por defecto un rediseño o un módulo grande, correr un **recorrido de punta a
punta** según `docs/recorrido-de-punta-a-punta.md`: contrato de casos leído del código, entornos
aislados por bloque con datos sintéticos y dobles, guiones con capturas y chequeos automáticos,
matriz publicada, arreglos con prueba en rojo primero y veredicto de publicación.

Reglas fijas: ningún caso en verde sin haberse probado; los casos de riesgo alto se comprueban en la
base; quien recorre no arregla el producto; nada toca producción.

## Consecuencias

**Positivas**

- Respuesta verificable a «¿qué hace el producto y funciona?», por rol y por ancho.
- Encuentra defectos de alcance, permisos y resiliencia que las pruebas unitarias no cubren.
- La matriz sirve de evidencia para la decisión de publicar.

**Negativas / Trade-offs**

- Costo: varios agentes y entornos durante horas. Mitigación: tres bloques, máximo 3 entornos a la
  vez y suite completa solo al cierre.
- El contrato envejece con el producto. Mitigación: el campo `cubierto_por` y re-correr por bloque.

## Alternativas consideradas

1. **Solo la suite y QA manual por pantalla**: es lo que dejó pasar los ~25 defectos.
2. **E2E clásico por flujo feliz**: no cubre roles, estados vacío/error ni comparación con el diseño.

## Referencias

- `docs/recorrido-de-punta-a-punta.md`
- Primera aplicación: brekto-crm, `infra/integracion/pruebas/recorrido/` (CRM-32). Segunda: panel
  nuevo de Atlas (ATL-114).
