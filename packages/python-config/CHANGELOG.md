# @devground/python-config

## 1.0.1

### Patch Changes

- 060e4ec: `engines.node` ahora es `>=22.22.1`. El mínimo real ya era ese, porque lint-staged 17 exige `>=22.22.1` (y commitlint 21 `>=22.12.0`); con Node 22.0 a 22.22.0 la instalación fallaba con ERESOLVE. Ahora lo declaramos para que el error sea claro. Además se actualizan dependencias (commander 15.1) y las de desarrollo para cerrar avisos de `pnpm audit`.

## 1.0.0

### Major Changes

- e124d86: Sube el mínimo de Node a 22 (`engines.node` pasa de `>=20` a `>=22`) y se prueba en CI con Node 22 y 24. Node 20 salió de soporte en abril de 2026. Si usas Node 20, quédate en la versión anterior o actualiza Node.
