/** The only presets the CLI accepts. */
export const VALID_PRESETS = ['full', 'agents-only', 'rueditas'] as const;
export type Preset = (typeof VALID_PRESETS)[number];

/** Narrows an arbitrary string to a known preset. */
export function isValidPreset(value: string): value is Preset {
  return (VALID_PRESETS as readonly string[]).includes(value);
}

/**
 * Resolves which installer values run in non-interactive modes.
 *
 * - `--yes` or `--preset full` → all of them EXCEPT the `optIn` ones.
 * - `--preset rueditas` → all of them, opt-in included.
 * - `--preset agents-only` → just the agents-md installer.
 * - otherwise → `null`, meaning the caller must fall back to an interactive
 *   prompt (and should refuse to do so in a non-TTY environment).
 *
 * Assumes the preset (if any) has already been validated with
 * {@link isValidPreset}; an unknown preset is treated as interactive.
 * `optIn` lists installer values that only run when asked for explicitly
 * (their own preset or ticking them in the menu).
 */
export function selectPresetValues(
  allValues: string[],
  opts: { yes?: boolean; preset?: string },
  optIn: string[],
): string[] | null {
  if (opts.preset === 'rueditas') return allValues;
  if (opts.yes || opts.preset === 'full') return allValues.filter((v) => !optIn.includes(v));
  if (opts.preset === 'agents-only') return allValues.filter((v) => v === 'agents-md');
  return null;
}

/** How the CLI should obtain the installer selection. */
export type InstallResolution =
  { kind: 'install'; values: string[]; defaulted: boolean } | { kind: 'prompt' };

/**
 * Resolves the installer selection without any IO, so the precedence is
 * testable:
 *
 * 1. An explicit `--yes`/`--preset` wins.
 * 2. Otherwise, in a NON-interactive environment we cannot show a multiselect,
 *    so we default to the full preset (opt-in installers excluded) and flag it (`defaulted`) so the caller
 *    can log the choice. This replaces an earlier hard error: refusing to
 *    install anything turned every CI/piped run red, while the real risk the
 *    refusal guarded against — a silent "installed nothing" success — is avoided
 *    here by installing the full set: every installer (and every bin it
 *    delegates to, e.g. agents-md and husky-config) enforces "never overwrite,
 *    never delete" on existing files, so a re-run on a configured project
 *    stays safe.
 * 3. Only an interactive TTY falls through to `prompt`.
 */
export function resolveInstall(
  allValues: string[],
  opts: { yes?: boolean; preset?: string },
  isTTY: boolean,
  optIn: string[],
): InstallResolution {
  const preset = selectPresetValues(allValues, opts, optIn);
  if (preset !== null) return { kind: 'install', values: preset, defaulted: false };
  if (!isTTY)
    return {
      kind: 'install',
      values: allValues.filter((v) => !optIn.includes(v)),
      defaulted: true,
    };
  return { kind: 'prompt' };
}
