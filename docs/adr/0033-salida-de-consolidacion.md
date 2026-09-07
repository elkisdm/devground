# ADR-0033: Cerrar la fase de consolidación y reabrir la expansión hacia los stacks reales

- **Estado**: Aceptado
- **Fecha**: 2026-09-07
- **Decisor**: edaza
- **Aplica a**: todo el monorepo (criterio de entrada de trabajo nuevo, roadmap)
- **Sucede a**: [ADR-0026](0026-fase-de-consolidacion-nucleo-soportado.md)

## Contexto

[ADR-0026](0026-fase-de-consolidacion-nucleo-soportado.md) puso el repo en fase de consolidación con una
vara de entrada estrecha ("un cambio entra solo si arregla, testea, documenta o gradúa algo
que ya existe") y congeló el roadmap de expansión. Puso dos condiciones para salir:

1. **Veredicto para todos los experimentales.** Cumplida hoy por
   [ADR-0032](0032-veredictos-experimentales.md): 3 graduaron, 8 se congelaron.
2. **Bus factor: el ritual de release ejecutado de punta a punta por alguien más que el
   mantenedor.** **NO cumplida.** El autor sigue siendo la única persona que lo ha ejecutado.

La fase cumplió su objetivo declarado: la superficie con mantenimiento activo bajó de 23 a 15
paquetes, y los tres graduados llegaron con tests. Pero una medición del 2026-09-07 sobre el
corpus completo de transcripts (ventana de 43 días, US$126.449 de valor-API-equivalente) expuso
un problema que la consolidación no podía resolver **porque su propia vara de entrada lo
prohibía**:

- La **capa de reglas** (`CLAUDE.md`/`AGENTS.md`, spec-flow) llega al 100% de las sesiones.
- La **capa de paquetes npm** llegó a 12 de 42 repos — y a **ninguno** de los 8 donde ocurre el
  gasto real: atlas (US$22,4k), HCLP (18,3k), Claudia IA (18,0k), Redify (12,0k), dacplata (8,6k),
  Capitalacademy (6,4k), Rentix (6,3k). Los adoptantes concentran ~4-6% del gasto.
- **7 de esos 8 repos no tienen husky y ninguno tiene commitlint.** El 99,6% de conventional
  commits medido en dev-metrics es disciplina del autor, no un gate que lo sostenga.

Las causas son estructurales, no de adopción perezosa:

- **El modelo de instalación es por proyecto.** Adoptar el estándar en un repo existente exige
  tocar su `package.json`, su lockfile y su CI. En un repo grande y vivo eso compite con el
  trabajo real y pierde siempre.
- **Los stacks caros no están cubiertos.** `atlas` es Python (FastAPI + asyncpg): devground no
  tiene nada que ofrecerle. Y ya hay cuatro repos sobre TanStack Start/Router/Query.

Seguir en consolidación significa seguir puliendo un estándar que no toca el 90% del trabajo.

## Decisión

**Cerrar la fase de consolidación** y reabrir la expansión, con tres cambios respecto al régimen
del ADR-0026:

1. **La vara de entrada se reemplaza por una vara de evidencia.** Un frente nuevo entra solo si
   **cierra una brecha medida** entre el estándar y dónde ocurre el trabajo real. No basta con que
   sea buena idea: hay que nombrar el repo o los repos que hoy no cubre y por qué. Esto es más
   estricto que el régimen pre-0026 (que no pedía nada) y más útil que el de 0026 (que prohibía
   todo lo nuevo).

2. **Se renuncia explícitamente a la condición de bus factor**, en vez de dejarla vencer en
   silencio. El riesgo de un solo mantenedor sigue siendo real y queda registrado aquí, no
   escondido: si el autor se detiene, 15 paquetes quedan sin quién los libere. Se acepta porque la
   alternativa —bloquear la expansión hasta conseguir una segunda persona que no existe— mantiene
   el estándar irrelevante para el 90% del gasto por tiempo indefinido. Mitigación parcial: el
   ritual de release ya está documentado en `docs/releases/`, y el frente de instalación por
   máquina (abajo) reduce el trabajo manual que solo el autor sabe hacer.

3. **Los tres frentes que abre esta salida**, todos con brecha medida:

   | Frente | Brecha que cierra | Evidencia |
   | --- | --- | --- |
   | **Instalación por máquina** | El modelo por proyecto no alcanza repos existentes | 30 de 42 repos sin el estándar; 7 de los 8 más caros sin gate de commits |
   | **Python / FastAPI** | El repo más caro no tiene nada que consumir | atlas = US$22,4k en 43 días, Python puro |
   | **TanStack** | Cuatro repos ya en el stack, sin preset | redify-inbox-tanstack, brekto/next, y 6 repos más con `@tanstack/*` |

   Ninguno de los tres inventa desde cero: los tres **cosechan** algo que ya funciona (los
   mecanismos nativos de git y de los linters; el `.pre-commit-config.yaml` de atlas; el
   `@tanstack/eslint-config` oficial). Eso es deliberado — es la parte del espíritu del ADR-0026
   que se conserva.

**Lo que NO cambia**: los compromisos del núcleo soportado del ADR-0026 §1 (semver estricto, tests
para todo cambio de comportamiento, ningún paquete del núcleo bajo `1.0`) siguen vigentes tal cual.
Cerrar la fase levanta la restricción de *alcance*, no la de *calidad*.

## Consecuencias

**Positivas**

- El estándar puede por fin alcanzar los repos donde ocurre el trabajo, sin retrofitear uno por uno.
- La "vara de evidencia" mantiene el freno que hacía falta —ninguna semana de 43 commits abriendo
  cinco frentes por entusiasmo— pero lo ata a una medición en vez de a una prohibición.
- El riesgo de bus factor queda escrito y fechado, disponible para revisarse.

**Negativas / Trade-offs**

- Se sale con una de las dos condiciones incumplida. Es una excepción consciente, y el precedente
  es incómodo: un ADR que pone condiciones y luego se auto-exime pierde fuerza. Se mitiga
  nombrándolo aquí en vez de omitirlo.
- Tres frentes nuevos son tres superficies nuevas que mantener, justo después de bajar de 23 a 15
  paquetes. La vara de evidencia es lo único que impide que la cuenta vuelva a subir sola.
- El frente de instalación por máquina toca configuración **global** de la máquina del usuario:
  un blast radius mayor que cualquier cosa que devground haya hecho antes. Se diseña opt-in por
  repo y con rollback de una línea (ver su propio ADR).

## Alternativas consideradas

1. **Seguir en consolidación hasta cumplir el bus factor**: descartado — no hay una segunda persona
   disponible y la espera es indefinida. Congela el estándar en la irrelevancia medida.
2. **Salir sin vara de entrada, como antes del ADR-0026**: descartado — es exactamente lo que
   produjo 23 paquetes en 9 semanas con 6 testeados.
3. **Retrofitear los 8 repos caros uno por uno, sin cambiar el modelo de instalación**: descartado —
   es el trabajo que ya perdió contra el trabajo real durante cinco meses. La instalación por
   máquina existe para no repetirlo.
4. **Cubrir Python y TanStack como skills en vez de paquetes**: descartado para el gate (ruff y
   pre-commit necesitan ejecutarse, no solo aconsejarse), pero adoptado para las convenciones.
