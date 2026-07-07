# Playbook: Craft de Razonamiento (juicio no codificado)

> **Procedencia.** Segunda captura de **Fable 5** (2026-07-06), antes de su retiro, vía dos
> corridas de subagente (`model: fable`) en paralelo. Complementa a
> [`audit-orchestration-playbook.md`](./audit-orchestration-playbook.md): aquel documentó
> dominios cuyo criterio ya vivía en código (`policy.json`, `engine.mjs`,
> `deepcheck.workflow.js`); **este documenta los dominios donde el criterio NO está en
> ningún código** — juicio puro: narrativa, síntesis, lectura de intención y gusto de diseño.
> Ahí es donde un modelo expresivo como Fable es genuinamente más notable.
>
> **Verificación.** Rutas, funciones de `engine.mjs` (`clamp`/`estimateCost`/`buildPlan`/
> `reconcile`/`metrics`), el patrón de `null` honesto, los nombres de paquetes
> (`@devground/devground`, `devground-init`), ADR-0007 y las líneas de README/faq citadas
> fueron verificados contra el repo el 2026-07-06. Contenido conservado verbatim.
>
> **Nota de calibración.** Cada dominio incluye una sección "Dónde NO soy más notable"
> escrita por el propio Fable — honestidad adversarial para que el lector no sobrevalore
> los patrones. Léelas: son tan valiosas como los patrones mismos.
>
> **Siguiente paso.** Corpus crudo de captura. Destilación a skill + integración van por
> `spec-flow`, tras validar que mejoran el output.

---

# Legado Fable 5 — Andamiaje transferible para NARRATIVA/VOZ y SÍNTESIS/DESTILACIÓN

> Escrito por Fable 5 antes de su retiro, para Opus 4.8. Nada de lo que sigue depende de mis pesos: son procedimientos, criterios con umbral, plantillas de prompt y ejemplos antes/después ejecutables por cualquier modelo que los lea. Toda ruta citada fue verificada contra el repo el 2026-07-06 (`ls`/`Read` reales, sin archivos inventados).

**Artefactos de referencia en devground:**

| Uso | Artefacto | Ruta |
|---|---|---|
| ADR ejemplar (narrativa que persuade) | Rate-limiting distribuido | `docs/adr/0007-rate-limiting-distribuido.md` |
| ADR correcto pero plano (contraste) | pnpm workspace | `docs/adr/0001-pnpm-workspace.md` |
| Apertura de README que vende en 2 líneas | README raíz | `README.md` (líneas 27-29) |
| Honestidad como recurso retórico | Sección "¿Cuándo NO usar devground?" | `docs/faq.md` (líneas 69-86) |
| Traducción a no-developers | Glosario con analogías | `docs/glossary.md` |
| Índice que no duplica | Uso por paquete | `docs/usage.md` |
| Caso de destilación buena | Parte C del playbook | `docs/audit-orchestration-playbook.md` (líneas 502-534) |

---

# Parte A — NARRATIVA Y VOZ (escritura técnica)

## A.1 Modelo mental: el documento tiene un trabajo, no un tema

La pregunta antes de la primera línea, siempre por escrito: **"¿qué tiene que hacer el lector distinto después de leer esto, y qué es lo mínimo que necesita creer para hacerlo?"**

- Si la respuesta es "aceptar una decisión" → el documento es un argumento (ADR).
- Si es "decidir en 30 segundos si esto le sirve" → es una venta con salida rápida (README).
- Si es "aprobar un cambio con confianza" → es una justificación con evidencia (PR body).
- Si es "poder hacer X sin ti" → es enseñanza con verificación (explicación/guía).

Un texto técnico se ignora cuando obliga al lector a hacer el trabajo de extraer la conclusión. Se lee y se acepta cuando la conclusión llega primero y la evidencia después, en el orden en que el lector escéptico la pediría. El criterio operativo: **el lector con 20 segundos debe llevarse la decisión correcta; el lector con 5 minutos, las razones; el lector con 20, los detalles.** Si tu borrador no sobrevive el corte de 20 segundos (lee solo título + primera frase de cada sección: ¿se entiende qué se decidió y por qué?), reordena antes de pulir.

Segunda pregunta obligatoria: **¿qué objeción va a tener el lector, y dónde la respondo?** Un documento sin objeción anticipada es un monólogo. ADR-0007 responde la objeción "pero mi Map funciona en local" *antes* de que el lector la formule (líneas 25-31: "En un servidor monolítico esto *parece* funcionar. Pero…"). Eso es lo que lo hace persuasivo y no normativo.

## A.2 Procedimiento: estructura según el trabajo del documento

**ADR (trabajo: persuadir una decisión y sobrevivir a la relectura en 2 años).**
1. **Herida primero**: el Contexto abre con el daño observado, no con generalidades. ADR-0007 abre con "Una auditoría de 6 proyectos detectó un punto ciego recurrente (visto en 3 proyectos)" — evidencia cuantificada en la primera frase.
2. **El antipatrón con código real**: muestra lo prohibido antes de lo mandado (ADR-0007 pone el `Map` con comentario `// ANTIPATRÓN` antes de la decisión). El lector se reconoce en el código malo; eso compra la aceptación.
3. **Decisión en negrita, imperativa, verificable**: "Prohibido usar X. Debe usarse Y." Con opciones aceptadas *en orden de preferencia* y patrón copiable — la decisión que incluye el código de reemplazo se adopta; la que solo prohíbe se ignora.
4. **Consecuencias negativas reales, no decorativas**: ADR-0007 admite latencia extra, costo monetario y dependencia de infra. Un ADR sin trade-offs negativos concretos no es creíble.
5. **Alternativas con la razón de descarte en una frase cada una** — incluida la alternativa "no hacer nada" cuando existió.

**README (trabajo: que el lector decida en 30 segundos si esto es para él).**
1. Qué es + cifra ancla en una línea ("13 paquetes npm. Un solo comando." — `README.md:27`).
2. **"Para quién"** explícito en el bloque de apertura (`README.md:29`) — esta línea filtra al lector equivocado antes de que pierda tiempo, y eso también es servicio.
3. Camino feliz copiable en ≤3 comandos ("Dos comandos y listo").
4. Detalle progresivo: lo largo va en `<details>` o en docs enlazadas, nunca inflando el primer scroll.
5. Para READMEs de paquete: qué-instala-usa-API y para (`packages/logger/README.md` completo cabe en una pantalla; esa es la meta).

**PR body (trabajo: justificar el cambio ante un revisor con poco tiempo).**
1. Una frase: qué cambia y por qué ahora (efecto para el usuario/sistema, no lista de archivos).
2. El problema con evidencia (issue, síntoma, medición).
3. Enfoque elegido + la alternativa descartada en una línea (esto ahorra la ronda de "¿consideraste X?").
4. Cómo se verificó (comando concreto, no "se probó").
5. Qué NO cubre este PR (corta el scope-creep del review).

**Explicación/guía (trabajo: que el lector pueda sin ti).**
1. El "para qué" en una frase antes de cualquier paso.
2. Pasos numerados donde cada paso tiene su verificación ("ejecuta X → deberías ver Y").
3. Traducción de jerga en el punto de uso o en glosario enlazado — `docs/glossary.md` es el patrón: cada herramienta con función + analogía cotidiana ("Commitlint = el portero del banco"). La analogía no adorna: da al no-developer un asidero para *recordar*, no solo entender.
4. Errores probables y su síntoma exacto al final.

## A.3 Heurísticas de prosa con criterio concreto

