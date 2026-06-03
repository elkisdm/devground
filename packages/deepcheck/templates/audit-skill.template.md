---
name: audit-{{FLOW}}
description: >-
  Skill de auditoría destilada para el flujo "{{FLOW}}". Acumula el conocimiento
  de auditorías previas: invariantes confirmadas, falsos positivos ya descartados,
  y edge cases descubiertos. La cargas ANTES de re-auditar {{FLOW}} para partir de
  un piso más alto y reducir ruido. Generada y mantenida por @devground/deepcheck.
---

# Auditoría destilada — {{FLOW}}

> Generada por deepcheck. Última corrida: {{STAMP}}. Corridas acumuladas: {{RUNS}}.

## Mapa del flujo

{{FLOW_MAP}}

## Invariantes confirmadas

Cosas que SON verdad de este flujo y no hay que re-verificar desde cero (pero sí
re-chequear que sigan siendo verdad si el código cambió):

{{INVARIANTS}}

## Hotspots por dimensión

Dónde mirar primero en cada dimensión, aprendido de corridas anteriores:

{{HOTSPOTS}}

## Falsos positivos conocidos (supresiones)

Hallazgos reportados antes y descartados. **Cada uno lleva fecha + razón.** El
destilador los RE-VALIDA periódicamente: una supresión no es para siempre.

| Hallazgo | Razón del descarte | Fecha | Re-validar después de |
|----------|--------------------|-------|------------------------|
{{SUPPRESSIONS}}

## Edge cases descubiertos

{{EDGE_CASES}}
