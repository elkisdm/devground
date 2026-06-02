# @devground/husky-config

Git hooks setup with Husky. Configures a pre-commit hook that runs lint-staged.

## Install

```bash
pnpm add -D @devground/husky-config husky lint-staged
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
3. Add `"prepare": "husky"` to your `package.json`

### gitleaks (recomendado)

```bash
brew install gitleaks           # macOS
# o ver https://github.com/gitleaks/gitleaks#installing
```

Sin gitleaks el hook no rompe, pero el escaneo de secretos se omite localmente.
Configura gitleaks como job obligatorio en CI para el gate duro. Ver
[ADR-0008](../../docs/adr/0008-higiene-de-secretos.md).
