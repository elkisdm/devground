---
'@devground/agents-md': minor
---

Add OpenAI Codex CLI support. Codex reads `AGENTS.md` from the repo root natively
(no symlink needed, unlike Claude/Cursor/Copilot/Gemini), so the development rules
already apply. The setup now also writes a project-scoped `.codex/config.toml` that
marks the project Codex-aware and aligns doc discovery (`project_doc_fallback_filenames`,
`project_doc_max_bytes`), leaving any existing `.codex/config.toml` untouched.
