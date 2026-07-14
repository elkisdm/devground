---
"@devground/sdd": patch
---

El gate de orquestación ahora falla-cerrado cuando jq no está instalado: en vez
de dejar pasar todo en silencio (fail-open), emite un deny pidiendo instalar jq.
En máquinas con jq el comportamiento no cambia. setup-orchestration valida que el
directorio orchestration/ exista en el paquete antes de copiarlo y aborta con
mensaje claro si falta. Se amplió gate.test.sh para cubrir las ramas MCP
mutante/read-only, el allowlist de file-ops en el scratchpad, el stripping de
comillas y el nuevo caso de jq ausente.