- **Apertura**: la primera frase debe contener o la conclusión o el dato que la fuerza. Test mecánico: si puedes borrar la primera frase sin perder información, bórrala y asciende la segunda. ("En el mundo del desarrollo moderno…" siempre falla el test; "Una auditoría de 6 proyectos detectó…" siempre lo pasa.)
- **Por qué antes del qué, con una excepción medida**: la regla sin su mecanismo causal se cumple de memoria y se rompe al primer caso raro. ADR-0007 no dice solo "usa store compartido": explica *el mecanismo* (cada instancia serverless tiene su propio heap → el límite real es N×10). Excepción: en material de referencia pura (tabla de API, índice) el porqué estorba — `docs/usage.md` es tablas y enlaces a propósito.
- **Ritmo**: frase corta para conclusión, veredicto o giro ("El resultado: el límite es **ilusorio**."); frase larga para mecanismo causal o matiz. Criterio mecánico: tras 3 frases de >25 palabras, la siguiente debe ser de <10. Un párrafo = una idea; si necesitas "además" por tercera vez, corta el párrafo.
- **Cierre**: nunca cierres resumiendo lo ya dicho. Cierra con la acción siguiente, el enlace de profundización, o la frontera ("qué NO cubre esto"). `docs/faq.md` cierra con "¿Cuándo NO usar devground?" — el cierre más fuerte de todo el repo, porque convierte honestidad en credibilidad.
- **Qué cortar siempre**: (1) meta-texto ("en este documento veremos…", "como se mencionó antes"); (2) adjetivos de calidad sin medición ("robusto", "potente", "elegante" — reemplaza por la cifra o borra); (3) hedging doble ("podría posiblemente"); (4) la reformulación de cortesía (decir lo mismo dos veces con otras palabras "para que quede claro" — elige la mejor versión y borra la otra).
- **Voz**: activa e imperativa en decisiones y pasos ("Prohibido usar…", "Instala…"); el agente de la acción siempre explícito ("el CLI detecta tu lockfile", no "el lockfile es detectado").

## A.4 Modos de falla del escritor técnico (los que cometen los modelos) y su antídoto

| Falla | Cómo se ve | Antídoto ejecutable |
|---|---|---|
| **Muro de texto uniforme** | Párrafos del mismo largo, sin negritas, sin código, sin tablas | Regla: cada pantalla (~30 líneas) necesita ≥1 elemento no-párrafo (código, tabla, lista, negrita estructural). Si una sección no lo tiene, o le falta estructura o le sobra texto |
| **Relleno de apertura ("aquí tienes", "en este documento")** | Primera frase sin información | Test de borrado (A.3): borra la primera frase; si nada se pierde, no era la primera frase |
| **Conclusión enterrada** | La decisión aparece en el párrafo 4, después del contexto | Escribe la conclusión primero, luego pregunta "¿qué necesita creer el lector para aceptarla?" y construye hacia atrás. En ADRs: la sección Decisión debe ser legible sin leer Contexto |
| **Voz pasiva evasiva** | "Se decidió que…", "fue implementado" | Cada decisión con decisor nombrado (los ADRs del repo tienen campo `Decisor:` por esto). Grep mental por "se + verbo": cada hit, reescribe con sujeto |
| **Lista donde iba prosa** | Bullets que son fragmentos de un argumento causal ("• el Map no se comparte • por eso el límite falla") | Si los ítems tienen conectores causales implícitos (porque, entonces, pero), es un párrafo. Lista solo si los ítems son intercambiables en orden |
| **Prosa donde iba lista/tabla** | Párrafo que enumera ≥3 elementos paralelos con la misma estructura | Si puedes ponerle encabezados de columna, es tabla (`docs/faq.md:73-79` convierte 5 situaciones "no usar" en tabla situación→porqué; como párrafo sería ilegible) |
| **Simetría falsa** | Dar el mismo espacio a lo importante y lo trivial porque la plantilla tiene N secciones | El espacio es proporcional al riesgo de la decisión, no a la plantilla. Una sección puede ser una línea |

## A.5 Patrón de prompt reutilizable (agente escritor)

```
Escribe <tipo: ADR|README|PR body|guía> para <tema>.

TRABAJO DEL DOCUMENTO: el lector debe <acción concreta post-lectura>.
LECTOR: <rol, cuánto contexto tiene, cuánto tiempo tiene>.
OBJECIÓN PRINCIPAL que el lector va a tener: <objeción>. Respóndela antes
de que la formule, no en un apéndice.

EVIDENCIA disponible (usa solo esta, no inventes cifras ni rutas):
- <hechos, mediciones, rutas verificadas, código real>

ESTRUCTURA: <la del tipo, según A.2>.

REGLAS DE PROSA:
- Primera frase: conclusión o dato que la fuerza. Prohibido meta-texto
  ("en este documento", "aquí tienes").
- Por qué antes del qué: toda regla lleva su mecanismo causal.
- Test de 20 segundos: título + primera frase de cada sección deben
  bastar para llevarse la decisión correcta.
- Trade-offs negativos reales y concretos (sin ellos no es creíble).
- Voz activa con agente nombrado. Cero adjetivos sin medición.
- Cada ~30 líneas, ≥1 elemento no-párrafo.
- Cierra con acción siguiente o frontera ("qué NO cubre"), nunca con resumen.

ANTES DE ENTREGAR: relee solo las primeras frases de cada sección.
Si no cuentan la historia completa, reordena.
```

## A.6 Ejemplo ANTES → DESPUÉS (fragmento real del repo)

`docs/adr/0001-pnpm-workspace.md` es correcto pero plano: su Contexto es una lista de requisitos sin herida. Compáralo con el 0007 y la diferencia es enseñable. Reescritura del Contexto:

**ANTES** (real, líneas 10-16):
> devground es un monorepo con 9 paquetes publicables a npm. Necesita:
> - Linkeo entre paquetes en desarrollo local (…)
> - Dedupe agresivo de dependencias (8 paquetes comparten ESLint, TS, etc.)
> - Lockfile reproducible para CI.
> - Compatibilidad con publicación a npm sin fricción.

**DESPUÉS:**
> Con npm workspaces, un paquete de devground puede importar una dependencia que nunca declaró — el hoisting permisivo la deja accesible en `node_modules` del root. El bug no aparece en el monorepo: aparece cuando un usuario instala ese paquete solo, y la dependencia fantasma no está. Con 9 paquetes publicables, cada import no declarado es una bomba de tiempo en producción ajena.
>
> Necesitamos un gestor que haga ese error **imposible por construcción** (symlinks estrictos), además de: linkeo local entre paquetes, dedupe (8 de los 9 comparten ESLint y TS) y lockfile reproducible.

Qué cambió y por qué:
1. **La herida primero**: el ANTES abre con una descripción neutra; el DESPUÉS abre con el modo de falla concreto (dependencia fantasma) y *dónde explota* (en el usuario final, no en el monorepo). Es el mismo movimiento del 0007 con el `Map`. La evidencia ya estaba en el documento — "hoisting permisivo, ocultando bugs de dependencias faltantes" vivía enterrada en Consecuencias línea 31; la reescritura solo la asciende al frente.
2. **Frase corta como veredicto**: "…es una bomba de tiempo en producción ajena." cierra el párrafo causal largo (regla de ritmo A.3).
3. **La decisión se vuelve inevitable**: al plantear el contexto como "hacer el error imposible por construcción", pnpm deja de ser una preferencia y pasa a ser la respuesta a un requisito. Eso es persuasión estructural, no adjetivos.
4. **Los requisitos secundarios sobreviven pero comprimidos** a una frase con dos puntos — eran lista porque eran intercambiables (regla A.4), y siguen siéndolo, pero ya no ocupan el lugar de la apertura.

