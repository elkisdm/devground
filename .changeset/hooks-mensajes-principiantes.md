---
'@devground/husky-config': minor
---

Cada bloqueo de los hooks cierra con un mensaje en lenguaje simple: qué pasó, que los cambios no se perdieron y qué pedirle al agente para resolverlo sin desactivar el control. Aplica al lint del pre-commit, al formato del mensaje de commit (con un ejemplo), a gitleaks y al aviso de cobertura del pre-push.

Los hooks se copian una sola vez y nunca se sobrescriben. Para recibir los mensajes nuevos en un proyecto que ya los tiene, borra `.husky/pre-commit`, `.husky/commit-msg` y `.husky/pre-push` (si no los modificaste) y vuelve a correr `npx devground-husky`.
