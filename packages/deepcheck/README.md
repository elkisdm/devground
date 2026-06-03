# @devground/deepcheck

> **Verificación profunda con agentes que aprenden.**
> Audita un flujo o feature desplegando 3 roles (QA · Validación · Auditoría) en
> paralelo por dimensiones, confirma cada hallazgo adversarialmente, y destila una
> skill de auditoría específica del flujo que se vuelve más afilada en cada corrida.

> ⚠️ **Estado: piloto.** Se está validando el concepto sobre un flujo real del
> propio devground (`devground-init`) antes de publicar. La forma de entrega
> (bin `setup.js`) y la destilación de skills son fases posteriores.

## Por qué no es un linter

Un linter aplica reglas fijas. deepcheck **razona** sobre un flujo, **confirma**
sus hallazgos para no generar ruido, y **acumula conocimiento** del flujo para no
re-descubrir lo mismo dos veces — reduciendo iteraciones sobre el mismo código.

## Los 3 roles (ortogonales)

| Rol | Pregunta | Naturaleza |
|-----|----------|------------|
| **QA** | ¿Funciona? | Caminos, edge cases, errores. |
| **Validación** | ¿Es lo que se pedía? | Requisitos, contratos. |
| **Auditoría** | ¿Está bien construida? | Seguridad, perf, límites, tipos, tests — contra los ADRs de devground. |

Detalle en [`skills/deepcheck/references/roles.md`](skills/deepcheck/references/roles.md).

## Cómo funciona

1. **Review** — los 3 roles abren sus dimensiones como subagentes en paralelo
   (vía la herramienta `Workflow`). Cada dimensión produce hallazgos con evidencia.
2. **Verify** — cada hallazgo pasa por refutadores independientes con lentes
   distintas. Solo sobrevive lo que la mayoría NO logra refutar. **El resto se
   reporta como descartado, nunca se oculta.**
3. **Synthesize** — reporte por rol/dimensión + ledger versionado.
4. **(Fase 2) Distill** — se escribe/actualiza `audit-<flujo>/SKILL.md` con el
   conocimiento acumulado. Las supresiones llevan fecha + razón y se re-validan
   (anti-ceguera por sobreajuste).

## Estructura

```
deepcheck/
├── skills/deepcheck/        # skill orquestadora + rúbrica de roles
├── workflows/               # script de Workflow (el ejecutable)
├── templates/               # plantilla de la skill destilada por flujo
└── audits/                  # ledger de corridas (salida)
```

## Riesgo conocido

La auto-mejora puede **degenerar en ceguera**: una skill que solo acumula "ignora
esto" puede suprimir regresiones reales. Por eso las supresiones caducan y se
re-validan. Es la parte del sistema que hay que vigilar.
