/** The only presets the CLI accepts. */
export const VALID_PRESETS = ['full', 'agents-only'] as const;
export type Preset = (typeof VALID_PRESETS)[number];

/** Narrows an arbitrary string to a known preset. */
export function isValidPreset(value: string): value is Preset {
  return (VALID_PRESETS as readonly string[]).includes(value);
}

/**
 * Resolves which installer values run in non-interactive modes.
 *
 * - `--yes` or `--preset full` → all of them.
 * - `--preset agents-only` → just the agents-md installer.
 * - otherwise → `null`, meaning the caller must fall back to an interactive
 *   prompt (and should refuse to do so in a non-TTY environment).
 *
 * Assumes the preset (if any) has already been validated with
 * {@link isValidPreset}; an unknown preset is treated as interactive.
 */
export function selectPresetValues(
  allValues: string[],
  opts: { yes?: boolean; preset?: string },
): string[] | null {
  if (opts.yes || opts.preset === 'full') return allValues;
  if (opts.preset === 'agents-only') return allValues.filter((v) => v === 'agents-md');
  return null;
}
