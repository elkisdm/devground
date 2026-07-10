# 02 — Patrones de Arquitectura

Síntesis estructurada de [patron arq.md](sources/patron%20arq.md).

## Tesis central

> *"Ninguna arquitectura es buena o mala por sí misma, sino que debes aprender cuándo realmente vale la pena utilizarlas."*

La decisión arquitectónica depende de tres variables: **tamaño del equipo**, **acoplamiento entre dominios** y **patrón de tráfico**. No del hype.

## Patrones

### Monolito (simple)
Todo el código desplegado como una unidad.
- **No es malo** — solo lo es cuando se implementa como "giant ball of mud" (sin estructura interna).
- Apto para equipos pequeños, MVPs, dominios con transacciones fuertes entre sí.

### Arquitectura por capas
Separación en capas (transporte/API, dominio, datos). Aplicable dentro de monolitos o microservicios. Base mínima de cualquier proyecto serio.

### Clean Architecture / Hexagonal
Inversión de dependencias: el dominio no depende de infraestructura.
- Requiere **requisitos claros** y dominio bien entendido.
- Brilla en proyectos estables con vida larga.
- **Lastra** en MVPs con requisitos cambiantes.

### Monolito modular
Monolito con módulos internos bien segregados (bounded contexts). Despliegue único, pero código desacoplado.
- **Sweet spot** para la mayoría de proyectos durante años.
- Permite extraer módulos a microservicios solo cuando justifique.

### Microservicios
Servicios independientes desplegables por separado.
- **Requiere** equipo grande, módulos con bajo acoplamiento, cultura de DevOps madura.
- Citado: **37% de migraciones a microservicios son solo parcialmente exitosas** — el fallo es contextual, no técnico.

### CQRS (Command Query Responsibility Segregation)
Separa el modelo de escritura del modelo de lectura. Habilita procesamiento asíncrono.
- **Solo** vale la pena con alto volumen de eventos asíncronos (tracking de clicks, telemetría).
- Añade complejidad innecesaria en flujos síncronos simples.

### Serverless (Lambdas)
Modelo de despliegue, **no** una arquitectura. Delega gestión de servidores al cloud.
- Ideal para tráfico en picos esporádicos.
- Costoso para tráfico constante (caso Amazon Prime Video: migraron de Lambda a servidor dedicado por costo).

## Tabla de trade-offs

| Patrón | Cuándo | Cuándo NO |
|---|---|---|
| Monolito simple | MVP, equipo pequeño, transacciones fuertes | Equipo grande con módulos paralelos |
| Capas | Siempre, como mínimo | — |
| Clean/Hexagonal | Dominio estable, requisitos claros | MVP con requisitos cambiantes |
| Monolito modular | Equipo mediano, evolución sostenida | Tráfico desbalanceado entre módulos (10x) |
| Microservicios | Equipo grande, módulos desacoplados, alta escala | Equipo <5, dominios acoplados |
| CQRS | Miles de escrituras asíncronas/seg | Flujos CRUD síncronos |
| Serverless | Tráfico en picos, baja gestión deseada | Tráfico constante, latencia crítica |

## Algoritmo de decisión

```
1. ¿Hay transacciones fuertes frecuentes entre dominios?
   SÍ  → Monolito (modular si el equipo crece).
   NO  → continúa.

2. ¿Requisitos claros y vida del proyecto >2 años?
   SÍ  → Aplica Clean/Hexagonal dentro del monolito modular.
   NO  → Monolito simple con capas.

3. ¿Algún módulo recibe ~10x más tráfico que el resto?
   SÍ  → Extrae ese módulo como microservicio.
   NO  → Mantén el monolito.

4. ¿Tráfico en picos esporádicos?
   SÍ  → Serverless para ese módulo.
   NO  → Servidor dedicado.

5. ¿Miles de eventos asíncronos/segundo?
   SÍ  → Aplica CQRS solo a esa parte.
   NO  → CRUD síncrono normal.
```

## Anti-patrones

- Migrar a microservicios sin equipo suficiente o por hype.
- Confundir serverless con microservicios (son ortogonales).
- Aplicar Clean/Hexagonal a un MVP con requisitos volátiles — paraliza la velocidad.
- Implementar CQRS para CRUD simple síncrono.
- No mapear el acoplamiento entre dominios antes de elegir arquitectura.

## Citas textuales

1. *"Ninguna arquitectura es buena o mala por sí misma."*
2. *"Un monolito es malo cuando se implementa de forma errónea. El problema no es el uso del monolito, el problema es haber generado un código nefasto."*
3. **Martin Fowler**: *"Nunca deberías empezar con arquitectura de microservicios, sino que primero deberías empezar con un monolito, hacerlo modular y luego separarlo en microservicios cuando sea realmente un problema."*
4. **Sam Newman**: *"Implementar microservicios en un equipo pequeño es un riesgo muy alto. Los beneficios no compensan todo el coste técnico."*
5. *"No se trata de tener la arquitectura más pura, sino de tener la arquitectura que realmente tu equipo pueda mantener."*

## ADRs derivados

- [ADR-0004 — Monolito vs Microservicios](adr/0004-monolito-vs-microservicios.md)
- [ADR-0005 — Cuándo aplicar Clean/Hexagonal](adr/0005-cuando-aplicar-clean-hexagonal.md)
- [ADR-0006 — Cuándo aplicar CQRS](adr/0006-cuando-aplicar-cqrs.md)
- [ADR-0007 — Serverless vs Servidor Dedicado](adr/0007-serverless-vs-servidor-dedicado.md)

## Referencia

Fuente original: [patron arq.md](sources/patron%20arq.md). Lectura complementaria: *"Building Microservices"* (Sam Newman), *"Monolith to Microservices"* (Sam Newman).
