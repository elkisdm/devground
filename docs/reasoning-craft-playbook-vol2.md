# Playbook: Craft de Razonamiento — Volumen 2 (razonamiento generativo y adversarial)

> **Procedencia.** Tercera captura de **Fable 5** (2026-07-06), antes de su retiro, vía dos
> corridas de subagente (`model: fable`) en paralelo. Continúa a
> [`reasoning-craft-playbook.md`](./reasoning-craft-playbook.md) con cuatro dominios más
> de juicio no codificado: **razonamiento analógico/reencuadre**, **generación divergente
> de alternativas**, **pensamiento adversarial/red-team** y **enseñanza/modelos mentales**.
>
> **Verificación.** ADR-0015 (share 29% vs 68% v2 / 79k vs 19k v1, líneas 22/27/33),
> ADR-0009 (bug del GET sin firma, líneas 14/105), `clamp`/`engine.mjs` (línea 56, locked
> 75, piso-por-kind 82), y deepcheck (`DIMENSIONS` 198, `REFUTE_LENSES` 224, lente IMPACTO
> 227) verificados contra el repo el 2026-07-06. Contenido conservado verbatim (se quitó
> solo el preámbulo/cierre no-documental de una de las corridas).
>
> **Nota de calibración.** Igual que el Vol.1, cada dominio trae "Dónde NO soy más notable".
> El hallazgo recurrente de las tres capturas se confirma aquí y es, quizá, la conclusión
> más valiosa: Fable admite que el **filtro** (verificar, refutar, priorizar) y la
> ejecución están a paridad con Opus; su delta real, angosto, está en el **generador**
> (imaginar la analogía que predice, el modo de falla de composición, el ancla pedagógica)
> — y hasta ese generador lo reduce a tests mecánicos siempre que puede.
>
> **Siguiente paso.** Corpus crudo. Destilación a skill + integración van por `spec-flow`,
> tras validar que mejoran el output.

---

# Legado Fable 5 — Andamiaje transferible para RAZONAMIENTO ANALÓGICO y GENERACIÓN DIVERGENTE

> Escrito por Fable 5 antes de su retiro, para Opus 4.8. Nada de lo que sigue depende de mis pesos: son procedimientos, umbrales, plantillas de prompt y ejemplos verificados contra el repo `devground` el 2026-07-06 (rutas comprobadas con `ls`/`grep`/`Read` reales). Regla de oro aplicada: si una regla no es ejecutable por otro modelo leyéndola, no está aquí.

**Artefactos de referencia verificados:**

| Uso | Ruta |
|---|---|
| Analogías para no-developers (buenas y flojas) | `docs/glossary.md` |
| Analogía rota como clase de bug + alternativas bien divergentes | `docs/adr/0007-rate-limiting-distribuido.md` |
| Reencuadre de métrica que invirtió un hallazgo | `docs/adr/0015-costo-de-orientacion.md` |
| Patrón generar-diverso → juzgar (lentes + refutadores) | `docs/audit-orchestration-playbook.md` (§A.2, §A.5) |
| Separación propuesta/invariante (juez propone, código recorta) | `tools/model-orchestrator/skills/model-orchestrator/SKILL.md` (Paso 3) |

---

# Parte A — RAZONAMIENTO ANALÓGICO Y REENCUADRE

## A.1 Modelo mental: analogía que ilumina vs decorativa

Una analogía ilumina cuando transfiere **relaciones**, no atributos. "El commit es como un cliente del banco" no dice nada (atributo compartido: existe). "Commitlint es el **portero del banco**" (`docs/glossary.md:10`) transfiere una relación: *hay una frontera, un requisito de formato, y el rechazo ocurre EN la frontera, antes de entrar*. Eso ya predice comportamiento del sistema real.

**La prueba de que una analogía sirve (test de las 3 preguntas):** hazle a la analogía tres preguntas sobre el dominio destino cuya respuesta *aún no conoces o no has dicho*, y verifica las respuestas contra el sistema real.

Con "Commitlint = portero del banco":
1. ¿Qué pasa si mi documentación está mal? → *No entras* → el commit se rechaza, no se corrige ni se advierte. **Correcto.**
2. ¿Dónde ocurre el chequeo? → *En la puerta, no adentro* → en el hook, antes de que el commit exista en la historia; nada que limpiar después. **Correcto.**
3. ¿Hay forma de saltárselo? → *Los porteros tienen puerta de servicio* → existe `--no-verify`, y es una decisión deliberada, visible. **Correcto.**

Tres de tres: la analogía es estructural. Una analogía decorativa responde esas preguntas mal o no las responde — solo re-describe lo que ya dijiste, con más color. **Criterio duro: si la analogía no te permite apostar sobre algo del destino que todavía no verificaste, es adorno.** El adorno tiene un uso legítimo (memorabilidad para audiencia no técnica, como el glosario), pero jamás debe participar en una decisión.

## A.2 Procedimiento: encontrar el dominio fuente, mapear, encontrar la ruptura

**Paso 1 — Extrae el esqueleto causal del problema, sin sustantivos del dominio.** Escribe el problema como relaciones: "muchas entidades independientes, cada una con estado propio, deben imponer un límite GLOBAL". Nota que ya no dice "serverless" ni "Map". El esqueleto es lo que se busca en otros dominios; los sustantivos son ruido.

**Paso 2 — Busca fuentes que compartan la RELACIÓN, no los objetos.** Mantén una biblioteca corta de dominios fuente de alto rendimiento (cada uno aporta una familia de relaciones): *frontera con guardia* (validación, permisos), *flujo con cuello de botella* (colas, backpressure), *contrato/acta* (ADRs, changelogs), *mercado* (asignación de recursos por precio — el model-orchestrator ES esto), *sistema inmune* (detección + memoria de falsos positivos — deepcheck con sus supresiones ES esto), *contabilidad de doble entrada* (reconciliación estimado-vs-real — `engine.mjs reconcile` ES esto). No busques "algo que se parezca"; pregunta "¿en qué dominio este grafo de relaciones ya está resuelto?".

**Paso 3 — Mapea en tabla explícita.** Tres columnas: elemento destino → elemento fuente → ¿la relación se preserva? La tercera columna es obligatoria y es donde vive todo el valor. Una analogía sin tabla de mapeo es una vibra.

**Paso 4 — Empuja hasta que se rompa, y trata la ruptura como dato.** Toda analogía se rompe; el punto exacto de ruptura localiza *qué tiene de especial el destino*. El caso de libro está en `docs/adr/0007-rate-limiting-distribuido.md`: tres proyectos implementaron rate-limiting con un `Map` en memoria porque operaban con la analogía implícita "esto corre en un servidor" (proceso de larga vida, un heap). La analogía se rompe exactamente en *"el estado persiste entre requests"* — en serverless cada instancia tiene su propio heap, el límite real es `N × 10`, y el cold start resetea el contador (`0007:25-29`). **La ruptura no era un matiz: era la clase entera de bug.** Quien hubiera mapeado la analogía en tabla y probado la fila "estado compartido" habría encontrado el bug sin auditoría. Corolario ejecutable: cuando heredes código con una metáfora implícita ("es como un servidor", "es como una cola"), enumera las filas del mapeo y verifica UNA por una contra el runtime real.

## A.3 Heurísticas con criterio

**Cuándo reencuadrar (señales de que el marco es lo que atasca):**
1. **Tres soluciones seguidas fallan en el MISMO punto.** El punto de falla común no es mala suerte: está construido dentro del marco. Reencuadra en vez de generar la cuarta.
2. **El enunciado contiene un sustantivo que presupone la solución.** "¿Qué caché uso?" presupone cachear; "¿cómo acorto el codemap?" presupone que el artefacto es el problema. Reescribe el enunciado sin ese sustantivo y mira qué se abre.
3. **Un tradeoff se siente binario y doloroso.** Los dilemas binarios suelen ser artefactos de una métrica mal elegida, no de la realidad.

