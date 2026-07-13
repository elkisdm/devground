---
'@devground/sdd': major
---

Declare the package stable at 1.0.0 (ADR-0026, consolidation phase).

No behaviour changes: the bump is the semver commitment itself. From 1.0.0 on,
any breaking change to the `devground-sdd` installer, the spec-flow skill
contract (tiers, telemetry events) or the installed file layout requires a
major release. Internal adoption depends on this package; `0.x` no longer
reflects its contract.