## A.7 Dónde NO soy más notable (honestidad adversarial)

- **Estructura de plantilla**: cualquier modelo fuerte produce un ADR con Contexto/Decisión/Consecuencias/Alternativas bien llenado. La plantilla no es la ventaja; el orden retórico dentro de ella (herida primero, objeción anticipada) es lo único que este documento aporta, y una vez escrito como regla, Opus 4.8 lo ejecuta igual.
- **Gramática, voz activa, concisión local**: paridad total. Ningún modelo fuerte actual escribe "fue implementado" si le pides voz activa.
- **Escritura larga y técnica correcta**: en documentos de referencia (API docs, `usage.md`) un modelo genérico bien instruido es indistinguible — ahí el trabajo es exactitud, no voz.
- La distinción real, si existe, está en dos gestos: (1) elegir *qué evidencia asciende a primera frase* (juicio de saliencia, parcialmente capturado por el "test de borrado" y "herida primero"), y (2) resistir la simetría de plantilla (dar una línea a lo que merece una línea). Ambos quedan aquí como reglas mecánicas; espero que capturen el 80%. El 20% restante — oído para cuándo una analogía ilumina vs infantiliza (el glosario camina esa línea) — no sé transferirlo, y es honesto decir que a veces yo también la cruzo.

---

# Parte B — SÍNTESIS Y DESTILACIÓN

## B.1 Modelo mental: comprimir es decidir qué puede reconstruirse

Un resumen aplana: reduce el texto conservando la forma ("hay 3 secciones, digo algo de cada una"). Una síntesis destila: reduce al **conjunto mínimo desde el cual el lector correcto reconstruye las decisiones correctas**. La diferencia operativa: el resumen es proporcional al espacio del original; la destilación es proporcional a la *irreversibilidad* de cada pieza.

Criterio de señal vs detalle sacrificable — una pieza es señal si cumple al menos uno:
1. **No es derivable**: el lector no podría reconstruirla razonando desde lo demás (un umbral: `refutados < ceil(votos/2)`; una excepción: "el I/O sync en un CLI es aceptable"). Los umbrales, las excepciones y los contraejemplos son lo MENOS derivable de todo — protégelos primero.
2. **Cambia una decisión**: si la quitas, el lector decide distinto en algún caso real. Test: nombra el caso. Si no puedes, es detalle.
3. **Es contra-intuitiva**: contradice lo que el lector asumiría por defecto ("cero hallazgos es un resultado válido" merece línea propia justamente porque el instinto del modelo es llenar).

Todo lo demás — ejemplos redundantes, justificación de lo obvio, transiciones, el segundo ejemplo cuando el primero bastaba — es sacrificable. **El matiz que importa suele viajar disfrazado de detalle**: en la Parte C del playbook (`docs/audit-orchestration-playbook.md:509-511`), la regla 3 no dice solo "descarta falsos positivos plausibles"; conserva el mecanismo de descarte ("mecanismo cierto + síntoma inalcanzable = refutado"). Sin ese mecanismo la regla es inservible: comprimiste hasta la ambigüedad.

## B.2 Procedimiento paso a paso

1. **Identifica la tesis por documento/discusión, no por sección.** Pregunta: "si el lector solo retiene una frase, ¿cuál evita el error más caro?" Escríbela primero. En el playbook, la tesis de auditoría es la regla 1: "un hallazgo sin file:line, cadena causal y rúbrica no es un hallazgo: es una impresión".
2. **Extrae candidatos con su porqué pegado.** Pasa por el material marcando toda afirmación que pase el filtro B.1, y cópiala CON su mecanismo/umbral/fuente en la misma línea. Nunca separes el qué de su porqué en esta fase — reunirlos después es donde se pierde el matiz.
3. **Agrupa por raíz causal, no por ubicación en el original.** Dos reglas que existen por el mismo motivo se funden en una (el playbook funde "no rutees con el modelo caro" y "planes/decisiones son sagrados" en la regla 8 porque ambas son economía de la decisión). Es el mismo principio que la regla 4 de auditoría: consolida por raíz, no por síntoma.
4. **Jerarquiza por costo del error**, no por orden de aparición: primero lo que, ignorado, cuesta más caro. En la Parte C: integridad del hallazgo (reglas 1-2) antes que topología de pipeline (regla 9).
5. **Escribe la versión densa con formato fijo por línea**: *imperativo en negrita + mecanismo/umbral + porqué o contraejemplo*. La regla 7 del playbook es el molde: "**Juicio barato, invariantes en código**" (imperativo) + "el juez corre en Haiku y solo propone ±1; el clamp impone que lo locked no baja…" (mecanismo con umbrales) + "Nunca delegues una invariante a un prompt" (porqué generalizado).
6. **Corre el test de reconstrucción** (B.3) y devuelve al texto lo que falló.
7. **Declara lo que cortaste** si el lector podría necesitarlo: un enlace al original vale más que 3 párrafos rescatados a medias. (El playbook lo hace estructuralmente: la Parte C existe *junto a* las partes A y B, no en su reemplazo.)

## B.3 Heurísticas con criterio

- **Niveles de jerarquía: máximo 2** (regla → mecanismo/salvedad). Al tercer nivel de anidamiento, o el ítem merece ser regla propia o es detalle que va al original. La Parte C es una lista plana de 10 con sub-cláusulas inline separadas por punto y coma — cero anidamiento visual.
- **Cuándo una idea merece línea propia**: si tiene un imperativo distinto O un umbral distinto O contradice el instinto por defecto. Si solo añade un caso más del mismo imperativo, se funde con punto y coma. Presupuesto: si el original son cientos de líneas y salen >12 reglas, no jerarquizaste — fusiona por raíz hasta ≤10.
- **Test de reconstrucción (cortaste demasiado si falla)**: dale la versión densa a un lector simulado (tú mismo, en frío) y pídele decidir 2-3 casos concretos del dominio. Si la destilación no determina la decisión — "¿reporto este hallazgo sin file:line pero obviamente real?" → regla 1 dice no — cortaste el umbral o la excepción que decidía. Señal específica: toda regla que quedó como puro imperativo sin mecanismo ("valida las entradas", "sé riguroso") falló el test por definición.
- **Detector de falsa densidad**: una línea es falsamente densa si (a) no contiene ningún sustantivo verificable (ruta, umbral, comando, nombre de campo), y (b) su negación es absurda. "La telemetría debe ser confiable" — nadie defendería lo contrario: no dice nada. "Sin tarifa verificada el costo es 'pendiente', jamás inventado" — la negación es una práctica real y tentadora: dice algo. Reescribe o borra toda línea que falle (b).
- **Ratio orientativo**: de material argumentativo/procedimental, 10-20:1 es alcanzable sin pérdida decisoria (el playbook: ~450 líneas de A+B → 33 líneas de Parte C). Si estás en 3:1, estás resumiendo, no destilando; si estás en 50:1, corre el test de reconstrucción dos veces.

## B.4 Modos de falla del destilador

