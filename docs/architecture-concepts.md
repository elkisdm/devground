# Conceptos clave de arquitectura (para todo el equipo)

Esta guia explica en lenguaje simple los conceptos que cubre el paquete [`@devground/architecture-guide`](../packages/architecture-guide#readme). Util si trabajas con desarrolladores, lideras producto, o simplemente quieres entender de que habla el equipo tecnico.

El paquete instala estos conceptos como documentacion versionada en tu propio proyecto (carpeta `knowledge/` + ADRs). Aqui esta el resumen conceptual; el detalle con trade-offs vive en esa knowledge base.

## Que es una base de datos

Es un programa especializado en **guardar y consultar informacion a gran escala**. Hay distintos tipos porque distintos problemas necesitan distintas garantias.

```
   APP  ───┐
           │  "dame el usuario 42"
           ▼
   ┌───────────────────┐
   │   BASE DE DATOS   │   ◄── guarda, ordena, indexa, responde
   └───────────────────┘
           │
           ▼  usuario 42 → { nombre, email, ... }
```

## Tipos de base de datos

| Tipo | Ejemplo | Para que sirve | Analogia |
|------|---------|----------------|----------|
| **Relacional (SQL)** | PostgreSQL, MySQL | Datos con reglas estrictas: pagos, ordenes, contabilidad | Una **planilla Excel** gigante con columnas fijas y reglas |
| **Documental (NoSQL)** | MongoDB | Datos flexibles que aun no sabes como van a evolucionar | Una **carpeta de fichas** donde cada ficha puede tener campos distintos |
| **Clave-Valor** | Redis, DynamoDB | Velocidad extrema: cache, sesiones, leaderboards | Un **diccionario** gigante: pides una palabra, te dan la definicion al instante |
| **Grafos** | Neo4j | Relaciones complejas: redes sociales, recomendaciones | Un **mapa de amistades** que sabe encontrar caminos entre personas |
| **Columnar / Time-series** | Cassandra, ClickHouse | Millones de eventos: metricas, telemetria, logs | Un **libro de bitacora** infinito optimizado para escribir y resumir |

> **Aclaracion clave:** "SQL" es solo el **lenguaje** para preguntar. No define el tipo. DynamoDB acepta SQL y NO es relacional. El **modelo de datos** es lo que importa, no la sintaxis.

## ¿Por que no uso una sola BD para todo?

Las empresas reales **combinan varias**. Cada problema con la herramienta correcta.

```
   Netflix
   ├── MySQL          → metadatos rigidos (catalogo, suscripciones)
   └── Cassandra      → actividad masiva (que viste, cuando, por cuanto tiempo)

   Uber
   ├── PostgreSQL     → relaciones criticas (pagos, viajes)
   └── Redis          → tiempo real (ubicacion del conductor, cache)
```

## Indices: el truco para que las consultas sean rapidas

Sin indice, la base de datos lee **fila por fila** hasta encontrar lo que pides. Con 1 millon de usuarios, eso es lentisimo.

Un indice funciona como el **indice de un libro**: en vez de leer todas las paginas, vas al final, buscas el tema, te dice "pagina 247". Saltas directo.

```
   SIN INDICE                        CON INDICE
   ──────────                        ──────────
   pagina 1   ¿es?                   indice
   pagina 2   ¿es?                   ─────────
   pagina 3   ¿es?                   "Juan"  → fila 47.213
   ...                               "Maria" → fila 89.001
   pagina 247 ¡SI!                   "Pedro" → fila 12.998
   (247 lecturas)                    (1 lectura, vas directo)
```

**Trampa:** los indices **aceleran lecturas** pero **ralentizan escrituras** (cada vez que insertas datos, hay que actualizar el indice tambien). Por eso no se indexa todo: se indexa lo que se consulta seguido.

## Normalizacion: evitar repetir datos

Si en cada pedido guardas el email del cliente, y el cliente cambia el email, tienes que actualizarlo en **miles de pedidos**. Riesgo enorme de inconsistencia.

**Normalizar** = separar la informacion en tablas relacionadas. El cliente vive en **una sola tabla**. Los pedidos solo guardan una **referencia** al cliente.

```
   SIN NORMALIZAR (mal)                  NORMALIZADO (bien)
   ───────────────────                  ──────────────────
   Pedido 1: Ana — ana@x.com            Clientes               Pedidos
   Pedido 2: Ana — ana@x.com            ────────               ───────
   Pedido 3: Ana — ana@x.com            id=7  Ana, ana@x.com   id=1  cliente=7
   Pedido 4: Ana — ana@x.com                                   id=2  cliente=7
                                                               id=3  cliente=7
   (si Ana cambia email,                (si Ana cambia email,
    actualizas 4 lugares)                actualizas 1 lugar)
```

> En bases NoSQL a veces se hace lo opuesto (**desnormalizar**): se duplica info a proposito para que las lecturas sean rapidas. Cada modelo tiene su filosofia.

## Sharding: partir la base de datos en pedazos

Cuando una sola maquina no aguanta, **partimos los datos por reglas**: ej. usuarios de America en un servidor, usuarios de Europa en otro, etc.

```
   ANTES (1 servidor saturado)         DESPUES (sharding)
   ──────────────────────              ──────────────────
                                       ┌──────────────┐
   ┌──────────────┐                    │ Servidor A   │ usuarios A-H
   │  Servidor    │ ◄── todos          ├──────────────┤
   │  saturado    │                    │ Servidor B   │ usuarios I-P
   └──────────────┘                    ├──────────────┤
                                       │ Servidor C   │ usuarios Q-Z
                                       └──────────────┘
```

La **shard key** (la regla por la que partes los datos) hay que elegirla bien **desde el inicio** — cambiarla despues es carisimo.

## Teorema CAP: no podes tener todo a la vez

En sistemas distribuidos solo puedes garantizar **dos** de tres:

- **C** Consistencia — todos los nodos ven el mismo dato a la vez
- **A** Disponibilidad — el sistema siempre responde
- **P** Tolerancia a particiones — sobrevive a fallos de red

> Es como "bueno, bonito y barato": elige dos.

```
                   CONSISTENCIA
                       /\
                      /  \
                     /    \
                    /      \
                   /  CAP   \
                  /          \
                 /            \
                /              \
   DISPONIBILIDAD ──────────── PARTICIONES
```

## Patrones de arquitectura: como organizas el codigo

| Patron | Cuando aplica | Analogia |
|--------|---------------|----------|
| **Monolito modular** | Equipo chico, producto en validacion | Una **casa grande** con habitaciones separadas pero un solo techo |
| **Microservicios** | Equipos grandes, dominios independientes a escala | Un **barrio**: cada casa funciona sola, conectadas por calles (red) |
| **Arquitectura hexagonal / Clean** | Logica de negocio compleja que debe sobrevivir cambios de framework | Una **central electrica**: el corazon no depende de que enchufe uses |
| **CQRS** | Lecturas y escrituras tienen necesidades muy distintas | **Dos ventanillas** en un banco: una para depositar, otra para consultar — optimizadas distinto |
| **Serverless** | Trafico variable, prototipos, eventos esporadicos | **Taxi a demanda**: pagas cuando lo usas, no tienes que mantener el auto |

> **Regla de oro del proyecto:** empezar con **monolito modular**. Sumar complejidad **solo cuando el dolor sea real**, no por moda. Esto esta documentado en `knowledge/adr/0004-monolito-vs-microservicios.md`.

## Diseño de sistemas: como escalas cuando crece

| Concepto | Que resuelve | Analogia |
|----------|--------------|----------|
| **Cache** | Lecturas repetidas a la misma info | Memoria de corto plazo: no vuelves a abrir la nevera para el mismo huevo |
| **Read replicas** | Muchas lecturas saturan la BD principal | **Fotocopias** del libro original para que muchos lectores no peleen |
| **Queues + Workers** | Picos de escritura que la BD no aguanta | **Cola del banco**: en vez de atender todos a la vez, se procesa de a uno con orden |
| **Circuit breaker** | Un servicio externo caido tumba todo el sistema | **Interruptor automatico**: si hay sobrecarga, corta antes de que se queme la casa |
| **Timeouts** | Esperar indefinidamente a un servicio lento | **Limite de paciencia**: si no responde en X segundos, cortas y sigues |

> Estos patrones estan en `knowledge/03-systems-design.md` con ejemplos y trade-offs concretos.

---

[← Volver al README](../README.md)
