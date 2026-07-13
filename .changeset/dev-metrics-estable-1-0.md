---
'@devground/dev-metrics': major
---

Declare the public API stable at 1.0.0 (ADR-0026, consolidation phase).

No behaviour changes: the bump is the semver commitment itself. From 1.0.0 on,
any breaking change to the CLI commands, their flags/output, or the exported
`.`/`./transcript`/`./memory` entry points requires a major release. Internal
adoption depends on this package; `0.x` ("anything may break") no longer
reflects its contract.