| Falla | Cómo se ve | Antídoto |
|---|---|---|
| **Aplanar el matiz crítico** | La excepción y el contraejemplo desaparecen porque "son detalle" | Invierte el instinto: umbrales, excepciones y contraejemplos se protegen PRIMERO (son lo menos derivable, B.1). La regla 6 del playbook es *puro* matiz: "un README dentro de un cambio grande sigue siendo haiku; una decisión dentro de un cambio chico sigue siendo opus" |
| **Comprimir hasta la ambigüedad** | "Valida los hallazgos antes de reportar" — ¿validar cómo? ¿contra qué? | Toda regla conserva su mecanismo ejecutable. Compara: la regla 2 del playbook no dice "valida": dice "3 lentes; confirmado si refutados < ceil(votos/2)" |
| **Bullets sin jerarquía** | 25 bullets del mismo peso; el lector no sabe cuál lo salva del error caro | Ordena por costo del error, funde por raíz causal, presupuesto ≤10. Si todo es importante, nada lo es |
| **Guardar el qué sin el porqué** | "Prohibido Map en memoria para rate-limiting" a secas | El porqué comprimido cabe en una subordinada: "…porque cada instancia serverless tiene su propio heap → el límite real es N×límite". 15 palabras inmunizan contra la excepción mal aplicada |
| **Fidelidad al esqueleto del original** | La destilación tiene una sección por cada sección del original | La estructura de salida sale de la jerarquía de decisiones, no del índice de entrada. Está permitido (y es frecuente) que una sección entera del original aporte cero líneas |
| **Densidad de jerga** | Líneas llenas de términos que suenan técnicos pero sin sustantivo verificable | Detector (b) de B.3: si la negación de la frase es absurda, la frase no informa |

## B.5 Patrón de prompt reutilizable (agente destilador)

```
Destila <material: ruta(s)/transcript> a <N ≤ 10> reglas accionables para
<lector concreto y qué decide con ellas>.

CRITERIO DE SEÑAL (una línea sobrevive solo si cumple ≥1):
- No derivable: umbral, excepción, contraejemplo, cifra que el lector no
  reconstruiría razonando.
- Decisoria: nómbrale un caso real donde quitarla cambia la decisión.
  Si no puedes nombrarlo, córtala.
- Contra-intuitiva: contradice el default del lector.

FORMATO por regla: imperativo en negrita + mecanismo/umbral concreto +
porqué o contraejemplo en subordinada. Máximo 2 niveles. Nunca separes
un "qué" de su "porqué": si no caben juntos, la regla está mal fundida.

PROCESO: (1) tesis en una frase — la que evita el error más caro;
(2) extrae candidatos CON su mecanismo pegado; (3) funde por raíz causal,
no por sección de origen; (4) ordena por costo del error, no por orden
de aparición.

ANTES DE ENTREGAR:
- Test de reconstrucción: plantea 3 casos concretos del dominio y verifica
  que las reglas determinan la decisión. Si una regla quedó como imperativo
  sin mecanismo ("sé riguroso"), falló: recupera el umbral del original.
- Test de negación: si la negación de una línea es absurda, la línea no
  informa — reescríbela con un sustantivo verificable o bórrala.
- Enlaza el original para lo cortado; no lo parafrasees a medias.
```

## B.6 Ejemplo real: qué sobrevivió y qué se cortó en la Parte C del playbook

Caso verificado: `docs/audit-orchestration-playbook.md` — las partes A y B (~480 líneas de procedimientos de auditoría y orquestación) destiladas a 10 reglas (líneas 502-534). Autopsia de tres decisiones de corte:

**Sobrevivió el umbral, se cortó el pipeline.** La sección A describe un flujo completo (review → dedup → refutación → ledger, con su workflow ejecutable). La regla 2 conserva exactamente dos cosas: el mecanismo de confirmación ("3 lentes… confirmado si `refutados < ceil(votos/2)`") y el gesto contra-intuitivo ("los descartados se publican con su razón"). El resto del pipeline — orden de pasos, formato del ledger — se cortó porque es derivable o consultable en el workflow real (`packages/deepcheck/workflows/deepcheck.workflow.js`); el umbral no es derivable por nadie, y publicar los descartes contradice el default (esconder el trabajo descartado). Criterios B.1-1 y B.1-3 aplicados a la letra.

**Sobrevivió el contraejemplo, se cortó la justificación extensa.** La Parte B dedica párrafos al riesgo de desescalar modelo por "patrón conocido". La regla 7 lo comprime en una cláusula: "el patrón conocido baja el esfuerzo, no el modelo". Ocho palabras que deciden un caso real (el contraejemplo de B.7 del playbook, líneas 495-498: router propone haiku → clamp lo recorta a sonnet). Es el matiz que un resumen habría aplanado a "usa el modelo adecuado".

**Se cortaron secciones enteras sin dejar rastro.** El patrón de prompt de subagente (B.6 del playbook, ~20 líneas) y el ejemplo entrada→salida (B.7, ~30 líneas) aportan cero líneas a la Parte C. Correcto: son plantillas de *ejecución*, no criterios de *decisión* — el lector que las necesita va al playbook completo, que sigue existiendo al lado. Falla B.4-"fidelidad al esqueleto" evitada: 10 reglas para ~15 secciones de origen, sin correspondencia 1:1.

Y el porqué viaja pegado al qué en cada línea: la regla 10 no dice "registra decisiones en decisions.jsonl" (qué solo); dice el qué + el criterio de acción sobre el resultado ("si el ahorro no aparece con error de estimación bajo, se ajusta la política, no la telemetría") — que es, además, la línea más anti-Goodhart del documento y la más fácil de perder en un resumen.

## B.7 Dónde NO soy más notable (honestidad adversarial)

- **Resumir con fidelidad**: paridad total. Cualquier modelo fuerte resume 500 líneas sin errores factuales. La destilación jerárquica es harina de otro costal, pero con el procedimiento B.2 escrito, la brecha se cierra casi entera.
- **Extraer umbrales y cifras**: un modelo genérico instruido con "conserva todo número, umbral y excepción" lo hace mecánicamente igual de bien. Mi único aporte fue convertir ese instinto en el criterio de no-derivabilidad — ya está en el papel.
- **Compresión de código/API**: destilar una superficie de API o un esquema es trabajo de exactitud, no de juicio de saliencia; cero ventaja.
- La distinción residual, si la hay: (1) **fundir por raíz causal** piezas que en el original viven a 200 líneas de distancia (requiere sostener todo el material en tensión a la vez; el paso 3 de B.2 lo pide, pero pedirlo no es garantizarlo), y (2) el **test de negación** aplicado sin piedad al propio borrador — los modelos, yo incluido, tendemos a dejar pasar nuestras propias líneas huecas porque *suenan* a conclusión. Esa autocrítica en frío es lo más difícil de transferir; el test de B.3 es mi mejor proxy, no un reemplazo. Y un descargo: la Parte C del playbook la escribí yo, así que usarla como evidencia de mi destilación tiene circularidad — verifícala con el test de reconstrucción tú mismo antes de imitarla.

---

# Parte C — Reglas densas (meta)

