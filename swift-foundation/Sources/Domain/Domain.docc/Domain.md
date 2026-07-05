# ``Domain``

Núcleo de dominio en Swift puro sobre `Foundation`: la **frontera de portabilidad**
de la app.

## Overview

La capa `Domain` no importa UIKit ni SwiftUI. Contiene entidades, casos de uso y los
protocolos de repositorio que la capa de datos implementa (inversión de dependencias).
Es `nonisolated` + `Sendable`, por lo que cruza fronteras de aislamiento con seguridad
y se prueba de forma aislada, sin UI ni red real.

Al mantener esta capa libre de dependencias de plataforma se habilita compartir la lógica
con Android más adelante (KMP / Skip) sin reescritura, y se maximiza la testabilidad hoy.

## Topics

### Autenticación

- ``SignInWithBiometricsUseCase``
- ``BiometricAuthenticating``
- ``AuthRepository``
- ``AuthSession``
- ``AuthError``

### Usuarios

- ``User``
- ``UserRepository``
- ``FetchUserUseCase``
