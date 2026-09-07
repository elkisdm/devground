// .cjs por el mismo motivo que commitlint.config.cjs: `module.exports` dentro
// de un `.js` rompe en proyectos ESM. El repo consume su propio preset.
module.exports = require('@devground/lint-staged-config');
