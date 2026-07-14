---
"@devground/husky-config": minor
---

Los hooks pre-commit y commit-msg ya no hardcodean "pnpm exec": usan un runner
agnóstico del package manager (npx --no-install), así los commits funcionan en
proyectos npm/yarn (antes fallaban con exit 127). commit-msg además reporta el
diagnóstico correcto cuando commitlint falta. Y un pre-commit / commit-msg /
pre-push o un script "prepare" preexistentes ya no se sobreescriben. Corrige
además un caso encontrado en la verificación e2e: en un proyecto nuevo,
"husky init" crea su propio placeholder en .husky/pre-commit ("npm test"), que
el guard trataba como un hook real y nunca lo reemplazaba por lint-staged +
gitleaks — ahora ese placeholder específico se limpia antes de instalar los
hooks reales, sin tocar un hook genuino del usuario.
