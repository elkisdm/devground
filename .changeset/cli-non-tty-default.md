---
"devground-init": patch
---

Fix: in a non-interactive environment (CI, piped stdin, some IDE terminals)
`devground-init` no longer errors out with a hard exit 1 when no `--preset`/`--yes`
is given. It now defaults to the full preset and logs that choice. The write-guard
still skips existing files, so re-running on an already-configured project stays
safe. Use `--preset agents-only` or `--yes` to choose explicitly.
