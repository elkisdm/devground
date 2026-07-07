---
name: escritura-tecnica
description: >
  Escribe o mejora prosa técnica que se lee y se acepta — ADRs, READMEs, PR bodies,
  devlogs, guías, explicaciones y secciones de docs. Aplica los checklists mecánicos
  destilados de los playbooks de razonamiento de devground (narrativa/voz, síntesis,
  enseñanza) para que el documento haga su trabajo en vez de ser un muro de texto.
  Úsala SIEMPRE que vayas a redactar o reescribir un documento técnico —
  "escribe un ADR", "redacta el README", "mejora este PR body", "documenta esta
  decisión", "explica cómo funciona X", "escribe la guía de Y", "resume esto",
  "destila esta discusión", "write an ADR/README/PR", "document this", "explain X",
  "make this doc clearer", "tighten this up". NO la uses para código, tests, o
  respuestas conversacionales — solo cuando el entregable es un documento.
---

# Escritura técnica — checklists accionables

Destilado de `docs/reasoning-craft-playbook.md` (§A narrativa, §B síntesis) y
`docs/reasoning-craft-playbook-vol2.md` (§B enseñanza). Estos checklists son la versión
operativa; el detalle, los ejemplos antes/después y la honestidad adversarial viven en
esos playbooks.

## Paso 0 — Nombra el trabajo del documento (antes de la primera línea)

Un documento tiene un **trabajo, no un tema**. Escribe qué hará el lector distinto después
de leerlo; eso fija la estructura:

| Documento | Trabajo | Test de éxito |
|---|---|---|
| ADR | persuadir una decisión y sobrevivir la relectura en 2 años | el lector acepta sin leer el Contexto entero |
| README | que el lector decida en 30s si esto le sirve | título + 1ª frase bastan para filtrar |
| PR body | justificar el cambio ante un revisor con poco tiempo | el revisor aprueba sin la ronda "¿consideraste X?" |
| Guía / explicación | que el lector PUEDA hacerlo solo | predice un caso nuevo que no le mostraste |

Segunda pregunta obligatoria: **¿qué objeción tendrá el lector, y dónde la respondo?**
Respóndela antes de que la formule. Un documento sin objeción anticipada es un monólogo.

## Estructura por tipo (compacta)

- **ADR**: herida primero (el daño observado con evidencia, no generalidades) → antipatrón con código real → decisión imperativa y verificable con patrón copiable → consecuencias negativas reales → alternativas con razón de descarte en una frase (incluida "no hacer nada").
- **README**: qué es + cifra ancla en una línea → "para quién" explícito (filtra al lector equivocado) → camino feliz en ≤3 comandos → detalle progresivo en `<details>`/docs enlazadas.
- **PR body**: qué cambia y por qué ahora (efecto, no lista de archivos) → problema con evidencia → enfoque + alternativa descartada en una línea → cómo se verificó (comando concreto) → qué NO cubre.
- **Guía**: "para qué" en una frase → pasos numerados, cada uno con su verificación ("ejecuta X → deberías ver Y") → jerga con puente en el punto de uso → errores probables y su síntoma.

## Heurísticas de prosa (con test mecánico)

- **Apertura**: la primera frase contiene la conclusión o el dato que la fuerza. *Test de borrado*: si puedes quitar la primera frase sin perder información, quítala. (Prohibido meta-texto: "en este documento…", "aquí tienes".)
- **Por qué antes del qué**: toda regla lleva su mecanismo causal (la regla sin porqué se rompe en el primer caso raro). Excepción: material de referencia pura (tabla de API, índice).
- **Ritmo**: frase corta para veredicto/conclusión; larga para mecanismo/matiz. Tras 3 frases de >25 palabras, la siguiente <10. Un párrafo = una idea.
- **Cierre**: nunca resumas lo ya dicho. Cierra con la acción siguiente o la frontera ("qué NO cubre esto"). La honestidad ("cuándo NO usar esto") compra más credibilidad que cualquier adjetivo.
- **Corta siempre**: meta-texto; adjetivos sin medición ("robusto", "potente" → la cifra o nada); hedging doble; la reformulación de cortesía.
- **Forma según contenido**: ítems intercambiables → lista; estructura paralela de ≥3 → tabla; cadena causal → prosa. Voz activa con agente nombrado. Cada ~30 líneas, ≥1 elemento no-párrafo.

## Si estás DESTILANDO (resumir sin aplanar)

- **Protege lo no-derivable primero**: umbrales, excepciones, contraejemplos. El matiz crítico viaja disfrazado de detalle y es lo primero que un resumen aplana.
- **Una línea existe solo si cambia una decisión nombrable.** Funde por raíz causal (no por sección de origen), ordena por costo del error, máx. ~10 reglas.
- **Test de negación** (contra la falsa densidad): si negar la frase es absurdo ("la telemetría debe ser confiable"), no informa — reescríbela con un sustantivo verificable (ruta, umbral, comando) o bórrala.
- **Test de reconstrucción**: plantea 2-3 casos concretos; si la destilación no determina la decisión, cortaste el umbral que decidía.

## Si estás ENSEÑANDO (construir capacidad, no persuadir)

- Enseñar ≠ explicar: el éxito es que el lector **prediga un caso nuevo** que no mostraste, no que diga "quedó claro". Enseña el generador ("busca donde A confía en B"), no la lista de resultados.
- **Ejemplo ancla**: el PRIMERO define todo. Elígelo central (la mayoría de casos se le parecen, NO el raro/vistoso), completo (mecanismo esencial sin "ignora esto por ahora"), fértil (de él se derivan los vecinos).
- **Capas**: una idea verificable por capa; la capa 0 no tiene ni un "salvo/excepto". Cada capa siguiente responde una tensión que la anterior dejó viva. La excepción se difiere hasta que omitirla causaría un error de predicción.
- **Maldición del conocimiento**: todo término tiene puente antes del primer uso; borra "simplemente/obviamente/solo tienes que" (marcan una compresión que a ti te es automática).
- Cierra con un caso NUEVO + su respuesta, no un resumen.

## Modos de falla (los que cometen los modelos)

| Falla | Antídoto |
|---|---|
| Muro de texto uniforme | cada ~30 líneas ≥1 elemento no-párrafo |
| "Aquí tienes" / relleno de apertura | test de borrado |
| Conclusión enterrada | escríbela primero, construye hacia atrás |
| Voz pasiva evasiva ("se decidió") | decisor nombrado |
| Lista donde iba prosa / prosa donde iba tabla | conectores causales → prosa; estructura paralela → tabla |
| Simetría de plantilla | espacio proporcional al riesgo, no a las secciones |

## Antes de entregar

Relee **solo las primeras frases** de cada sección. Si no cuentan la historia completa,
reordena antes de pulir. Donde una regla no capture el juicio, dilo en el documento en vez
de fingir que lo captura.
