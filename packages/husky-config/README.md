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

Esto:

1. Activa husky (`husky`, no `husky init`): no toca un `prepare` ni hooks que ya tengas.
2. Copia tres hooks a `.husky/`, solo si no existen (nunca sobrescribe uno tuyo):
   - **`pre-commit`**: escanea secretos con **gitleaks** (ADR-0008) y corre
     `npx --no-install lint-staged` (lint + formato de lo staged). Si gitleaks
     no está instalado, avisa y deja pasar (la garantía dura la da CI).
   - **`commit-msg`**: valida el mensaje con **commitlint** y
     `@devground/commitlint-config` (ADR-0005). Si commitlint no está
     disponible, avisa y deja pasar.
   - **`pre-push`**: si existe el script `test:coverage`, lo corre y avisa si
     la cobertura cae bajo el umbral. Nunca bloquea; CI sí lo exige.
     `SKIP_COVERAGE=1 git push` lo omite.
3. Agrega `"prepare": "husky"` a tu `package.json` si no hay uno.

### Cuando un hook bloquea

Cada bloqueo cierra con un mensaje en lenguaje simple: qué pasó, que tus
cambios no se perdieron y qué pedirle a tu agente para resolverlo **sin
desactivar el control**. Por ejemplo, si el lint falla:

```
  ✖ Commit detenido: el revisor de código encontró problemas en los archivos que estás guardando.
    Arriba aparece cada archivo, la línea y la regla que falló.
    Tus cambios no se perdieron: siguen en tus archivos.
    Pídele a tu agente: "El pre-commit falló por lint; corrige lo que muestra sin desactivar reglas y vuelve a hacer commit".
```

Los hooks se copian una sola vez. Para recibir una versión nueva en un
proyecto que ya los tiene, borra los de `.husky/` que no hayas modificado y
vuelve a correr `npx devground-husky`.

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
