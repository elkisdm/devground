# Code Map — format & rules

`docs/codemap.md` is the project's **living index of where things live**. Its only job is
to let the next request find the right files fast — to turn "scan 300 files" into "check
these 3." It is NOT documentation of how the system works (that's the code itself) and
NOT a record of why decisions were made (that's ADRs). Keep it an index.

## The contract that keeps it honest

- **It is a hint, never a source of truth.** Anyone reading it to decide what to change
  MUST verify the paths against the actual code first. The map drifts; the code doesn't.
- **It is maintained by the flow that uses it.** spec-flow updates it on every change
  that alters structure (Step 5). That's why it stays fresh — it's touched constantly,
  not curated occasionally.
- **Terse beats complete.** A path + a one-line responsibility. If an entry needs a
  paragraph, the detail belongs in code comments or an ADR, not here.

## Format

```markdown
# Code Map

> Index of where things live. A hint for finding files — always verify against the
> actual code before relying on it. Maintained by spec-flow on each structural change.
> Last reconciled: <date or commit, optional>

## <Subsystem / domain name>

| Path | Responsibility | Key routes / entrypoints | ADR |
|------|----------------|--------------------------|-----|
| `src/auth/` | Authentication & sessions | `POST /api/auth/login`, `POST /api/auth/logout` | 0004 |
| `src/auth/session.ts` | Session token issue/verify | — | 0004 |
| `src/middleware/` | Request guards | applied in `app/api/**` | — |

## <Next subsystem>

| Path | Responsibility | Key routes / entrypoints | ADR |
|------|----------------|--------------------------|-----|
| ... | ... | ... | ... |
```

Adapt columns to the project. A library with no HTTP routes drops the "routes" column; a
monorepo might add a "package" column. Don't force fields that don't apply.

## Seeding rules (first time, no map exists)

Don't try to map the whole codebase in one shot — that's the expensive scan we're trying
to avoid. Instead:

1. Seed **only the subsystems the current request touched**, plus their obvious
   neighbors. Partial is fine — the map grows one request at a time.
2. Use the project's real structure: read the top-level source dirs, the router/route
   definitions, and any `AGENTS.md`/README that already describes layout. Cross-check
   against ADRs for subsystem names.
3. Add the header note about verification so future readers know it's a hint.
4. Offer it; don't impose it. If the user declines, skip silently — the skill still works
   without a map, just with more scanning.

## Maintenance rules (map exists)

On each structural change, reconcile only what changed:
- New file/module/route → add a row.
- Moved/renamed → fix the path.
- Deleted → remove the row.
- Wrong responsibility discovered → correct it.

Leave untouched subsystems alone. The map improves incrementally; it doesn't need a full
audit every time.

## What NOT to put in the map

- Implementation details ("uses a for-loop to...") — belongs in code.
- Rationale ("we chose Postgres because...") — belongs in an ADR.
- Volatile specifics (line numbers, function signatures) — they rot instantly.
- Every single file — index the meaningful units (modules, domains, entrypoints), not
  leaf utilities. If listing it doesn't help someone find where to make a change, omit it.
