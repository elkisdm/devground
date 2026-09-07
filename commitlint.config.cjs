// .cjs a proposito: `module.exports` dentro de un `.js` rompe el hook en
// cualquier proyecto con "type": "module" (el fix que salio en devground-init
// 1.4.1). El repo consume su propio preset via workspace.
module.exports = { extends: ['@devground/commitlint-config'] };
