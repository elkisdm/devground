---
"@devground/tsconfig": patch
---

El preset next-loose ahora se incluye en el tarball publicado (antes estaba
documentado y recomendado pero excluido de files/exports, así que
`extends: "@devground/tsconfig/next-loose.json"` fallaba con module-not-found
para los consumidores).
