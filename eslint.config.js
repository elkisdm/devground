// Root ESLint flat config for the devground monorepo.
//
// Extends the BASE preset (`@devground/eslint-config`), NOT the Next.js preset:
// the Next preset pulls `eslint-config-next`, whose `eslint` peer is capped at
// versions older than the ESLint 10 we run at the root. The base preset is
// framework-agnostic and loads `@typescript-eslint/parser` (declared as a root
// devDependency) so the ADR-0011 `TSAnyKeyword` rule actually matches `.ts`.
//
// `max-lines`, `max-lines-per-function` and the `any` rule are `warn` in the
// preset on purpose (ADR-0010 / ADR-0011): they inform review without failing.
import baseConfig from '@devground/eslint-config';

export default baseConfig({
  ignores: [
    '**/dist',
    '**/node_modules',
    '**/snapshots',
    'coverage',
  ],
});