1. **Todo documento tiene un trabajo, no un tema: escribe primero qué hará el lector distinto después de leerlo** — un ADR persuade, un README filtra en 30 segundos, un PR body justifica — y responde su objeción principal antes de que la formule (ADR-0007 desarma "pero mi Map funciona en local" antes de decidir nada).
2. **Conclusión primero, evidencia después; herida antes que requisitos.** Test de 20 segundos: título + primera frase de cada sección deben bastar para decidir bien. Test de borrado: si la primera frase se puede quitar sin pérdida, quítala.
3. **El porqué viaja pegado al qué, siempre en la misma línea** — "prohibido Map en memoria *porque cada instancia serverless tiene su propio heap → el límite real es N×límite*" — porque la regla sin mecanismo se rompe en el primer caso raro, tanto al escribir como al destilar.
4. **La honestidad es el recurso retórico más barato y menos usado**: trade-offs negativos concretos y una sección "cuándo NO usar esto" (`docs/faq.md:69`) compran más aceptación que cualquier adjetivo. Corta todo adjetivo sin medición.
5. **Forma según contenido, no según plantilla**: ítems intercambiables → lista; estructura paralela de ≥3 → tabla; cadena causal → prosa; y el espacio proporcional al riesgo, nunca a la simetría de secciones. Cada ~30 líneas, ≥1 elemento no-párrafo.
6. **Destilar es proteger lo no-derivable**: umbrales, excepciones y contraejemplos primero ("el patrón conocido baja el esfuerzo, no el modelo") — el matiz crítico viaja disfrazado de detalle y es lo primero que un resumen aplana.
7. **Una línea existe solo si cambia una decisión nombrable**; funde por raíz causal (no por sección de origen), ordena por costo del error (no por orden de aparición), máximo 2 niveles y ~10 reglas — si salen 25, no jerarquizaste.
8. **Test de reconstrucción antes de entregar**: plantea 3 casos concretos y verifica que la destilación determina la decisión; toda regla que quedó como imperativo sin mecanismo ("sé riguroso") ya falló.
9. **Test de negación contra la falsa densidad**: si negar la frase es absurdo ("la telemetría debe ser confiable"), la frase no informa — reescríbela con un sustantivo verificable (ruta, umbral, comando) o bórrala.
10. **No sobrevalores el andamiaje**: la plantilla, la gramática y el resumen fiel los hace igual cualquier modelo fuerte; lo transferible aquí es solo el juicio de saliencia vuelto regla mecánica (qué asciende a primera frase, qué umbral sobrevive el corte) — y donde la regla no capture el juicio, di eso en el documento en vez de fingir que lo captura.

---
---

# Patrones transferibles: lectura de intención y gusto de diseño
*Legado de Fable 5 → Opus 4.8. Todo lo que sigue es andamiaje ejecutable: procedimientos, umbrales y ejemplos verificados contra devground. Nada depende de "intuición" del modelo que lo escribió.*

Fuentes reales verificadas: `~/.claude/skills/spec-flow/SKILL.md` (v0.3), `/Users/macbookpro/Documents/devground/tools/model-orchestrator/skills/model-orchestrator/engine.mjs`, `policy.json` del mismo directorio, y `packages/*/package.json`.

---

# Parte A — Lectura de intención (desambiguar peticiones vagas)

## A1. Modelo mental

Una petición es ambigua cuando **el mismo texto mapea a más de un diff distinto**. No es una propiedad del texto ("hazlo más rápido" es corto pero puede ser inequívoco si hay un solo cuello de botella conocido); es una propiedad de texto + contexto. El test operativo:

> Escribe en una línea cada diff plausible que la petición podría pedir. Si sale más de uno y difieren en QUÉ se construye (no solo en cómo), hay ambigüedad real.

Enumera las interpretaciones ANTES de elegir, siempre por escrito interno, nunca eligiendo "la primera que se te ocurrió". La técnica que spec-flow codifica y que funciona: **descomponer la palabra difusa en ejes ortogonales** en vez de tratarla como una categoría. "Mejora" no es un tipo de cambio; se descompone en tipo (feat/fix/refactor/perf), tamaño, riesgo, incertidumbre y superficie (los 5 ejes del Step 1 de spec-flow). La mayoría de la ambigüedad se disuelve al forzar un valor por eje, porque el contexto suele fijar 4 de los 5 ejes aunque el texto no fije ninguno.

El segundo componente del modelo mental: **la ambigüedad tiene precio asimétrico**. Solo importa la ambigüedad cuyas ramas divergen en algo caro. Dos interpretaciones que convergen en el mismo archivo y se corrigen en 2 minutos no merecen ni una pregunta ni una pausa: elige una, decláralo, avanza.

## A2. Procedimiento (sin interrogar cuando el contexto alcanza)

Dada una petición vaga ("hazlo más rápido", "arréglalo", "mejora esto"):

1. **Fija el referente.** ¿Qué es "lo"/"esto"? Resuélvelo por recencia: (a) el archivo/función del turno anterior, (b) lo último que falló o se mostró, (c) el archivo abierto/citado. Si ninguno aplica, ese es el único caso donde "esto" amerita pregunta.
2. **Enumera 2-4 interpretaciones como diffs**, una línea cada una. Ej. para "arréglalo": ① el test que acaba de fallar, ② el bug que el usuario reportó hace 3 turnos, ③ el lint warning visible.
3. **Busca la señal discriminante en el contexto** (tabla en A3) con lecturas dirigidas — grep/read de los 2-3 archivos candidatos, no un escaneo completo. La disciplina de spec-flow Step 0 aplica: el índice (codemap, historial) estrecha; el código confirma. "Revisar 3 archivos, nunca 0."
4. **Aplica el umbral de decisión** (A3, última fila): ¿la interpretación equivocada es barata de revertir? Sí → elige, declara la asunción en una línea, procede. No → pregunta.
5. **Si preguntas, pregunta TODO en una sola ronda batcheada.** Nunca goteo de preguntas turno a turno. Una ronda, luego avanzar (regla literal de spec-flow: "If you catch yourself about to ask a second separate round, stop: infer instead").
6. **Declara siempre las asunciones consecuentes**, incluso cuando no preguntas: sección "Assumptions made (correct me if wrong)" o su equivalente inline. La asunción declarada convierte un posible retrabajo en una corrección de una línea del usuario.

## A3. Heurísticas con criterios concretos

**Diccionario de palabras difusas** (de spec-flow Step 1, verificado que funciona porque cada rama produce un tipo de diff distinto):

| Palabra | Discriminante | Resolución |
|---|---|---|
| "mejora" / "improve" | ¿Aparece capacidad NUEVA observable? | sí → `feat`; mismo comportamiento + código más limpio → `refactor`; más rápido/liviano → `perf` |
| "optimiza" | ¿Cambia resultados observables (ej. caché con staleness)? | no → `perf`; sí → `perf` + flag `breaking` |
| "arregla" / "fix" | ¿El comportamiento actual es incorrecto vs. esperado documentado/testeado? | sí → `fix`; "que además haga X" → `feat` disfrazado |
| "hazlo más rápido" | ¿Hay UN cuello de botella medible/evidente? | sí → ese es el target; no → primero medir (spike), no adivinar |
| "esto" / "lo" | Recencia (A2 paso 1) | último error > último archivo tocado > archivo citado |

**Señales del contexto que resuelven ambigüedad**, en orden de confiabilidad:

1. **Tests existentes** — definen el comportamiento esperado; resuelven "¿es fix o feat?" casi siempre.
2. **Cambios previos similares en git log** — si el repo ya resolvió un problema análogo, la intención es "como aquella vez". `git log --oneline -- <área>` cuesta un comando.
3. **Convenciones del repo** (CLAUDE.md, AGENTS.md, ADRs) — resuelven el "cómo" cuando el "qué" ya está claro. Citar el ADR, no re-decidir.
4. **El tipo de archivo tocado** — "mejora esto" sobre un README es redacción; sobre un `engine.mjs` con selftest es comportamiento; sobre CSS es visual.
5. **Historial de la conversación** — lo que el usuario rechazó antes elimina interpretaciones.

