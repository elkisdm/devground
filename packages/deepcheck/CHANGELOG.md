# @devground/deepcheck

## 0.0.1

### Patch Changes

- 06d175a: Agrega una guarda de deriva para las funciones puras que workflow.js duplica de
  src/lib.ts (el umbral de confirmación adversarial isConfirmed, sevRank, partition):
  un test falla si la copia del workflow diverge de la lógica testeada en lib.ts.