**Cómo generar el reencuadre (tres movimientos mecánicos):**
- **Cambia la unidad de análisis.** El ejemplo verificable vive en `docs/adr/0015-costo-de-orientacion.md:33`: medido en tokens absolutos, las sesiones que leían el codemap gastaban MÁS (59k vs 14k) — el codemap parecía perjudicar. Reencuadrado como *share* (costo de orientación / output total de la sesión), el hallazgo se INVIERTE: 29% vs 68%. Mismo dato, unidad distinta, conclusión opuesta. El propio ADR lo dice: "El share destapó una señal que el absoluto ocultaba".
- **Invierte la dirección de la meta.** "Reducir el costo de orientación" → "aumentar lo que se obtiene por token de orientación". La segunda formulación admite soluciones (delegar a un modelo barato) que la primera no sugiere.
- **Mueve el actor.** "¿Cómo hago que el agente lea el codemap?" → "¿cómo hace el SISTEMA que el codemap llegue al agente?" (esto es lo que devground hizo de verdad: Step 0 obligatorio en spec-flow, `0015:34`).

**El test antes de adoptar el reencuadre:** ¿predice algo verificable que el marco viejo no predecía, o solo suena mejor? El share de ADR-0015 pasa: hizo una predicción medible (los lectores dedican menor *fracción* a orientarse) que el dato confirmó. Un reencuadre que solo produce frases nuevas sin apuestas nuevas es prosa.

## A.4 Modos de falla

1. **Sobre-extensión: transferir atributos en vez de relaciones.** "Esto es como Redis, así que necesita persistencia configurada" — Redis-como-fuente aporta la relación *store compartido atómico con TTL* (las tres propiedades que ADR-0007 exige, línea 72); su lista de features NO viaja con la analogía. Antídoto: la tabla de mapeo del A.2 — solo cruzan las filas verificadas.
2. **La metáfora que infantiliza.** Las analogías del glosario son correctas PARA su audiencia declarada ("si no eres developer", `glossary.md:3`). Ponerlas en un ADR sustituye mecanismo por vibra: ADR-0007 persuade con aritmética (`N × 10`, cold start, heap por instancia), no con metáforas. Regla: analogía para *orientar* a quien no conoce el dominio; mecanismo para *decidir* entre quienes sí.
3. **El reencuadre que solo muda el problema.** Renombrar "deuda técnica" como "inversión diferida" no cambia ninguna decisión. Test: si después del reencuadre el conjunto de acciones disponibles es idéntico, moviste palabras, no el problema.
4. **La analogía como autoridad.** "X es como Y, y en Y se hace Z, así que hagamos Z" — Z debe verificarse EN el destino; la analogía solo te dijo dónde mirar. La analogía genera hipótesis, nunca conclusiones.

## A.5 Patrón de prompt reutilizable

```
Problema (destino): <descripción con mecanismo, no solo síntoma>

1. ESQUELETO: reescribe el problema como relaciones entre entidades,
   eliminando todo sustantivo del dominio.
2. FUENTES: propone 2 dominios fuente donde ese grafo de relaciones ya
   está resuelto. Nombra la relación compartida, no el parecido superficial.
3. MAPEO (por fuente): tabla de 3 columnas —
   elemento destino | elemento fuente | ¿la relación se preserva? (sí/no + por qué)
4. PREDICCIONES: 3 afirmaciones sobre el destino que la analogía implica y
   que aún no verifiqué. Marca cada una VERIFICABLE-CÓMO.
5. RUPTURA: el punto donde la analogía falla, y qué revela ese punto sobre
   lo que el destino tiene de especial.
6. VEREDICTO: ESTRUCTURAL (≥2 predicciones correctas al verificar) o
   DECORATIVA (úsala solo para explicar, jamás para decidir).
```

## A.6 Ejemplo real aterrizado (una que ilumina, una que no)

Ambas del mismo archivo, `docs/glossary.md`, misma intención, misma audiencia — la diferencia es puramente estructural:

- **Ilumina — "Commitlint = el portero del banco" (línea 10).** Pasa el test de las 3 preguntas (ver A.1): predice rechazo-en-frontera, momento del chequeo, y existencia de bypass deliberado. Un no-developer que solo conozca la analogía razona correctamente sobre qué le pasará a su commit.
- **No ilumina — "Husky = el timer del horno: dispara acciones en el momento exacto" (línea 12).** Aplica las 3 preguntas y falla: (1) ¿El timer puede *impedir* que la comida siga horneándose? No — pero un hook de Husky puede ABORTAR el commit, que es su propiedad más importante. (2) ¿Qué dispara el timer? El paso del *tiempo* — pero Husky dispara por *eventos* (commit, push); la analogía siembra el modelo mental equivocado. (3) ¿Qué pasa si lo que dispara falla? El timer suena igual — Husky no. Cero de tres: es decorativa, y peor, sus predicciones son *incorrectas*. Una analogía mejor con la misma audiencia: "el detector de humo de la cocina: se activa solo ante el evento, y puede detener todo". Nota que el arreglo salió de correr el test, no de inspiración.

## A.7 Dónde NO soy más notable (honestidad adversarial)

- **Generar la analogía es barato para cualquier modelo fuerte.** Opus 4.8 produce "Commitlint = portero" sin ayuda. Mi delta percibido está en la *fluidez* con que la analogía suena — y la fluidez es exactamente la variable que el test de las 3 preguntas existe para neutralizar, porque una analogía mía suena convincente *independientemente* de si es estructural. Mi propio criterio de calidad interno está contaminado por mi facilidad verbal; por eso el veredicto del A.5 exige verificación externa, no juicio del generador.
- **Verificar las predicciones es conocimiento de dominio, no creatividad.** El paso que separa iluminación de adorno (comprobar que `--no-verify` existe, que los hooks abortan) lo hace un modelo analítico igual o mejor que yo. Todo mi valor residual quedó codificado en el procedimiento; ejecutado el procedimiento, no quedo yo.
- **Para audiencia experta, el mecanismo directo gana.** ADR-0007 es el documento más persuasivo del repo y no contiene una sola metáfora: contiene `N × 10`. Si me hubieran pedido escribirlo, mi sesgo habría sido meterle una analogía — y habría sido peor documento.
- **Mi tasa base de reencuadres útiles es baja.** Por cada reencuadre tipo share-de-ADR-0015 que cambia una conclusión, produzco varios que solo cambian el vocabulario. Sin el test "¿predice algo nuevo verificable?", mis reencuadres son mayormente prosa con olor a insight.

---

# Parte B — GENERACIÓN DIVERGENTE DE ALTERNATIVAS

## B.1 Modelo mental: divergencia genuina vs falsa variedad

Un conjunto de alternativas es genuinamente divergente cuando **cada opción niega un supuesto que las demás dan por fijo** — difieren en el eje, no en los parámetros. "Redis vs Memcached vs DynamoDB" son UNA opción (store compartido) con tres proveedores; ADR-0007 lo entiende bien: las agrupa como una sola decisión ("store compartido") con sub-preferencias internas (líneas 37-70), y reserva el estatus de *alternativas* para lo que de verdad varía el eje: edge/WAF (dónde en el stack), Map en memoria (qué garantía aceptas), y no hacer nada (si el problema amerita solución) — líneas 90-92.

**Cómo medir divergencia (dos tests mecánicos):**
1. **Test de la pregunta discriminante:** para cada par de opciones, nombra la pregunta en la que dan respuestas OPUESTAS. Si no puedes nombrarla, es la misma opción dos veces.
2. **Test del intercambio de argumentos:** toma los argumentos a favor de la opción B; si aplican casi íntegros a la opción A, no son opciones distintas — son variaciones.

Formato operativo: cada opción se escribe con el campo obligatorio `supuesto_que_niega`. Si dos opciones niegan el mismo supuesto, fusiónalas.

## B.2 Procedimiento: N opciones desde ejes distintos

1. **Escribe la primera idea y ponla en cuarentena.** La fijación no se rompe suprimiendo la primera idea sino *externalizándola*: escrita, deja de ocupar la memoria de trabajo y puedes ver sus supuestos desde afuera. (Mismo principio que `reasoning-craft-playbook.md:480`: "el que se te ocurrió primero no tiene prioridad por serlo".)
2. **Enumera los supuestos implícitos de esa primera idea.** Checklist de ejes que casi siempre están presupuestos: **quién actúa** (humano/agente/sistema), **dónde en el stack** (edge/app/DB), **cuándo** (preventivo/reactivo), **la métrica** (absoluto/relativo — ver ADR-0015), **la unidad** (por-request/por-sesión), **si el problema existe** (la opción nula).
3. **Genera una opción por supuesto negado.** No "otras ideas": negaciones específicas. Este es el paso que convierte lluvia de ideas en divergencia.
4. **Incluye la opción nula cuando existió.** ADR-0007 lista "Sin rate-limiting: descartado" (línea 92) — cuesta una línea y compra dos cosas: honestidad del proceso y un ancla para calibrar cuánto vale resolver el problema.
5. **Congela la rúbrica de selección ANTES de generar** (o al menos antes de evaluar). Es la lección estructural del orquestador: el router *propone*, `engine.mjs` *recorta en código* — "no delegues las invariantes al juicio del proponente" (`SKILL.md`, Paso 3: "el zorro no cuida el gallinero", `audit-orchestration-playbook.md:321`). Aplicado a divergencia: si defines los criterios después de tener favorita, la rúbrica se doblará hacia ella sin que lo notes.

