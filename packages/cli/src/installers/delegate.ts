// Matches ANSI SGR sequences so we can inspect the delegate's plain text.
const ANSI = /\x1b\[[0-9;]*m/g;

/**
 * The delegated bins (@devground/architecture-guide, husky-config, agents-md,
 * ui-conventions) share a logging convention: a green check line ("✓ ...",
 * from their log()) means it WROTE an artifact. So a "✓" marker in the captured
 * stdout is a uniform signal that the delegate wrote at least one file — letting
 * the CLI report 'skipped' honestly on a re-run instead of always 'installed'.
 */
export function delegateWrote(output: string): boolean {
  return output.replace(ANSI, '').split('\n').some((line) => line.trimStart().startsWith('✓'));
}
