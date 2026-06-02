# @devground/husky-config

Git hooks setup with Husky. Configures a `pre-commit` hook that runs
lint-staged and a `commit-msg` hook that validates the message with commitlint.

## Install

```bash
pnpm add -D @devground/husky-config husky lint-staged @commitlint/cli @devground/commitlint-config
```

## Usage

```bash
npx devground-husky
```

This will:
1. Initialize husky (if not already done)
2. Write a `.husky/pre-commit` hook that:
   - Escanea secretos con **gitleaks** (ADR-0008). Si gitleaks detecta un
     secreto, bloquea el commit. Si gitleaks no está instalado, avisa cómo
     instalarlo y **deja pasar** el commit (la garantía dura la da CI).
   - Corre `pnpm exec lint-staged` (lint + format de archivos staged).
3. Write a `.husky/commit-msg` hook that:
   - Valida el mensaje del commit con **commitlint** (`pnpm exec commitlint
     --edit "$1"`), aplicando `@devground/commitlint-config` (ADR-0005). Si el
     mensaje no cumple Conventional Commits, bloquea el commit.
   - Si commitlint no está disponible, avisa y **deja pasar** el commit
     (mismo criterio de degradación explícita que gitleaks; CI es el gate duro).
4. Add `"prepare": "husky"` to your `package.json`

> El `commit-msg` espera encontrar una config de commitlint en el proyecto
> consumidor (p. ej. `commitlint.config.js` que extienda
> `@devground/commitlint-config`). Sin ella, commitlint falla y el commit se
> bloquea — instala y configura ambos paquetes.

### gitleaks (recomendado)

```bash
brew install gitleaks           # macOS
# o ver https://github.com/gitleaks/gitleaks#installing
```

Sin gitleaks el hook no rompe, pero el escaneo de secretos se omite localmente.
Configura gitleaks como job obligatorio en CI para el gate duro. Ver
[ADR-0008](../../docs/adr/0008-higiene-de-secretos.md).