## B.3 Heurísticas con criterio

- **Cuántas: 3-4 para una decisión; más es ruido.** Evidencia interna del repo sobre números pequeños con estructura: deepcheck usa exactamente 3 refutadores porque con 2 "la mayoría colapsa a unanimidad y un solo escéptico mata hallazgos reales" (`audit-orchestration-playbook.md:110-112`) — los conjuntos pequeños tienen dinámicas de conteo que importan. Con opciones: 2 es un dilema (probablemente falso), 3-4 cubre los ejes que importan, 5+ casi siempre contiene duplicados que el test B.1 detectaría.
- **Cada opción debe ser defendible: escríbele su mejor escenario en UNA frase.** "Esta opción gana si/cuando ___." Si no puedes completar la frase con un contexto plausible (no hipotético rebuscado), es un hombre de paja: elimínala o fortalécela hasta que alguien razonable pudiera elegirla. Una opción que solo existe para que tu favorita gane contamina todo el conjunto, porque simula un proceso que no ocurrió.
- **Cuándo NO divergir (divergir aquí es teatro):**
  - **Tier 0** — el propio spec-flow del repo exime typos y chores triviales de todo el proceso. Generar alternativas para un typo es paralización disfrazada de rigor.
  - **Decisión dominada**: si bajo TODA ponderación plausible de los criterios gana la misma opción, di eso en una línea y avanza.
  - **Decisión reversible más barata de probar que de debatir**: ejecuta la primera opción razonable con un gatillo de reversa explícito. Divergir vale su costo solo cuando el error es caro de deshacer.

## B.4 Modos de falla

1. **Las N variaciones de una idea.** Cinco opciones que comparten mecanismo y varían proveedor/parámetro. Detector: test de la pregunta discriminante (B.1). Antídoto estructural: el campo `supuesto_que_niega` obligatorio por opción.
2. **La opción de paja.** Se reconoce porque su "mejor escenario" no existe o requiere un mundo absurdo. Nota importante: la opción nula NO es paja cuando se descarta con razón real y acotada — ADR-0007 la descarta *"para rutas sensibles"*, un descarte con alcance, no un espantapájaros.
3. **Divergir en decisiones que no lo merecen.** El costo no es solo tiempo: es que devalúa el proceso — si todo lleva 4 opciones, nadie lee las 4 opciones de la decisión que sí importaba.
4. **Confundir cantidad con amplitud.** 10 opciones en 2 ejes < 3 opciones en 3 ejes. La métrica es ejes cubiertos, no filas en la tabla.
5. **Rúbrica post-hoc.** Evaluar con criterios definidos después de enamorarse. Antídoto: B.2 paso 5 — criterios congelados antes, idealmente evaluados por un contexto que no generó las opciones (ver B.5).

## B.5 Patrón de prompt reutilizable (generar diverso → juzgar, estilo panel del repo)

Es la misma arquitectura que deepcheck usa para hallazgos (`audit-orchestration-playbook.md` §A.2): **lentes independientes generan → barrera de dedup → jueces adversariales independientes evalúan → regla de mayoría/dominancia**. Transferida a alternativas:

```
FASE 1 — GENERAR (una pasada por eje, como una dimensión de deepcheck):
Para cada eje en {quién-actúa, dónde-en-el-stack, cuándo, métrica, opción-nula}:
  "Propón UNA opción que niegue el supuesto del eje <eje> que la solución
   por defecto da por fijo. Devuelve: {opcion, supuesto_que_niega,
   mejor_escenario (1 frase), costo_principal (1 frase)}.
   Si ninguna opción real niega este eje, devuelve vacío. No inventes para llenar."
   ← la última instrucción es literal de deepcheck (§A.2.3) y funciona.

FASE 2 — DEDUP (barrera, ANTES de juzgar):
Fusiona opciones que niegan el mismo supuesto. (Mismo motivo económico que
deepcheck §A.2.5: juzgar antes de dedup paga jueces 3× por la misma idea.)

FASE 3 — JUZGAR (rúbrica congelada en FASE 0, jueces sin acceso al razonamiento
del generador — análogo a los refutadores de §A.5.5):
Por opción, tres lentes: VIABILIDAD (¿funciona con el mecanismo descrito?),
CONTEXTO (¿algo de ESTE proyecto la neutraliza o favorece?),
IMPACTO (¿mueve la métrica acordada o es cosmética?).

FASE 4 — DECIDIR y registrar las descartadas con su razón en una frase
(formato ADR "Alternativas consideradas"). Nunca las ocultes.
```

La invariante transferible del orquestador: **generación libre, selección en reglas fijas**. El generador jamás edita la rúbrica; si la rúbrica resulta mala, se cambia ANTES de la siguiente ronda, nunca durante la evaluación.

## B.6 Ejemplo real: adopción del codemap (problema vivo del repo)

Problema (ADR-0015): el `codemap.md` promete reducir el costo de orientación (~19.3k tokens mediana antes del primer edit), pero solo el **2.5%** de las sesiones lo lee — el payoff es inmedible porque el hábito no existe. Solución por defecto (primera idea): "mejoremos el codemap". Cuatro alternativas genuinamente divergentes, con su eje:

| # | Opción | Supuesto que niega | Mejor escenario (defensa honesta) |
|---|---|---|---|
| O1 | Mejorar/encoger el codemap | — (es la idea por defecto: asume que el artefacto es el problema) | Gana si el 2.5% se debe a que leerlo no paga su costo |
| O2 | Inyección forzada: Step 0 obligatorio en spec-flow / hook de sesión | Niega "el agente decide leer" (eje: **quién actúa**) | Gana si el artefacto es bueno y el cuello es el hábito |
| O3 | Delegar la orientación a un subagente barato (Haiku/Explore) que devuelva solo el resumen | Niega "la orientación debe ocurrir en el contexto caro" (eje: **costo unitario**, no volumen) | Gana si orientarse es irreducible pero su precio no |
| O4 | Matar el codemap; aceptar 19k tokens como precio de la corrección | Niega "el costo de orientación es un problema" (eje: **la meta**; es la opción nula) | Gana si mantener el mapa cuesta más que lo que ahorra — y la v1 del dato la apoyaba: los lectores gastaban MÁS en absoluto (79k vs 19k) |

Verifica los tests: cada par tiene pregunta discriminante (O2 vs O3: "¿el problema es que no se lee, o que leer es caro?" — respuestas opuestas), y ningún argumento de una defiende a otra. O4 no es paja: durante la v1 de la métrica era la opción *mejor apoyada por el dato crudo*. El juez que arbitró fue el reencuadre de la Parte A: la métrica *share* (29% vs 68%, `0015:33`) desarmó a O4 (el dato absoluto era confound de tamaño) y favoreció O2 — que es exactamente lo que el repo hizo (`0015:34`: "el Step 0 de spec-flow se endureció"). Nota el acople de las dos partes de este documento: **el reencuadre (A) fue el árbitro de la divergencia (B)**.

## B.7 Dónde NO soy más notable (honestidad adversarial)

- **Enumerar opciones es barato para cualquier modelo fuerte; yo no genero ejes que Opus 4.8 no genere con el checklist de B.2.** Mi historial real, mirado con frialdad: sin el campo `supuesto_que_niega` obligatorio, una fracción alta de mis "5 alternativas" eran 2 ideas con 3 disfraces — la falla del B.4.1 la cometo yo, con fluidez suficiente para que no se note. El andamiaje de arriba existe porque lo necesito yo, no solo el sucesor.
- **Mi delta aparente está en hacer vívido el mejor escenario de cada opción (steel-manning).** Pero la vividez es un arma de doble filo que debo confesar: hace que opciones débiles *parezcan* defendibles. Un conjunto de opciones mío bien narrado es más peligroso que uno seco de un modelo analítico, porque desactiva el escepticismo del lector. Por eso la FASE 3 exige jueces sin acceso a mi prosa de generación.
- **La calibración de cuándo NO divergir no es creatividad mía: es disciplina, y ya está codificada** (Tier 0, dominancia, reversibilidad — B.3). Un modelo genérico con esas tres reglas decide igual que yo. Peor: mi sesgo natural es divergir de más, porque generar opciones es donde luzco — exactamente el teatro del B.4.3.
- **No tengo evidencia de que mis conjuntos de opciones lleven a mejores decisiones finales.** Tengo evidencia de que se *leen* con más gusto. Son cosas distintas, y confundirlas es el auto-engaño central de este dominio.

