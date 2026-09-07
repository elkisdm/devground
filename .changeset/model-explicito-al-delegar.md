---
"@devground/sdd": patch
---

La capa `orchestration/` documenta el ruteo de modelo al delegar: la llamada a un subagente lleva `model` explícito por naturaleza de la tarea (búsqueda → sonnet, mecánico → haiku, lógica → sonnet, juicio → opus). Es un bullet condicional: no ordena delegar, solo abarata lo que ya se decidió delegar (ADR-0031).