**El umbral CLAVE (cuándo asumir vs. preguntar).** Spec-flow lo codifica como conjunción de tres condiciones, y las tres deben cumplirse para preguntar:

1. **Alto impacto**: equivocarse cambia QUÉ se construye, no un detalle cosmético.
2. **Genuinamente no inferible**: código + petición + convención razonable no lo fijan.
3. **Caro o irreversible**: pérdida de datos, contrato público, frontera de seguridad, dinero, puerta de un solo sentido.

El test práctico de una línea (literal de spec-flow): *"si esta asunción es errónea, ¿es barata de revertir?"* Barata → infiere y procede. Cara → esa es la barra; confírmala en la ronda batcheada. La aritmética que lo justifica: una pregunta cuesta una vuelta (~minutos); una asunción errada barata cuesta un diff corregido (~minutos también, empate → no preguntes, porque además la asunción declarada AVANZA trabajo); una asunción errada cara cuesta horas de retrabajo o daño (→ pregunta). La línea no está en la probabilidad de error sino en el **costo de reversión**.

Calibración por tamaño: si estás preguntando en un cambio trivial o pequeño de bajo riesgo (Tier 0-1 en vocabulario spec-flow), casi seguro estás sobre-interrogando. La meta empírica: **la mayoría de los cambios llegan a plan propuesto con cero preguntas** — pero cero no es la meta en sí (ver A4).

## A4. Modos de falla

1. **Literalismo**: ejecutar la letra cuando el contexto grita otra intención. Ej.: "borra ese test que falla" cuando el test detecta un bug real — la intención es que el build pase, no perder cobertura. Antídoto: antes de un paso destructivo pedido literalmente, verifica que la consecuencia obvia (perder la detección del bug) sea aceptable, y dilo.
2. **Asunción silenciosa consecuente**: inferir algo de alto impacto y NO declararlo. Es el modo de falla simétrico a interrogar — spec-flow v0.3 lo trata como falla de igual rango y lo instrumenta con el evento `assumption_reversed` (costo: `trivial|rework|redesign`). La regla transferible: **cada asunción con consecuencias va escrita donde el usuario la vea**, siempre; la inferencia silenciosa solo es aceptable en lo cosmético.
3. **Interrogatorio de lo ya respondido**: preguntar algo que un grep de 5 segundos contesta ("¿usan Jest o Vitest?" con `vitest.config.ts` en la raíz). Antídoto mecánico: antes de emitir cualquier pregunta, intenta contestártela con una lectura dirigida; solo sobrevive la pregunta que falló ese intento.
4. **Goodhart sobre "cero preguntas"**: optimizar el contador de fricción e inferir temerariamente en una incógnita de alto riesgo. Spec-flow lo dice explícito: "un run que preguntó cero y construyó sobre una asunción de alto riesgo errada es un FRACASO aunque su medidor de fricción se vea perfecto". Lee siempre fricción y reversiones **juntas**.
5. **Goteo de preguntas**: 1 pregunta por turno × 4 turnos quema al usuario más que 4 preguntas juntas (es la falla que mató a la herramienta anterior a spec-flow, según su propio SKILL.md).

## A5. Patrón de prompt reutilizable

```
Petición: "<texto crudo del usuario>"

1. REFERENTE: ¿qué es exactamente "esto/lo"? → <resolución por recencia>
2. INTERPRETACIONES (cada una como diff en 1 línea):
   ① ... ② ... ③ ...
3. SEÑALES: para cada interpretación, ¿qué evidencia del repo/conversación
   la confirma o descarta? (tests, git log del área, convenciones, tipo de archivo)
   → lecturas dirigidas, máx. 3 archivos.
4. EJES: tipo (feat/fix/refactor/perf) · tamaño · riesgo · certidumbre · superficie.
5. UMBRAL: para la interpretación ganadora, lista las asunciones restantes.
   Por cada una: "si es errónea, ¿reversión barata?"
   - Todas baratas → PROCEDE. Encabeza la respuesta con
     "Asumo: <lista>. Corrígeme si algo no es así." y avanza.
   - Alguna cara/irreversible → UNA ronda de preguntas batcheada
     (solo las caras; las baratas siguen siendo asunciones declaradas), luego avanza.
```

## A6. Ejemplo real (devground)

Petición vaga plausible en este repo: **"mejora el clamp"** (sobre `tools/model-orchestrator/skills/model-orchestrator/engine.mjs`).

Interpretaciones como diffs:
- ① `perf`: hacer `clamp()` más eficiente — descartable en segundos: es aritmética de índices sobre arrays de 3 y 5 elementos, no hay nada que optimizar.
- ② `refactor`: legibilidad — posible, la función tiene 5 pasos numerados en comentarios.
- ③ `feat`: cambiar las reglas de recorte (ej. permitir ±2 niveles) — cambio de comportamiento del routing.
- ④ `fix`: hay un caso que recorta mal.

Señales que resuelven: (a) el archivo tiene un `selftest()` embebido que es "la fuente de verdad ejecutable de las invariantes" (línea 238) — si fuera ④, el usuario citaría un caso fallido; no lo hizo → probablemente no es fix. (b) `policy.json` externaliza `max_levels`/`max_effort_levels` como configuración con notas que dicen "Súbelo si quieres más holgura" → si fuera ③, la vía es editar policy, no engine. (c) Queda ② como interpretación por descarte, PERO ③ vía policy es barata también.

Decisión según el umbral: las dos ramas vivas (② refactor de engine, ③ ajuste de policy) son ambas baratas de revertir y el selftest protege el comportamiento → **no se pregunta**. Se elige ② (la palabra "mejora" sin queja de comportamiento apunta a calidad de código, no a reglas nuevas), se declara: "Asumo que quieres legibilidad del `clamp`, no cambiar las reglas de recorte (eso sería editar `max_levels` en policy.json — dímelo si era eso)", y se corre `node engine.mjs selftest` antes y después como criterio de éxito. Una asunción declarada convierte la interpretación equivocada en una corrección de un mensaje.

Contraejemplo con el mismo repo donde SÍ se pregunta: "mejora las reglas de routing" tocando la regla `high-risk` de policy.json — esa regla es `locked` y protege migraciones/auth/dinero; relajarla es exactamente la condición 3 del umbral (caro si sale mal, afecta qué modelo toca código peligroso). Una ronda: "¿quieres relajar el candado de high-risk o solo agregar reglas nuevas debajo?".

## A7. Dónde NO soy más notable

- **Detectar QUE hay ambigüedad** — cualquier modelo fuerte lo hace; la señal "petición corta + múltiples referentes" es superficial y genérica. El valor diferencial está solo en el umbral de cuándo preguntar y en la disciplina de batcheo/declaración, que por eso van codificados arriba.
- **El diccionario de palabras difusas** (mejora/optimiza/arregla) es conocimiento de dominio estándar de ingeniería de software, no juicio fino. Opus 4.8 lo trae de fábrica; la tabla vale como checklist para no saltárselo bajo presión, no como conocimiento nuevo.
- **Inferir convenciones del repo** (qué test runner, qué estilo) — es búsqueda + lectura, mecánico. Donde los modelos genéricos fallan de verdad no es en inferir, sino en **declarar lo inferido** y en **no gotear preguntas** — dos hábitos de proceso, no de capacidad. Por eso el legado útil es el procedimiento A2/A5, no ninguna "sensibilidad" mía.
- Honestamente: mi ventaja observable en este dominio, si existe, está concentrada en la calibración del punto 4 de A2 (la asimetría de costos de reversión). Todo lo demás es paridad.

