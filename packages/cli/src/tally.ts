/** Running tally of installer outcomes. */
export interface InstallTally {
  installed: number;
  skipped: number;
  failed: number;
}

/**
 * Builds the human-facing summary line from a tally. Pure so it can be unit
 * tested without driving the whole CLI. Reports skips honestly instead of
 * counting them as successful installs.
 */
export function formatTally(tally: InstallTally): string {
  const parts = [`${tally.installed} configured`];
  if (tally.skipped > 0) parts.push(`${tally.skipped} skipped (already present)`);
  if (tally.failed > 0) parts.push(`${tally.failed} failed`);
  return parts.join(', ') + '.';
}
