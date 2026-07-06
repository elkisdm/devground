# Attribution

The skills bundled in this package are **vendored from an upstream open-source project**,
adapted only in packaging (directory layout matching each skill's frontmatter `name`).
The skill content itself is unmodified.

## Source

- **Project:** [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill)
- **License:** MIT (see `UPSTREAM-LICENSE` in this folder) — © 2026 Leonxlnx
- **Vendored from commit:** `b17742737e796305d829b3ad39eda3add0d79060`
- **Vendored on:** 2026-07-06

## Bundled skills

### Phase 1 — text / design skills

| Directory | Upstream skill | frontmatter `name` |
|-----------|----------------|--------------------|
| `design-taste-frontend/` | `skills/taste-skill` | `design-taste-frontend` |
| `minimalist-ui/` | `skills/minimalist-skill` | `minimalist-ui` |
| `industrial-brutalist-ui/` | `skills/brutalist-skill` | `industrial-brutalist-ui` |
| `high-end-visual-design/` | `skills/soft-skill` | `high-end-visual-design` |
| `redesign-existing-projects/` | `skills/redesign-skill` | `redesign-existing-projects` |

### Phase 2 — image / Stitch skills

| Directory | Upstream skill | frontmatter `name` |
|-----------|----------------|--------------------|
| `brandkit/` | `skills/brandkit` | `brandkit` |
| `imagegen-frontend-web/` | `skills/imagegen-frontend-web` | `imagegen-frontend-web` |
| `imagegen-frontend-mobile/` | `skills/imagegen-frontend-mobile` | `imagegen-frontend-mobile` |
| `image-to-code/` | `skills/image-to-code-skill` | `image-to-code` |
| `stitch-design-taste/` | `skills/stitch-skill` | `stitch-design-taste` (ships `DESIGN.md`) |

These skills produce design references via image generation (or, for `stitch-design-taste`,
Google Stitch). They are heavier than the text skills and expect image/Stitch tooling to be
available. `stitch-design-taste` overlaps conceptually with the standalone `taste-design`
Stitch skill but is a distinct skill with a distinct `name`.

## Not yet bundled

`gpt-tasteskill` (stricter GPT/Codex variant of the flagship), `output-skill`, and
`taste-skill-v1` (superseded). To pull the latest upstream, re-vendor from the source
repository above.