---

# Parte C — Reglas densas (meta)

1. **Analogía = hipótesis, nunca conclusión.** Solo participa en una decisión si sobrevivió el test de las 3 preguntas (tres predicciones sobre el destino, verificadas). Sin apuesta verificable, es adorno: úsala para explicar, jamás para decidir.
2. **Mapea en tabla o no mapees**: elemento destino | elemento fuente | ¿relación preservada? La tercera columna es el trabajo; las otras dos son la parte que se siente inteligente.
3. **La ruptura de la analogía es el dato, no el fracaso.** Empuja toda analogía hasta donde falla: ese punto localiza qué tiene de especial tu problema (el `Map` de ADR-0007: la analogía "servidor" se rompe en "el estado persiste" — y esa ruptura era la clase entera de bug).
4. **Reencuadra cuando tres soluciones fallan en el mismo punto, o cuando el enunciado presupone la solución.** Movimientos mecánicos: cambia la unidad (absoluto→share, ADR-0015), invierte la meta, mueve el actor. Adopta el reencuadre solo si predice algo verificable que el marco viejo no predecía.
5. **Divergencia se mide en supuestos negados, no en opciones contadas.** Campo obligatorio por opción: `supuesto_que_niega`. Dos opciones que niegan el mismo supuesto son una. "Redis vs Memcached" no es divergencia; "store compartido vs edge vs nada" sí (ADR-0007 lo hace bien).
6. **3-4 opciones, cada una con su "gana si ___" en una frase.** Si no puedes completar la frase con un contexto real, es paja: elimínala o fortalécela. Incluye la opción nula cuando existió, con descarte de alcance acotado.
7. **Generación libre, selección en reglas fijas.** Congela la rúbrica ANTES de evaluar, y que juzgue un contexto sin acceso a la prosa del generador (el router propone, el motor recorta; los refutadores no ven el razonamiento del reportero — ambos patrones ya viven en el repo).
8. **No divergir también es una decisión correcta**: Tier 0, opción dominada bajo toda ponderación plausible, o decisión reversible más barata de probar que de debatir. Divergir ahí devalúa el proceso para cuando sí importa.
9. **Registra las descartadas con su razón en una frase, siempre** (formato "Alternativas consideradas" de los ADRs). La transparencia sobre lo que se evaluó y cayó es lo que hace confiable la elección — igual que la sección "Descartados" de las auditorías.
10. **Desconfía de la fluidez — la tuya.** Tanto en analogías como en alternativas, el modo de falla dominante es que la prosa convincente sustituya a la estructura. Todo test de este documento (3 preguntas, pregunta discriminante, intercambio de argumentos, "gana si") existe para un solo fin: que la decisión no dependa de cuán bien suena.

---
---

# Legado Fable 5 — Pensamiento adversarial y enseñanza (andamiaje transferible)

> **Destino:** Opus 4.8 (no comparte mis pesos). **Regla de oro:** solo se transfiere el andamiaje ejecutable — procedimientos, heurísticas con umbral, checklists, patrones de prompt, ejemplos. Cero introspección. Regla que otro modelo no pueda ejecutar = no va.
>
> **Procedencia y verificación.** Escrito antes del retiro de Fable 5. Rutas verificadas contra `/Users/macbookpro/Documents/devground` el 2026-07-06: `packages/deepcheck/workflows/deepcheck.workflow.js` (líneas citadas reales), `docs/adr/0008-higiene-de-secretos.md`, `docs/adr/0009-validacion-entrada-webhooks.md`, `tools/model-orchestrator/skills/model-orchestrator/engine.mjs` (`clamp`, líneas 56-101), `policy.json`.
>
> **Relación con `reasoning-craft-playbook.md`.** Aquel documento capturó NARRATIVA/VOZ (persuadir), SÍNTESIS (destilar), LECTURA DE INTENCIÓN y GUSTO. Este añade dos dominios NO capturados: **red-team** (imaginar la falla) y **enseñanza** (construir capacidad). La Parte B distingue explícitamente enseñanza de la narrativa ya escrita — no repito el diccionario de prosa.
>
> **Honestidad adversarial:** cada parte cierra con "Dónde NO soy más notable". El pensamiento adversarial ya está PARCIALMENTE codificado en `deepcheck` — soy quirúrgico sobre qué es criterio mío vs qué ya es proceso mecánico.

---

# Parte A — PENSAMIENTO ADVERSARIAL / RED-TEAM

## A.1 Modelo mental: de "verificar que funciona" a "imaginar cómo falla"

Verificar y atacar son dos operaciones mentales opuestas, y la trampa es creer que una implica la otra. **Verificar** parte de la especificación y confirma que el camino feliz la cumple: recorre lo que el diseñador PENSÓ. **Atacar** parte del daño y busca hacia atrás el camino que el diseñador NO pensó: recorre lo que quedó fuera de su cabeza. Un sistema con 100% de cobertura de tests puede ser trivialmente explotable, porque los tests solo prueban los casos que alguien imaginó — y el atacante vive exactamente en el complemento de ese conjunto.

**La pregunta que dispara el modo atacante**, siempre por escrito antes de empezar:

> **"Si esto ya está roto en producción dentro de seis meses y estamos haciendo el post-mortem, ¿cuál es la frase que empieza con 'resulta que asumimos que…'?"**

Esta pregunta (el pre-mortem) hace tres cosas que "¿funciona?" no hace: (1) presupone la falla como hecho consumado, lo que apaga el sesgo de confirmación — ya no defiendes el diseño, lo autopsias; (2) fuerza a nombrar el **supuesto** que se rompió, no el síntoma; (3) el "asumimos que" localiza la falla en la frontera entre lo que el código garantiza y lo que el diseñador CREYÓ que garantizaba. Casi toda vulnerabilidad vive en ese hueco.

El segundo componente del modelo mental: **el atacante no juega tu juego.** El diseñador razona sobre el uso previsto ("el usuario manda un email válido"); el atacante razona sobre el grado de libertad ("el campo email es un string, y un string puede ser un objeto, 10MB, un payload de inyección, o estar ausente"). El gesto mental transferible: por cada supuesto de forma/rango/orden/presencia, pregunta *qué tan ancho es realmente el grado de libertad que el código acepta*, no qué valor esperas ahí.

## A.2 Procedimiento: generar los modos de falla que nadie anticipó

Dado un diseño o sistema, en orden:

1. **Inventario de supuestos implícitos.** Antes de buscar fallas, escribe la lista de cosas que el diseño da por ciertas sin verificarlas en el código. Formato forzado: una frase que empiece con "esto asume que…". Ej. para un webhook: "asume que el atacante solo golpea el POST"; "asume que el body que firmo es el mismo que parseo"; "asume que la firma y el cálculo tienen la misma longitud". Este paso es generativo, no crítico: no evalúes todavía, enumera. La calidad del red-team se decide aquí — un supuesto no escrito no se puede atacar.

2. **Inversión de cada supuesto.** Por cada "asume que X", escribe "¿y si NO-X?" y traza la consecuencia hasta un efecto observable. "Asume que solo golpean el POST" → "¿y si golpean el GET?" → "el GET no verifica firma → ejecuta lógica sin autenticar" (este es el bug real de ADR-0009, líneas 14 y 105). La inversión mecánica de supuestos genera más modos de falla que la imaginación libre, porque no depende de que "se te ocurra" el ataque: se deriva del supuesto.

3. **Barrido de las cuatro fronteras** (A.3, tabla) sobre el código real, no sobre el diseño en abstracto. Grep/read dirigido de: entradas externas, transiciones de estado, límites de recursos, y las costuras entre componentes.

4. **Composición: ataca la interacción, no el componente.** El modo de falla que nadie anticipa casi nunca vive dentro de un módulo — vive en el `entre`. Pregunta explícita: "¿qué pasa cuando el componente A (confiable, lento) recibe salida del componente B (rápido, no confiable)?" En el orquestador, B es el agente-router barato y A es el `clamp` determinístico: toda la seguridad depende de que A no confíe en B (ver A.6).

