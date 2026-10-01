---
'@devground/sdd': minor
'@devground/dev-metrics': minor
---

spec-flow 0.7 (ADR-0039): el code review deja de correr por defecto y pasa a ser opt-in (una sola pasada cuando se pide). El cierre es un chequeo de conformidad contra la spec, y el pre-mortem suma Consumidores, Datos reales, Variantes y Afirmaciones (Tier 1 con versión mínima). dev-metrics ya no cuenta un spec 0.7 sin review como "sin cierre" y toma `tests` del evento spec.
