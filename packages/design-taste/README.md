# @devground/design-taste

**Anti-slop UI/UX design skills for Claude Code.** Stronger layout, typography, motion and
spacing — interfaces that read as designed, not templated. The agent reads your brief,
infers a design direction, and ships against a strict pre-flight check instead of falling
back to the usual AI clichés (centered hero over dark mesh, three equal cards, purple
gradients, em-dashes everywhere).

Bundles five skills, vendored from [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill)
(MIT). See [`skills/ATTRIBUTION.md`](skills/ATTRIBUTION.md).

## Install

Into the current project:

```bash
npx @devground/design-taste
# -> .claude/skills/{design-taste-frontend,minimalist-ui,...}
```

For all your projects (user-level):

```bash
npx @devground/design-taste --global
# -> ~/.claude/skills/...
```

Existing files are never overwritten — re-run after an upgrade to add new skills or
reference files while keeping your local edits.

## Skills included

**Text / design skills**

| Skill (`name`) | Use it for |
|----------------|-----------|
| `design-taste-frontend` | The flagship — landing pages, portfolios, redesigns. Reads the brief, picks a design system when applicable, audit-first on redesigns, strict pre-flight. |
| `minimalist-ui` | Clean editorial interfaces: warm monochrome, typographic contrast, flat bento grids. No gradients, no heavy shadows. |
| `industrial-brutalist-ui` | Raw Swiss-print × terminal aesthetics for data-heavy dashboards and editorial sites. |
| `high-end-visual-design` | Agency-grade polish: the exact fonts, spacing, shadows and motion that make a site feel expensive. |
| `redesign-existing-projects` | Upgrades existing sites/apps to premium quality without breaking functionality. Any CSS framework. |

**Image / Stitch skills** (expect image-generation or Google Stitch tooling)

| Skill (`name`) | Use it for |
|----------------|-----------|
| `brandkit` | Generate a cohesive brand kit as design references (palette, type, logo direction). |
| `imagegen-frontend-web` | Produce web UI design references via image generation before coding. |
| `imagegen-frontend-mobile` | Same, for mobile app screens. |
| `image-to-code` | Image-first workflow: turn a screenshot / design image into faithful frontend code. |
| `stitch-design-taste` | Drive Google Stitch with a taste-calibrated `DESIGN.md` for premium screen generation. |

## How it triggers

Describe an interface ("build a landing page for…", "make this page feel less generic",
"redesign this dashboard") and Claude Code loads the matching skill automatically. The
skill does the design reasoning before writing code.

## License

MIT (this package). Bundled skills are MIT © 2026 Leonxlnx — see `skills/UPSTREAM-LICENSE`.