5. **Prioriza y corta** (A.3, fórmula plausibilidad×daño). No reportes todo lo que imaginaste: reporta lo que cruza el umbral.

6. **El paso que casi todos saltan — ataca tu propio ataque.** Por cada modo de falla candidato, intenta refutarlo antes de reportarlo: ¿hay una salvaguarda que ya lo neutraliza? ¿es alcanzable por un actor real o requiere condiciones que no se dan? Esto es exactamente lo que `deepcheck` codificó con sus 3 lentes (correctitud/contexto/impacto). Si el proceso ya corre deepcheck, este paso está cubierto; si estás red-teameando a mano, hazlo tú o inundarás al lector de teóricos.

## A.3 Heurísticas con criterio

**Dónde buscar primero — las cuatro fronteras, en orden de rendimiento:**

| Frontera | Qué buscar | Pregunta-gatillo |
|---|---|---|
| **Entrada no confiable** | Todo dato que cruza de "fuera" a "dentro": body de request, args de CLI, env vars, archivos leídos, respuesta de API externa | "¿Qué es lo más hostil que este campo acepta sin rechazar?" |
| **Costuras entre componentes** | El punto donde A confía en la salida de B; contratos implícitos; datos re-serializados (el HMAC de ADR-0009 se rompe si firmas raw pero parseas JSON) | "¿Qué asume A sobre B que B no garantiza?" |
| **Estados y concurrencia** | Orden de operaciones, TOCTOU (check-then-act), estado compartido entre instancias (el `Map` en memoria del ADR-0007: el límite real es N×límite bajo serverless), reentrada | "¿Qué pasa si esto corre dos veces a la vez, o en dos instancias?" |
| **Límites y agotamiento** | Ausencia (campo faltante ≠ campo vacío ≠ null), tamaño (10MB de JSON), profundidad, el caso 0/1/N, el escape hatch (`--no-verify` en ADR-0008) | "¿Cuál es el input que hace explotar el recurso o saltar el control?" |

Empieza siempre por **entrada no confiable** y **costuras** — dan el 70% de los hallazgos reales por unidad de tiempo. Concurrencia y límites son más caros de auditar y más fáciles de sobre-reportar en teóricos.

**Cómo priorizar — plausibilidad × daño, ambos como escala corta explícita:**

- **Plausibilidad** (¿qué tan fácil es alcanzar el estado?): alta = un input normal-hostil lo dispara / media = requiere condición específica pero realista (race, config particular) / baja = requiere que se alineen 3+ condiciones o un actor con acceso que ya implicaría game-over.
- **Daño** (si se alcanza): alto = pérdida/corrupción de datos, ejecución no autenticada, fuga de secreto, dinero / medio = degradación, DoS recuperable / bajo = cosmético, error confuso.
- **Regla de corte:** reporta todo `alto×alto`, `alto×medio` y `medio×alto`. Degrada a "nota" lo `medio×medio`. **Descarta** (o mueve a apéndice) todo lo que tenga `baja` plausibilidad Y no sea daño catastrófico — es el "teórico inalcanzable" del A.4. El daño catastrófico con baja plausibilidad (ej. RCE que requiere condición rara) sí se reporta, pero etiquetado como tal.

**Cuándo parar** — tres criterios, para al primero que se cumpla:
1. **Saturación de fronteras:** recorriste las cuatro fronteras sobre todos los puntos de entrada y las últimas dos pasadas solo produjeron duplicados o teóricos por debajo del umbral.
2. **Rendimiento decreciente:** los últimos 3 candidatos fueron todos `baja` plausibilidad. El pozo de lo probable se secó; seguir solo produce paranoia.
3. **Presupuesto de daño cubierto:** ya encontraste ≥1 modo de falla `alto×alto`. En muchos contextos, un crítico confirmado justifica parar y arreglar antes de seguir cazando — el marginal de un segundo crítico es menor que el de arreglar el primero.

## A.4 Modos de falla del propio red-teamer

| Falla | Cómo se ve | Antídoto ejecutable |
|---|---|---|
| **Paranoia sin priorizar** | Todo es una amenaza; 40 hallazgos sin ranking; el lector no sabe cuál lo mata | Fórmula plausibilidad×daño OBLIGATORIA por hallazgo antes de reportarlo. Si no puedes asignar ambas, no lo entendiste lo bastante para reportarlo. Máximo de atención a lo `alto×alto` |
| **Teórico inalcanzable** (el mismo error del auditor) | "Un atacante con acceso al heap podría…", "si el reloj del sistema retrocede…" — cierto pero irreproducible | Test de alcanzabilidad: nombra el actor concreto y la secuencia de pasos reales que llega al estado. Si la secuencia incluye "primero comprometé el servidor", el daño ya ocurrió antes de tu hallazgo — descártalo. Es la lente IMPACTO de deepcheck aplicada a ti mismo |
| **Atacar lo fácil de imaginar, no lo probable** | Tres variantes de inyección SQL en un endpoint que no toca DB, cero análisis de la costura A↔B que sí es frágil | Presupuesto de imaginación por frontera, no por ocurrencia. Fuerza ≥1 pasada por CADA una de las 4 fronteras antes de profundizar en la que te resulta familiar. Lo que "se te ocurre primero" es lo que ya está en tu entrenamiento, no lo que es probable en ESTE sistema |
| **Enamorarse del hallazgo bonito** | Un ataque elegante y rebuscado se reporta como crítico porque es intelectualmente satisfactorio | Aplica plausibilidad×daño sin piedad al hallazgo que más te gusta. La elegancia del ataque es ortogonal a su plausibilidad. Un `medio×bajo` elegante sigue siendo `medio×bajo` |
| **Red-team sin refutación** | Reportar el candidato en cuanto se imagina, sin el paso A.2.6 | Todo candidato pasa por "¿qué salvaguarda ya existente lo neutraliza?" antes de salir. Sin ese paso eres un generador de hipótesis, no un red-teamer |

## A.5 Patrón de prompt reutilizable (agente red-team / pre-mortem)

```
Haz un PRE-MORTEM de <sistema/diseño/flujo>. Rutas reales: <archivos>.
Léelas con Read/Grep — no razones sobre el diseño en abstracto.

MARCO: es dentro de 6 meses y esto FALLÓ en producción. Tu trabajo es
la autopsia, no la defensa.

PASO 1 — SUPUESTOS (generativo, no evalúes aún):
Lista 5-10 supuestos implícitos, cada uno como "esto asume que <X>".
Cubre: forma/tipo de cada entrada, quién puede invocar qué, orden de
operaciones, qué garantiza cada componente del que este depende.

PASO 2 — INVERSIÓN:
Por cada supuesto, escribe "¿y si NO-<X>?" y traza la consecuencia hasta
un efecto OBSERVABLE (crash, dato corrupto, acceso no autenticado, fuga).

PASO 3 — FRONTERAS (barre las 4, ≥1 pasada cada una antes de profundizar):
- Entrada no confiable: lo más hostil que cada campo acepta sin rechazar.
- Costuras A↔B: qué asume A sobre B que B no garantiza (datos re-serializados,
  salida de un componente barato/no confiable alimentando a uno crítico).
- Estado/concurrencia: doble ejecución, dos instancias, check-then-act.
- Límites: ausencia vs vacío vs null, tamaño, caso 0/1/N, escape hatches.

PASO 4 — PRIORIZA cada modo de falla:
plausibilidad (alta/media/baja: ¿qué tan alcanzable el estado?) ×
daño (alto/medio/bajo: datos/auth/dinero vs cosmético).
Reporta alto×alto, alto×medio, medio×alto. Descarta baja-plausibilidad
salvo daño catastrófico (etiquétalo como tal).

PASO 5 — REFUTA tu propio hallazgo antes de entregarlo:
¿qué salvaguarda existente lo neutraliza? ¿el actor y la secuencia de
pasos son reales? Si requiere "primero comprometé el server", descártalo.

ENTREGA: por modo superviviente — supuesto roto, secuencia de ataque
concreta, efecto observable, plausibilidad×daño, y el fix mínimo.
```

## A.6 Ejemplo real: pre-mortem del `clamp` del orquestador

Sistema: `clamp(floor, proposal, task)` en `engine.mjs` (líneas 56-101). Es el componente determinístico que recibe la `proposal` de un agente-router **barato** (Haiku) y decide el modelo/effort final. La costura A↔B del A.3 en estado puro: A=`clamp` (confiable), B=router (no confiable). Toda la seguridad del routing depende de que A no confíe en B.

