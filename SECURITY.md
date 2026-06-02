# Política de Seguridad

Gracias por ayudar a mantener `devground` y sus paquetes (`@devground/*`, `devground-init`) seguros para todos.

## Versiones soportadas

Se da soporte de seguridad únicamente a la **última versión publicada** de cada paquete `@devground/*`. Antes de reportar, actualiza a la última versión y verifica que el problema persiste.

## Cómo reportar una vulnerabilidad

**No abras un issue público para vulnerabilidades de seguridad.** Un issue público expone el problema antes de que exista un parche.

Usa uno de estos canales privados:

1. **GitHub Security Advisories (preferido)**: ve a la pestaña [**Security → Report a vulnerability**](https://github.com/elkisdm/devground/security/advisories/new) del repositorio. Esto abre un canal privado entre tú y los maintainers.
2. **Si no puedes usar GitHub Advisories**: contacta de forma privada a los maintainers a través de los datos de contacto del [perfil de la organización en GitHub](https://github.com/elkisdm). No publiques detalles en canales abiertos (issues, discussions, PRs).

### Qué incluir en el reporte

Para acelerar el triage, incluye en la medida de lo posible:

- Paquete y versión afectados (ej. `@devground/eslint-config@1.0.0`).
- Tipo de vulnerabilidad y componente afectado.
- Pasos para reproducir o una prueba de concepto.
- Impacto potencial (qué puede lograr un atacante).
- Cualquier mitigación temporal que conozcas.

## Qué esperar

- **Acuse de recibo**: dentro de **72 horas** desde el reporte.
- **Evaluación inicial**: dentro de **7 días**, te confirmaremos si lo consideramos vulnerabilidad y su severidad.
- **Resolución**: trabajaremos en un parche de forma coordinada contigo. Una vez publicado el fix, divulgaremos el problema (con crédito al reportante, si lo deseas).

## Divulgación responsable

Pedimos que **no divulgues públicamente** la vulnerabilidad hasta que haya un parche disponible y se haya coordinado la fecha de publicación. Valoramos y reconocemos a quienes reportan de forma responsable.

## Alcance

Este repositorio distribuye **tooling de desarrollo** (configuraciones de ESLint/Prettier/TypeScript, hooks de git, plantillas y documentación). Son relevantes para seguridad, por ejemplo:

- Ejecución de código arbitrario al instalar o ejecutar los CLIs (`devground-init`, `devground-setup`, `devground-architecture`, `devground-adr`).
- Inyección a través de los hooks de git generados (`@devground/husky-config`).
- Filtración de secretos por fallos en la higiene de secretos (ver [ADR-0008](docs/adr/0008-higiene-de-secretos.md)).
- Dependencias transitorias vulnerables introducidas por estos paquetes.

Quedan **fuera de alcance**: vulnerabilidades en el código de *tu* proyecto que adopta estos presets, y problemas en dependencias de terceros que ya tengan un advisory público upstream (repórtalos al proyecto correspondiente).