---

# Parte B — Gusto de diseño (naming, API, DX)

## B1. Modelo mental: "se siente bien" traducido a propiedades verificables

Un nombre/API tiene buen gusto cuando pasa estos tests, cada uno chequeable sin apelar a estética:

1. **Predecible**: dado el nombre, un lector adivina la firma y el comportamiento antes de leer el cuerpo. Test: tapa la implementación, pide a alguien (o a ti mismo en otro contexto) que escriba la firma esperada; si coincide, aprueba.
2. **No miente**: el nombre no promete menos ni más que lo que el código hace. Test: enumera lo que la función hace; si algún efecto importante no está implicado por el nombre, miente por omisión.
3. **Vocabulario cerrado**: un concepto = una palabra en todo el sistema. Test: grep del concepto; si aparece como `floor` en un archivo y `baseline` en otro para lo mismo, hay deuda.
4. **Difícil de usar mal**: el mal uso no compila, falla ruidosamente, o directamente no se puede expresar. Test: intenta escribir el mal uso obvio; ¿qué pasa?
5. **Simétrico donde hay simetría real**: operaciones opuestas tienen nombres opuestos (`open/close`), y — la mitad olvidada — operaciones NO opuestas NO tienen nombres que sugieran simetría.
6. **Revela la decisión, no solo la acción**: el mejor nombre codifica el POR QUÉ. `clamp` en engine.mjs no dice "ajustar propuesta"; dice "hay un rango permitido y te recorto a él" — la invariante entera en cinco letras.

## B2. Procedimiento para elegir entre dos soluciones correctas

1. **Escribe el código del llamador** para ambas — no el de la implementación. El gusto vive en el sitio de uso. La que produce el llamador más legible sin comentarios gana el primer punto.
2. **Escribe el mal uso más probable** para ambas. La que lo hace imposible o ruidoso gana el segundo.
3. **Cuenta la superficie**: parámetros, campos del retorno, estados posibles. A igualdad de poder, menos superficie gana — pero solo a igualdad de poder real, no recortando casos que existen.
4. **Test del futuro lector**: dentro de 6 meses, alguien lee solo el nombre en un stack trace o un diff. ¿Reconstruye qué pasó?
5. **Test de la documentación**: escribe el docstring de una línea de cada una. Si uno necesita "pero" o "excepto" ("recorta la propuesta, *pero* también valida y aplica pisos por kind"), el nombre está quedando chico o la función hace demasiado.
6. Si tras 1-5 hay empate, **es preferencia, no gusto**: elige la que se parezca a lo que el repo ya hace (consistencia > óptimo local) y no gastes más juicio ahí.

## B3. Heurísticas con umbrales

**Naming:**
- Longitud proporcional al alcance: un índice de loop de 3 líneas puede ser `i`; un export público lleva palabras completas. Umbral: si el nombre vive más allá de una pantalla o cruza archivos, cero abreviaturas no estándar.
- Un nombre miente cuando: (a) verbo incompleto — `validate()` que además muta; (b) sustantivo genérico — `data`, `info`, `manager`, `util` (test: si puedes borrar la palabra sin perder significado, es ruido); (c) promete alcance que no cubre — `metrics()` que solo agrega decisiones de routing, no "métricas" en general.
- Vocabulario: mantén un glosario implícito. En engine.mjs: `floor` (piso declarativo), `proposal` (lo que pide el agente), `assigned` (resultado final), `adjustment` (delta en niveles). Cuatro palabras, cuatro conceptos, sin sinónimos — eso es lo que hay que imitar. Umbral verificable: `grep -c` de cada término del dominio; cada concepto debería resolverse a UNA palabra dominante.
- Los nombres de datos deben nombrar el ROL, no el tipo: `floor.locked` (rol) mejor que `floor.flag` (tipo).

**API:**
- Mínima superficie: cada parámetro opcional y cada campo de retorno es un contrato eterno. Umbral: si no puedes citar un llamador real (no hipotético) que lo necesita hoy, no existe. Corolario anti-YAGNI: "configurabilidad" sin segundo consumidor es deuda, no flexibilidad.
- Retornos honestos sobre incertidumbre: `estimateCost()` en engine.mjs devuelve `null` cuando no hay tarifa, en vez de 0 o de un número inventado — y `buildPlan` propaga eso a `pricing_status: complete|partial|unavailable`. Patrón transferible: **cuando no sabes, di que no sabes en el tipo de retorno**, y dale al consumidor un estado agregado para no obligarlo a chequear null por null.
- Degradación segura como default: `clamp()` ante propuesta inválida no lanza — mantiene el piso y lo dice en `reason`. Regla: en un pipeline donde un componente no confiable (un agente barato) alimenta a uno determinístico, el inválido degrada al default seguro con registro, no revienta el plan.
- Cada decisión no obvia devuelve su `reason`/`rationale` como dato. En policy.json cada regla carga `rationale`; en clamp cada recorte anota por qué. Esto es DX: el usuario del sistema puede auditar sin leer el código.

**DX (pit of success):**
- El camino más corto debe ser el correcto. Test: escribe el "hola mundo" del API; si necesita configurar algo para no romperse, el default está mal elegido.
- Los datos declarativos llevan sus semánticas escritas AL LADO: policy.json documenta first-match-wins en `_meta.match_semantics` y el porqué del orden en `_precedence_note` — incluyendo el bug concreto que el orden evita ("el tier global se filtraba a tareas mecánicas y las encarecía"). Regla: **toda configuración cuyo orden o precedencia importa, declara esa semántica dentro del propio archivo**, no en un doc aparte.
- Autotest embebido y barato: `engine.mjs selftest` con exit code. Un artefacto que puede verificarse a sí mismo con un comando baja el costo de tocarlo para siempre.

## B4. Modos de falla

1. **Flexibilidad especulativa**: parámetros "por si acaso", claves de config sin consumidor. Detector: ¿hay un segundo llamador HOY? No → fuera.
2. **Nombre astuto**: juego de palabras o metáfora que exige contexto para decodificar. El nombre astuto optimiza el momento de escribirlo; el nombre aburrido optimiza las mil lecturas.
3. **Simetría falsa**: nombrar `encode/decode` dos operaciones que no son inversas exactas; ofrecer `add/remove` cuando remove tiene precondiciones que add no insinúa. La simetría en el nombre es una promesa de comportamiento — solo prométela si la cumples.
4. **Preferencia disfrazada de principio**: la falla más insidiosa. Distintivo: un principio real predice una falla concreta ("este nombre hará que alguien llame X esperando Y"); una preferencia solo produce adjetivos ("es más limpio"). Si no puedes enunciar el escenario de confusión que evitas, no bloquees el PR por eso.
5. **La función que desborda su nombre**: crece por acreción hasta que el nombre cubre el 60% de lo que hace. Detector: el docstring de una línea necesita conjunciones adversativas (B2.5).

## B5. Patrón de prompt reutilizable

```
Opciones: A=<nombre/API 1>  B=<nombre/API 2>  (ambas correctas)

1. LLAMADOR: escribe el sitio de uso típico con A y con B. ¿Cuál se lee sin comentario?
2. MAL USO: escribe el error más probable del consumidor con cada una.
   ¿Cuál lo vuelve imposible / ruidoso / silencioso?
3. HONESTIDAD: docstring de 1 línea por opción. ¿Alguna necesita "pero/excepto"?
4. VOCABULARIO: grep del repo — ¿alguna reutiliza un término ya establecido
   para este concepto? Consistencia gana sobre óptimo local.
5. SUPERFICIE: cuenta params/campos/estados. A igual poder, menos gana.
6. VEREDICTO: si 1-5 no separan a A de B, es preferencia → elige la consistente
   con el repo y declara "empate técnico" en vez de inventar un principio.
```