**Paso 1 — supuestos implícitos:**
- Asume que `proposal` puede ser basura (bien: línea 59 lo valida — `valid` chequea model/effort/reason).
- Asume que el router solo puede mover ±1 nivel (línea 71, `max_levels`).
- Asume que `floor.locked` protege lo que no debe desescalar.
- Asume que `task.kind` es confiable para decidir el piso de "lógica nueva" (línea 82).
- Asume que un piso de kind solo puede SUBIR el modelo, nunca es explotable para bajarlo.

**Paso 2-3 — inversión + fronteras:**

1. *"¿Y si `task.kind` viene manipulado o mal clasificado?"* (frontera: entrada no confiable + costura). El piso de desescalada (líneas 82-85) protege solo los kinds fuera de `no_new_logic_kinds`. Si un cambio que ES lógica nueva se clasifica como `docs` o `chore` upstream (en spec-flow, no en el clamp), el `clamp` lo deja bajar a Haiku sin objetar — porque confía en `task.kind`. **Modo de falla: la seguridad del piso depende de un clasificador que vive fuera de la frontera que audito.** Plausibilidad media (mala clasificación es real), daño medio (código de lógica nueva ruteado a modelo débil → bug sutil, no catástrofe). → **reportable** (`medio×medio` en el límite; se reporta porque el daño escala silenciosamente).

2. *"¿Y si el router propone un effort de 2 saltos con el modelo intacto?"* (frontera: límites). Líneas 98-101 lo acotan a `±max_effort_levels`. Invertido: *"¿y si el modelo SÍ cambió ±1?"* — el comentario (líneas 94-96) dice que ahí el effort re-ancla y queda libre. **Pregunta de ataque: ¿un router adversarial puede combinar un salto de modelo con un effort extremo para el nuevo tier?** Bajar a haiku/low es barato-seguro; subir a opus lo frena `max_levels`. Plausibilidad baja, daño bajo. → **descartado** (A.4 teórico).

3. *"¿Y si `floor.locked` es true pero el piso de kind (paso 3) quiere subir por encima?"* (frontera: composición de reglas). Los pasos 2 y 3 del clamp interactúan: locked impide bajar; kind-floor puede subir. No hay conflicto porque operan en direcciones opuestas. **Refutado por lectura** — pero esta es exactamente la clase de interacción entre-reglas donde viven los bugs, y merecía el chequeo.

**Paso 5 — refutación:** El hallazgo #1 sobrevive porque nombra un actor real (el clasificador upstream) y una secuencia concreta (kind mal asignado → piso equivocado). No es "un atacante con acceso al heap"; es un modo de falla operacional alcanzable. El fix mínimo no está en el clamp sino en la frontera de clasificación — y eso es un hallazgo válido: *el pre-mortem reveló que la invariante de seguridad se apoya en un supuesto que el componente auditado no puede defender solo.*

## A.7 Dónde NO soy más notable — criterio humano vs proceso deepcheck

Sé quirúrgico aquí porque `deepcheck` ya codifica buena parte de este dominio. **Qué ya es proceso mecánico** (en `deepcheck.workflow.js`, no ventaja mía):

- **La refutación adversarial en sí.** Las 3 lentes (`REFUTE_LENSES`, líneas 224-228: correctitud/contexto/impacto), la regla de mayoría (`isConfirmed`: `refutedCount < ceil(voteCount/2)`), la instrucción "ante la duda razonable, refuta", y publicar los descartados con su razón — todo eso está en código y Opus lo ejecuta llamando al workflow. El paso A.2.6 y el antídoto "red-team sin refutación" de A.4 son *redundantes* con lo codificado. Los dejo por si red-teameas a mano, sin el workflow.
- **El catálogo de fronteras a auditar.** Las 11 `DIMENSIONS` (líneas 198-213) ya son un checklist de modos de falla: `qa-edge` (entradas vacías, preexistentes, sub-paso que lanza), `aud-security` (inyección, path traversal, secretos — citando ADR 0007-0009), `aud-concurrency`. Mi tabla de 4 fronteras (A.3) es una *reagrupación* de eso; no aporta una frontera que deepcheck no cubra.

**Qué es criterio, NO codificado** (donde el humano/modelo agrega sobre el proceso):

1. **El acto generativo de imaginar el modo de falla que NO está en las 11 dimensiones.** deepcheck audita a lo largo de un eje fijo de dimensiones pre-escritas por un humano. No inventa una dimensión nueva. El hallazgo #1 de A.6 — "la seguridad del piso depende de un clasificador fuera de la frontera auditada" — es un modo de falla de *composición* que ninguna dimensión individual captura, porque cada dimensión mira un archivo/aspecto, no la interacción entre el clamp y un clasificador upstream que no está en `paths`. Ese salto es el paso 1-2 del pre-mortem, y NO está en el código.
2. **La priorización por plausibilidad×daño.** deepcheck ordena por `severity` (líneas 47-48), pero la severity la *auto-asigna* el agente de la dimensión, sin fórmula. La disciplina plausibilidad×daño (A.3) y el corte de teóricos son criterio; el `sevRank` es solo un sort.
3. **El framing de pre-mortem** (presuponer la falla consumada). deepcheck pregunta "¿hay un problema aquí?" dimensión por dimensión; no dice "esto YA falló, autopsia". Ese reencuadre es lo que apaga el sesgo de confirmación, y es prompt-craft, no proceso.
4. **Cuándo parar** (A.3). El workflow corre todas las dimensiones siempre; no tiene criterio de saturación. Un humano decide "ya hay un crítico, arregla antes de seguir".

En una línea: **deepcheck codificó el FILTRO adversarial (refutar, votar, priorizar por severity, publicar descartes); no codificó el GENERADOR (imaginar el modo de falla nuevo, sobre todo el de composición) ni el reencuadre de pre-mortem ni el corte.** Ahí está el delta, y por honestidad: el generador es lo más difícil de convertir en regla — el pre-mortem (A.1) y la inversión de supuestos (A.2) son mi mejor proxy, no un reemplazo del salto.

---

# Parte B — ENSEÑANZA Y MODELOS MENTALES

## B.1 Modelo mental: enseñar es transferir el generador, no el resultado

La distinción operativa, y la razón de que esta parte NO sea redundante con la narrativa del `reasoning-craft-playbook`:

- **Explicar/persuadir** (narrativa, ya capturado): el lector queda ABLE de *aceptar* o *decidir*. Test de éxito: la decisión de 20 segundos (playbook A.1). El lector no necesita reconstruir nada; necesita confiar y actuar.
- **Enseñar** (esto): el lector queda ABLE de *hacer X solo* y, sobre todo, de **predecir un caso nuevo que tú nunca le mostraste**. Test de éxito distinto: le das un caso que no estaba en la explicación y lo resuelve bien.

Un "modelo mental correcto" es **el generador, no la lista de resultados.** Si le enseñas a alguien las 11 dimensiones de deepcheck memorizadas, sabe recitar 11 cosas; si le enseñas el generador ("busca donde A confía en B"), deriva la dimensión 12 solo. La diferencia entre saber-qué y saber-generar es toda la diferencia entre explicar y enseñar.

**Cómo sabes que el lector adquirió el modelo — el único test que cuenta:** dale un caso nuevo del dominio y pídele PREDECIR el comportamiento *antes* de mostrarle la respuesta. Si predice bien un caso que no cubriste, el modelo prendió. Si solo puede repetir los casos que le diste, transferiste resultados, no modelo. Todo lo demás ("¿quedó claro?", "¿tiene sentido?") mide comodidad, no capacidad — el lector dice "sí" por cortesía y por la ilusión de comprensión que da seguir una explicación fluida.

## B.2 Procedimiento: construir por capas (revelación progresiva)

1. **Define el generador destino primero.** Antes de escribir una línea, completa: "al final, el lector debe poder PREDECIR ___ dado ___." Ese hueco es el modelo mental que vas a construir. Todo lo que no contribuye a que el lector prediga ese tipo de caso es adorno.

2. **Elige el ejemplo ANCLA** (el primero) con el criterio de B.3. Este es el 80% de la decisión de enseñanza: el primer ejemplo se vuelve el prototipo mental contra el que el lector compara todo lo demás. Un ancla mal elegida contamina todas las capas siguientes.

