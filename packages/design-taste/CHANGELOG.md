# @devground/design-taste

## 0.1.0

### Minor Changes

- 75d68d1: Add `@devground/design-taste`: anti-slop UI/UX design skills for Claude Code, installable
  via `devground-design-taste` (project-level `.claude/skills/`, or `--global`). Bundles ten
  skills vendored from [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) (MIT).

  Text/design skills: `design-taste-frontend` (flagship), `minimalist-ui`,
  `industrial-brutalist-ui`, `high-end-visual-design`, `redesign-existing-projects`.

  Image/Stitch skills: `brandkit`, `imagegen-frontend-web`, `imagegen-frontend-mobile`,
  `image-to-code`, `stitch-design-taste` (ships a `DESIGN.md` resource).

  The installer copies each skill into its own directory without overwriting local edits.
