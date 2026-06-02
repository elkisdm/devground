# ADR-0008: Higiene de secretos (gitleaks pre-commit + política de .gitignore)

- **Estado**: Propuesto
- **Fecha**: 2026-06-02
- **Decisor**: edaza
- **Aplica a**: monorepo `devground-1` y proyectos consumidores vía `@devground/husky-config`

## Contexto

La auditoría de 6 proyectos reveló dos incidentes de **higiene de secretos / datos**:

1. **Un secreto productivo filtrado en git**: una credencial real quedó commiteada al historial. Una vez en el historial, el secreto está comprometido aunque se borre en un commit posterior (sigue accesible vía `git log`/`git show`). El daño es difícil de revertir: hay que rotar el secreto y, en el peor caso, reescribir historial.
2. **Archivos de datos y binarios versionados**: `.csv`, `.xlsx`, `.mov`, dumps y `.env` con valores reales entraron al repo. Esto infla el repo, filtra datos sensibles (PII en CSV, credenciales en `.env`) y rompe diffs.

El patrón común: **no había una barrera automática antes del commit**. La revisión manual no escala y falla justo cuando hay prisa. Necesitamos mover el control "shift-left": **bloquear el problema en el pre-commit**, no descubrirlo en producción.

## Decisión

Dos medidas complementarias:

### (a) Hook pre-commit con gitleaks

Añadir **gitleaks** al hook `pre-commit` (vía `@devground/husky-config`). El hook escanea los cambios staged en busca de secretos antes de permitir el commit.

Comportamiento clave — **degradación explícita, nunca silenciosa**:

- Si gitleaks **detecta un secreto** → el commit se **bloquea** (exit ≠ 0) con el reporte de gitleaks.
- Si gitleaks **no está instalado** → el hook **NO rompe el commit en silencio**. Imprime un aviso claro con instrucciones de instalación (`brew install gitleaks`, etc.) y deja pasar el commit. La filosofía: una herramienta de seguridad ausente no debe convertirse en un bloqueo opaco que el dev no entienda; pero el aviso debe ser imposible de ignorar para que el dev la instale.

   > Nota de seguridad: dejar pasar el commit cuando gitleaks falta es un trade-off de **DX sobre garantía**. La garantía dura la da CI (gitleaks como job obligatorio en el pipeline), donde sí debe fallar si la herramienta no está. El hook local es una primera línea de defensa de "buen comportamiento", no la última.

El hook se integra **después** de lint-staged en el mismo `pre-commit`, de modo que un proyecto que ya use `@devground/husky-config` lo obtiene al regenerar sus hooks.

### (b) Política de .gitignore para datos y binarios

Todo proyecto del repo debe ignorar por defecto datos y binarios que no son código fuente:

```gitignore
# Datos / binarios — nunca versionar (ADR-0008)
*.csv
*.xlsx
*.xls
*.mov
*.mp4
*.zip
*.sqlite
*.db

# Env — solo .env.example se versiona
.env
.env.*
!.env.example
```

`.env.example` (con claves pero **sin valores reales**) **sí** se versiona, como contrato de qué variables necesita el proyecto. El resto de variantes `.env*` quedan fuera.

## Consecuencias

**Positivas**
- Barrera automática antes de que un secreto llegue al historial.
- Datos sensibles (PII en CSV, dumps) y binarios pesados dejan de inflar el repo.
- `.env.example` documenta las variables requeridas sin filtrar valores.
- El aviso explícito cuando falta gitleaks educa al dev en vez de fallar misteriosamente.

**Negativas / Trade-offs**
- Falsos positivos de gitleaks ocasionales (ej. claves de ejemplo). Mitigación: `.gitleaksignore` o `# gitleaks:allow` en la línea, documentado y revisable.
- El hook local es saltable con `--no-verify` y no protege si gitleaks no está instalado → **CI debe ser el gate duro** (gitleaks obligatorio en pipeline).
- gitleaks es una dependencia externa que el dev debe instalar manualmente (no es un paquete npm). Es el precio de usar la herramienta estándar del ecosistema.
- Reglas amplias de `.gitignore` (`*.csv`) pueden ocultar un fixture legítimo. Mitigación: `git add -f` puntual y documentado, o ubicar fixtures en una ruta whitelisteada.

## Alternativas consideradas

1. **git-secrets (AWS)**: alternativa a gitleaks. Descartado: gitleaks tiene mejor mantenimiento, detección más amplia y mejor UX de reportes.
2. **Solo CI, sin hook local**: descartado como única medida. El secreto ya estaría pusheado al PR; el hook local lo ataja antes de salir de la máquina. Se usan **ambos** (local + CI).
3. **Romper el commit cuando gitleaks falta**: descartado. Genera fricción opaca ("¿por qué falla mi commit?") y empuja a la gente a `--no-verify` por hábito, destruyendo el valor del hook. Preferimos aviso ruidoso + gate en CI.
4. **`.gitignore` mínimo, confiar en revisión manual**: descartado — es exactamente lo que falló en la auditoría.

## Referencias

- Punto ciego de origen: auditoría de 6 proyectos — un secreto productivo filtrado en git + archivos de datos/binarios versionados.
- gitleaks: https://github.com/gitleaks/gitleaks
- Enforcement implementado en: `packages/husky-config/hooks/pre-commit.sh`, `.husky/pre-commit` (este repo), `.gitignore`.
- Construye sobre [ADR-0005 — Husky + lint-staged](0005-husky-lint-staged.md).