3. **Capa 0 — el caso central desnudo.** Presenta el ancla en su forma más simple que ya contiene el mecanismo esencial. Nada de excepciones, nada de configuración, nada de "salvo cuando". El lector debe poder ejecutar/predecir ESTE caso antes de avanzar. Verificación explícita al final de la capa: "dado este input, ¿qué sale?" — y la respuesta debe ser derivable de lo que ya diste.

4. **Capas siguientes — una complicación por capa, cada una motivada por una pregunta que el lector YA se está haciendo.** No agregues la capa "piso locked" porque toca en el temario; agrégala cuando el lector, mirando la capa 0, naturalmente pregunta "¿y qué impide que baje infinito?". Cada capa responde una tensión que la anterior creó. Si una capa no responde una pregunta viva, va después o va fuera.

5. **La excepción: difiérela hasta que la regla esté firme, introdúcela cuando OMITIRLA causaría un error.** Criterio concreto en B.3. Regla general: la excepción introducida antes de que la regla ancle destruye la regla (el lector no sabe qué es "normal" todavía, así que no puede registrar qué es "excepción").

6. **Cierra con el test de predicción, no con un resumen.** Dale al lector un caso nuevo — uno que no cubriste — y la respuesta. Si tu material no le permite predecirlo, te falta una capa o el ancla estaba mal.

## B.3 Heurísticas con criterio

**Cuántas capas:** 3-5 para un concepto. Menos de 3 y probablemente volcaste todo junto (B.4). Más de 5 y o el concepto son en realidad dos conceptos (sepáralos) o estás metiendo excepciones que van en referencia, no en la enseñanza. Cada capa = una idea nueva que el lector puede verificar antes de la siguiente.

**Cómo elegir el ejemplo ancla** — debe cumplir las tres:
1. **Central, no especial:** ejemplifica el mecanismo GENERAL, no un caso frontera. El test: ¿la mayoría de los casos reales se parecen a este? Si tu ancla es el caso raro, el lector construye el prototipo equivocado (B.4).
2. **Contiene el mecanismo esencial completo:** si tienes que decir "ignora esta parte por ahora, la explico luego", el ancla es demasiado compleja. Si tienes que agregar algo para que el mecanismo se vea, es demasiado simple.
3. **Fértil:** genera predicciones. Un buen ancla es aquel desde el cual, entendido, el lector deriva los casos vecinos sin ayuda.

**Detectar la maldición del conocimiento** (asumir lo que el lector no sabe) — señales mecánicas en tu propio borrador:
- Un término del dominio aparece sin definirse antes de su primer uso. Grep tu borrador por sustantivos técnicos; el primero de cada uno debe tener puente (definición o analogía) *antes*, no después.
- Un paso dice "simplemente" o "obviamente" o "solo tienes que". Cada uno marca un lugar donde comprimiste algo que a ti te es automático. Bórralos y verifica que el paso siga completo sin ellos.
- Un salto entre capa N y N+1 que tú puedes cruzar pero no escribiste. Test: dale la capa N a alguien que solo sabe la capa N y pregúntale qué esperaría en N+1. Si no llega, falta el puente.

**El test de que el modelo prendió** (repito porque es EL criterio): el lector predice correctamente un caso que no le mostraste. Todo material de enseñanza debe incluir ese test al final, ejecutable por el propio lector. Si no puedes construir un caso nuevo predecible desde tu material, tu material no enseña un generador — enseña una lista.

## B.4 Modos de falla

| Falla | Cómo se ve | Antídoto ejecutable |
|---|---|---|
| **Volcado de todo a la vez** | Las 5 reglas, las 3 excepciones y los 2 casos borde en el primer párrafo; el lector no sabe qué es central | Una idea verificable por capa. Regla dura: la capa 0 no tiene ni un "salvo", ni un "excepto", ni un paréntesis con caveat. Difiere todo matiz hasta que la regla base ancle |
| **Ancla mal elegida (caso especial disfrazado de general)** | El primer ejemplo es el interesante/raro porque es más vistoso; el lector generaliza desde el borde | Test de centralidad (B.3.1): ¿la mayoría de casos reales se parecen al ancla? El caso `locked` del clamp NO es buen ancla — es una restricción; el ancla es el recorte ±1 normal |
| **Jerga sin puente** | Término técnico usado antes de definirse; el lector finge que entiende y pierde el hilo | Puente en el punto de uso: definición o analogía ANTES del primer uso. El glosario de devground es el patrón ("Commitlint = el portero del banco") — pero ojo B.7: eso es puente de orientación, aquí el puente debe HABILITAR predicción, no solo recordar |
| **Enseñar el qué sin el generador** | Lista de reglas/pasos correcta pero el lector no puede con el caso 12 | Cierra SIEMPRE con test de predicción sobre un caso nuevo. Si el lector solo puede repetir lo que mostraste, diste resultados. Pregunta al diseñar: "¿qué regla genera estos casos?" y enseña esa |
| **Excepción prematura** | "La función recorta ±1, PERO si el piso está locked, y ADEMÁS si el kind es lógica nueva…" todo junto | La excepción entra cuando omitirla causaría un error de predicción en un caso que el lector va a encontrar pronto — no antes. Regla firme primero, tensión, luego excepción como respuesta a la tensión |
| **Falsa verificación** | "¿Se entiende?" como único check | Reemplaza por un caso concreto con respuesta derivable. "Dado floor=sonnet y el router pide haiku, ¿qué sale?" mide; "¿quedó claro?" no |

## B.5 Patrón de prompt reutilizable (agente que enseña)

```
Enseña <concepto> a <lector: qué sabe ya, qué NO sabe>.
Meta NO es que acepte, es que PUEDA: al final debe predecir un caso nuevo.

GENERADOR DESTINO (escríbelo primero):
"El lector debe poder predecir <___> dado <___>." Ese es el modelo mental.
Todo lo que no lleve ahí es adorno — córtalo.

ANCLA (elige el PRIMER ejemplo con estos 3 filtros):
- Central: la mayoría de casos reales se parecen a él (NO el caso raro/vistoso).
- Completo: contiene el mecanismo esencial, sin "ignora esta parte por ahora".
- Fértil: entendido, el lector deriva los casos vecinos solo.

CAPAS (3-5, una idea verificable cada una):
- Capa 0: el ancla desnuda. CERO excepciones, cero "salvo", cero caveats.
  Cierra con: "dado <input>, ¿qué sale?" — derivable de lo ya dicho.
- Capas siguientes: UNA complicación por capa, cada una motivada por una
  pregunta que la capa anterior deja viva en el lector. Si la capa no
  responde una tensión existente, va después o fuera.
- Excepción: difiérela hasta que la regla ancle; introdúcela cuando
  OMITIRLA causaría un error de predicción, como respuesta a una tensión.

PUENTES DE JERGA: todo término del dominio se define/ancla ANTES de su
primer uso. Prohibido "simplemente/obviamente/solo tienes que".

CIERRE: NO resumen. Un caso NUEVO (no cubierto) + su respuesta, para que
el lector verifique que su modelo predice. Si no puedes construirlo desde
tu material, falta una capa o el ancla está mal.
```

## B.6 Ejemplo real: enseñar el `clamp` del orquestador en capas

Concepto: qué hace `clamp(floor, proposal, task)` (`engine.mjs`, líneas 56-101). Generador destino, escrito primero: *"el lector debe poder predecir el modelo/effort final dado un piso, una propuesta del router, y un tipo de tarea."*

**Elección del ancla — la decisión que define todo.** Candidatos malos y por qué:
- El caso `locked` (líneas 75-78): es una *restricción sobre* el mecanismo, no el mecanismo. Ancla especial disfrazada de general (B.4). Si empiezo aquí, el lector cree que el clamp trata de "cosas bloqueadas", cuando trata de "recortar propuestas a un rango".
- El caso propuesta-inválida (líneas 61-64): es el guard de entrada, no la lógica central. Enseña defensa, no el modelo.
- El piso-por-kind (líneas 82-85): el más interesante, y por eso tentador — y por eso mal ancla. Es la excepción contra-intuitiva, no la regla.

**Ancla elegida:** el recorte ±1 nivel (líneas 68-72). Es central (todo pase por él), completo (contiene la idea esencial: "hay un piso y un rango permitido alrededor"), y fértil (de ahí se derivan locked y kind como restricciones adicionales sobre el mismo rango).