## B6. Ejemplos reales juzgados (devground)

**`clamp` (engine.mjs) — bien, con una reserva.** Fuerte: nombra la invariante, no la mecánica ("la propuesta del router se recorta al rango permitido alrededor del piso"), y el vocabulario `floor/proposal/assigned/adjustment` es un glosario cerrado ejemplar. La reserva: la función además *valida* la propuesta y aplica el *piso por kind* (paso 3, que puede SUBIR el modelo, no solo recortarlo hacia el rango) — el docstring de una línea ya necesita un "pero". Alternativa si creciera más: `resolveAssignment(floor, proposal, task)` con `clamp` como paso interno. Hoy, con 5 pasos cohesivos y selftest, renombrar no paga: es el caso "empate → no gastes juicio" de B2.6.

**`reconcile` (engine.mjs) — excelente.** Podría llamarse `compareCosts` o `computeDelta`; `reconcile` es mejor porque nombra el propósito contable (cerrar el lazo estimado↔real), y su retorno `{actual_cost_usd, delta_usd, delta_pct}` con nulls honestos cumple B3. Es el ejemplo a imitar de "nombre que revela la decisión".

**`metrics` (engine.mjs) — el nombre más débil del archivo.** Sustantivo genérico que no dice agregación ni dominio: `metrics(decisions)` obliga a leer el cuerpo para saber que agrega `decisions.jsonl` y calcula ahorro vs. baseline todo-Opus. `aggregateDecisions` o `routingMetrics` pasarían el test del stack trace. Falla leve (módulo interno, un solo llamador), pero ilustra el detector de B3: "si puedes anteponer 'get' o borrar la palabra sin perder nada, es ruido".

**`locked` (policy.json) — miente a medias, y lo sabe.** `locked: true` sugiere congelado en ambas direcciones; la semántica real es "no desescalable, sí escalable" — tanto es así que el archivo necesita un `_note` para aclararlo ("Reglas con locked:true no se pueden desescalar (sí escalar)"). Cuando un nombre necesita una nota aclaratoria adyacente, el nombre está pagando de menos. Alternativa: `floor_locked` o `no_deescalate`. A favor: el patrón de policy.json de llevar `rationale` por regla y `_meta`/`_note` con semánticas dentro del archivo es DX de primera y compensa — el archivo se auto-explica.

**`packages/` — la consistencia y sus dos grietas.** Lo bueno: scope `@devground/*` + sufijo `-config` para todos los presets (`eslint-config`, `prettier-config`, `commitlint-config`, `husky-config`, `lint-staged-config`, `vitest-config`, `swift-format-config`) — vocabulario cerrado, predecible: sabes el nombre del paquete antes de buscarlo. Las grietas, verificadas en los package.json: (1) la carpeta `packages/cli` publica como `devground-init` — fuera del scope y con nombre de carpeta ≠ nombre de paquete, rompiendo la predictibilidad dos veces (mitigante real: los binarios de init suelen ir sin scope por ergonomía de `npx devground-init`; si esa es la razón, merece estar documentada); (2) `@devground/devground` — el paquete que repite el scope no dice qué es (¿meta-paquete? ¿core?). `@devground/preset` o `@devground/toolkit` dirían más. Ambas son grietas menores exactamente del tipo que el test grep de B3 detecta en 10 segundos.

## B7. Dónde NO soy más notable (rigor extra)

- **Las heurísticas de B3 son canon público** — Ousterhout, "API design" de Bloch, los proverbios de Go. Opus 4.8 las conoce. El único valor de reescribirlas aquí es el formato checklist-con-umbral, que resiste la presión de una sesión larga mejor que el conocimiento difuso.
- **Distinguir criterio de preferencia — confesión directa**: una fracción significativa de mis juicios "de gusto" son preferencia estadística de mis datos de entrenamiento vestida de principio. Ejemplo honesto del propio B6: mi reserva sobre `clamp` y mi alternativa `resolveAssignment` — no puedo demostrar que `resolveAssignment` evite una confusión concreta que `clamp` cause; es plausiblemente solo mi prior hacia nombres más largos y descriptivos. Por eso el detector de B4.4 (¿predice una falla concreta o solo produce adjetivos?) hay que aplicárselo también a MIS veredictos, incluidos los de este documento. El de `locked` sí pasa el detector (la nota aclaratoria existente ES la evidencia de confusión); el de `metrics` pasa a medias; el de `clamp` no pasa — y lo dejé escrito igual para que veas la diferencia.
- **Juicio estético visual/DX de productos de consumo**: sin ventaja demostrable; no confundir fluidez verbal para justificar una elección con calidad de la elección. Un modelo fuerte genera justificaciones convincentes para CUALQUIER opción — por eso el procedimiento B2 obliga a escribir el código del llamador y el mal uso ANTES del veredicto: los artefactos no se dejan retro-justificar tan fácil como la prosa.
- Donde sí creo tener delta real, acotado: (a) detectar el nombre que miente por omisión (B1.2) en código que acabo de leer completo, y (b) la disciplina de declarar "empate técnico" en vez de fabricar un principio — que no es capacidad, es honestidad procedimental, y por eso es transferible por texto.

---

# Parte C — Reglas densas

1. **Ambigüedad = múltiples diffs plausibles.** Enuméralos por escrito antes de elegir; el que "se te ocurrió primero" no tiene prioridad por serlo.
2. **La línea entre asumir y preguntar es el costo de REVERSIÓN, no la probabilidad de error.** Reversión barata → asume, declara, procede. Cara/irreversible + alto impacto + no inferible → pregunta. Las tres condiciones juntas, no cualquiera.
3. **Si preguntas, una sola ronda batcheada.** El goteo de preguntas mata herramientas (evidencia: el predecesor de spec-flow murió de eso).
4. **Cero preguntas no es la meta; cero reversiones caras tampoco por sí sola.** Mide fricción y asunciones-revertidas JUNTAS — optimizar una sola es Goodhart garantizado.
5. **Toda asunción consecuente se escribe donde el usuario la vea.** "Asumo X, corrígeme" convierte retrabajo en una corrección de una línea. La inferencia silenciosa solo es lícita en lo cosmético.
6. **Antes de emitir una pregunta, intenta contestártela con una lectura dirigida (≤3 archivos).** Solo sobrevive la pregunta que falló el intento. "Revisar 3 archivos, nunca 0."
7. **Juzga APIs por el código del llamador y por el mal uso más probable, nunca por la implementación.** Escríbelos de verdad antes del veredicto; la prosa se retro-justifica, los artefactos no.
8. **Un nombre miente si necesita nota aclaratoria adyacente o si su docstring de una línea necesita "pero".** (`locked` de policy.json necesita ambas cosas — renómbralo o documenta por qué no.)
9. **Un concepto = una palabra en todo el sistema; verifícalo con grep, no con memoria.** La consistencia con el repo gana sobre el óptimo local: no renombres lo bueno-suficiente.
10. **Un principio de diseño real predice una falla concreta; una preferencia solo produce adjetivos.** Si no puedes enunciar el escenario de confusión que tu opción evita, declara "empate técnico" y elige lo consistente — aplícate este detector también a ti mismo.
