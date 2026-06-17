# spec-flow — Worked Examples

Three end-to-end walk-throughs. The point of each is not the brief format (that's in
SKILL.md) — it's the **behavior**: how much the skill infers vs. asks, and how it sizes
ceremony to the change. Read these when you want to calibrate the friction level.

---

## Example A — "arregla el typo en el botón de login" → Tier 0 (Express)

**What a bad tool does:** "Which button? What should it say? Should I add a test?
Do you want me to open a PR?" → user is annoyed before anything happens.

**What spec-flow does:**

1. **Classify** (by reading, not asking):
   - Type: `fix` (a typo is wrong behavior in the copy)
   - Size: trivial · Risk: low · Uncertainty: known
   - Surface: grep for the login button → `src/components/LoginButton.tsx`
2. **Route:** trivial + low risk → **Tier 0**.
3. **Act, don't interview.** Find the typo, fix it, confirm the component still renders.

Output to the user (one breath):

> `fix` · trivial · `src/components/LoginButton.tsx`. Encontré "Inciar sesión" →
> lo corrijo a "Iniciar sesión". Hecho. Avísame si era otro botón.

Zero questions. The classification line *is* the ceremony.

---

## Example B — "agrega login con email y contraseña" → Tier 1 (Light)

**The temptation:** ask about password rules, session storage, OAuth, "forgot
password," rate limiting, 2FA... a dozen real questions. Resist. Infer the obvious,
state assumptions, leave genuinely open product choices as explicit out-of-scope.

1. **Orient (Step 0):** read `docs/codemap.md` if it exists — it points at `src/auth/`
   as the auth subsystem, so the search is already narrowed. Confirm those paths against
   the actual code (targeted, not a full scan). If there's no map, do a quick targeted
   scan and plan to seed one in Step 5.
2. **Classify:**
   - Type: `feat` · Size: small · Risk: low (no existing auth to break; greenfield)
   - Uncertainty: known · Surface: `src/auth/` (new), a form component, an API route
   - The scan found the project already uses, say, a Postgres client and Zod — so the
     approach can lean on what's there. That's inference doing its job.
3. **Route:** small `feat`, low risk, known → **Tier 1**. A thin brief, then build.
4. **Brief** (note how assumptions replace questions):

> ## Agregar login con email + contraseña
> **Classification**: feat · small · low risk · known · touches `src/auth/`
> **Tier**: 1 — Light
>
> ### Goal
> Un usuario registrado puede iniciar sesión con su email y contraseña y obtener una
> sesión activa.
>
> ### Assumptions made (correct me if wrong)
> - Login de usuarios EXISTENTES; el registro ya existe o es otro cambio.
> - Contraseñas con hash (bcrypt/argon2), no en texto plano — convención mínima de seguridad.
> - Sesión vía la librería que ya usa el proyecto; no introduzco OAuth ni 2FA ahora.
>
> ### Acceptance criteria
> - [ ] Credenciales válidas → sesión creada, redirige al dashboard.
> - [ ] Credenciales inválidas → error claro, sin filtrar si el email existe.
> - [ ] Campos vacíos → validación antes de llamar al backend.
>
> ### Files & routes to touch
> - `src/app/login/page.tsx` — new — formulario de login
> - `src/app/api/auth/login/route.ts` — new — handler `POST /api/auth/login`
> - `src/auth/session.ts` — modify — emitir sesión tras login válido
> - verified against code: yes (paths confirmados contra `src/`, no solo inferidos del mapa)
>
> ### Out of scope
> - "Olvidé mi contraseña", OAuth, 2FA, rate limiting (cambios futuros).

Then it proceeds to implement, criteria → tests. The only thing it surfaced were
*assumptions to veto*, not *questions to answer*. If the user says nothing, work
continues. **After it lands (Step 5):** the new `src/auth/` module and the
`POST /api/auth/login` route get added to `docs/codemap.md` — so the *next* auth request
starts already knowing where login lives. That's the flywheel turning once.

Why no questions cleared the must-ask bar: none of the unknowns were both high-impact
AND irreversible AND uninferable. Password hashing isn't a question — it's a
non-negotiable assumption you state. OAuth isn't a question — it's out of scope.

---

## Example C — "migremos los usuarios de Mongo a Postgres" → Tier 3 (Full)

Here ceremony is *earned*, and here — and basically only here — a question may be
justified.

1. **Classify:**
   - Type: `refactor` + `breaking` (data layer contract changes) · Size: large
   - Risk: **high** (data model + migration + irreversible if done wrong)
   - Uncertainty: unknown (need to see current schema, volume, dual-write needs)
   - Surface: data access layer, models, migration scripts, anything reading users
2. **Route:** large + high risk + breaking + unknown → **Tier 3**. Full flow.
3. **Explore first** (still inferring, not asking): read the Mongo schema, find every
   read/write site, check row counts if accessible, look for existing migration tooling.
4. **The one legitimate question.** Suppose downtime tolerance genuinely can't be
   inferred and it's a one-way door that changes the whole approach (big-bang cutover
   vs. dual-write + backfill). That clears all three bars: high-impact, uninferable,
   expensive to get wrong. So ask it — **once**, bundled with anything else at that bar:

> Antes de diseñar la migración necesito UNA definición que no puedo deducir del código:
> ¿toleramos downtime (cutover de una vez, más simple) o cero downtime (dual-write +
> backfill, más trabajo pero sin caída)? Con eso armo el diseño completo.

   One round. Everything else — schema mapping, which ORM, rollback shape — is inferred
   and written into the design as decisions, not questions.
5. **Then** produce: exploration findings → brief + spec → design (with rollback plan) →
   task breakdown → implement → verify → offer to record an ADR.

The contrast with Example A is the whole philosophy: the typo got zero questions and
zero artifacts; the irreversible data migration got one precise question and the full
treatment. Ceremony tracks risk, not habit.

---

## Calibration heuristic

If you're unsure whether to ask something, run it against the three bars
(high-impact AND uninferable AND expensive-to-reverse). If it fails any bar, **infer
it and state the assumption.** When in doubt, lean toward motion. The user can always
correct an assumption in one sentence; they can't get back the time spent answering a
form.