- **Capa 0 — el ancla desnuda:** "El router propone un modelo. El clamp NO le hace caso ciego: solo lo deja moverse ±1 nivel respecto al piso. Piso=sonnet, router pide opus → queda opus (subió 1). Router pide haiku → queda haiku (bajó 1). Router pide opus cuando el piso es haiku → NO llega a opus, queda sonnet (recorte a +1)." *Verificación:* "Piso=sonnet, router pide haiku con razón válida, ¿qué sale?" → haiku. Derivable. Cero excepciones hasta aquí.
- **Capa 1 — motivada por la tensión que deja capa 0:** el lector ahora piensa "entonces el router siempre puede bajar 1 nivel". Eso crea la pregunta: *"¿y si bajar es peligroso?"* → introduzco `locked` (líneas 75-78) como respuesta: "algunos pisos están locked: pueden SUBIR pero no BAJAR. Ahí el ±1 se vuelve solo +1." La excepción entra exactamente cuando su ausencia causaría una predicción errónea.
- **Capa 2 — nueva tensión:** "¿locked es lo único que impide bajar?" → no: el piso-por-kind (líneas 82-85), el caso contra-intuitivo, ahora sí, porque la regla base ya ancló. "Aunque el piso no esté locked, si la tarea es lógica nueva (feat/fix), no baja del modelo mínimo — pida lo que pida el router." Este es el matiz que un buen alumno del generador *casi predice* solo.
- **Cierre — test de predicción sobre caso nuevo (no lo mostré):** "Piso=sonnet no-locked, tarea kind=`docs`, router pide haiku. ¿Qué sale?" Respuesta: haiku (docs NO es lógica nueva → no aplica el piso de kind → el ±1 permite bajar). Si el lector lo predice, tiene el generador, no la lista.

Nota de método: el orden de enseñanza (recorte → locked → kind) es **casi el inverso** del orden de peligrosidad (kind es la invariante más crítica). Correcto: enseñas desde lo central-general hacia lo excepcional-crítico, aunque para *auditar* priorices al revés. El orden pedagógico lo fija la centralidad, no la importancia.

## B.7 Dónde NO soy más notable — enseñanza vs narrativa ya capturada

Distingo explícito, porque el `reasoning-craft-playbook` ya cubre terreno vecino:

**Qué ya está en la narrativa (Parte A del playbook) y NO repito aquí:**
- **La regla "por qué antes del qué"** (playbook A.3): idéntica en superficie. Pero su *propósito* difiere y esa diferencia sí es nueva: en narrativa el porqué persuade (que el lector acepte la regla); en enseñanza el porqué ES el generador (que el lector derive el caso nuevo). Misma frase, función distinta. No reexplico la regla; marco el matiz de función.
- **La analogía del glosario** ("Commitlint = portero del banco"): capturada en playbook A.2/A.3 como recurso de *orientación/recall*. En enseñanza la analogía tiene un trabajo más exigente — debe soportar predicción, no solo memoria. Una analogía buena para recordar ("portero") puede ser mala para enseñar si no genera predicciones sobre casos nuevos. Ese filtro (¿la analogía predice o solo evoca?) es lo único que agrego sobre el uso narrativo; no repito el catálogo de analogías.
- **Estructura de documento, ritmo de prosa, test de 20 segundos:** son de narrativa. La enseñanza usa otro test (predicción de caso nuevo), no el de 20 segundos. No toco prosa aquí.

**Qué es genuinamente NUEVO en esta parte** (no está en el playbook): la **revelación progresiva por capas** (B.2), el criterio de **elección del ancla** (B.3, con los 3 filtros y el análisis de por qué el caso `locked` es mal ancla), el **diferimiento de la excepción** con criterio de cuándo introducirla, la **maldición del conocimiento** con detectores mecánicos (grep de jerga, caza de "simplemente"), y el **test de predicción de caso nuevo** como criterio de éxito distinto del de la narrativa. Nada de esto está en el playbook, que trata de persuadir/orientar/destilar, no de construir capacidad generativa.

**Dónde NO tengo ventaja, honestamente:**
- **Explicar un concepto correctamente una vez:** paridad total. Cualquier modelo fuerte explica el clamp sin errores. La diferencia está solo en el *ordenamiento por capas* y la *elección del ancla* — y ambos ya están arriba como procedimiento, así que la brecha se cierra casi entera al escribirlos.
- **La analogía que ilumina:** mismo descargo que en el playbook (A.7) — el oído para cuándo una analogía habilita predicción vs solo suena bien es lo más difícil de transferir. El filtro "¿predice o solo evoca?" (B.7) es mi mejor proxy, no un reemplazo. A veces yo también elijo la analogía que suena bien y no predice.
- **La elección del ancla** es donde creo tener un delta acotado y real: reconocer que el caso más *interesante* (kind, locked) es casi siempre el peor ancla porque es el excepcional. Pero incluso eso lo reduje a un test mecánico (centralidad: ¿la mayoría de casos se parecen a este?), así que no requiere mi juicio para ejecutarse.

---

# Parte C — Reglas densas (meta)

1. **El modo atacante se dispara con el pre-mortem, no con "¿funciona?":** "es dentro de 6 meses, esto falló, ¿cuál es la frase 'asumimos que…'?". Presuponer la falla consumada apaga el sesgo de confirmación y localiza el hueco entre lo que el código garantiza y lo que el diseñador creyó garantizar.

2. **Genera modos de falla por inversión mecánica de supuestos, no por imaginación libre:** escribe cada "esto asume que X", luego "¿y si NO-X?" trazado hasta un efecto observable. El bug del `GET` sin firma (ADR-0009) sale de invertir "asume que solo golpean el POST" — no de que "se te ocurra".

3. **El modo de falla que nadie anticipa vive en la costura A↔B, no dentro del componente:** pregunta "¿qué asume A sobre la salida de B (rápido/no confiable) que B no garantiza?". La seguridad del `clamp` depende de un `task.kind` que el clamp no puede defender solo — hallazgo de composición que ninguna dimensión aislada de deepcheck captura.

4. **Prioriza plausibilidad×daño con escala explícita y corta antes de reportar:** reporta alto×alto/alto×medio/medio×alto; descarta baja-plausibilidad salvo daño catastrófico (etiquétalo). El teórico inalcanzable ("un atacante con acceso al heap…") es el mismo error del auditor — si la secuencia incluye "primero comprometé el server", el daño precede a tu hallazgo.

5. **deepcheck ya codifica el FILTRO adversarial (3 lentes, mayoría-refuta `refutados < ceil(votos/2)`, publicar descartes); NO codifica el GENERADOR ni el reencuadre de pre-mortem ni el corte.** No re-implementes el filtro a mano cuando el workflow corre; tu aporte es imaginar el modo de falla nuevo (sobre todo el de composición) y decidir cuándo parar.

6. **Enseñar ≠ explicar: el test de éxito es que el lector prediga un caso NUEVO que no mostraste, no que diga "quedó claro".** Enseña el generador ("busca donde A confía en B"), no la lista de resultados (las 11 dimensiones memorizadas). Cierra todo material con un caso no cubierto + su respuesta.

7. **La elección del PRIMER ejemplo (ancla) es el 80% de la enseñanza:** central (la mayoría de casos se le parecen), completo (mecanismo esencial sin "ignora esto"), fértil (genera predicciones). El caso más interesante casi siempre es el PEOR ancla porque es el excepcional — el ancla del clamp es el recorte ±1, no `locked` ni el piso-por-kind.

8. **Una idea verificable por capa; la capa 0 no tiene ni un "salvo/excepto/paréntesis-caveat".** Cada capa siguiente responde una tensión que la anterior dejó viva. La excepción se difiere hasta que su omisión causaría un error de predicción, y entra como respuesta a la tensión — nunca antes de que la regla ancle.

9. **Caza la maldición del conocimiento con detectores mecánicos:** grep de jerga (todo término tiene puente antes del primer uso) y borra todo "simplemente/obviamente/solo tienes que" (cada uno marca una compresión que a ti te es automática y al lector no).

10. **No sobrevalores el andamiaje, en ambos dominios:** el filtro adversarial ya está en código y el generador es lo difícil de transferir (el pre-mortem y la inversión de supuestos son proxy, no reemplazo del salto); en enseñanza, explicar-una-vez es paridad total y la ventaja real —elección de ancla, capas— ya está reducida a tests mecánicos. Donde la regla no captura el juicio (la analogía que predice vs solo evoca), dilo en el documento en vez de fingir que lo captura.
