import { isValidPreset } from './select.js';
import type { InstallTally } from './tally.js';

/** Whether the --preset value is acceptable; false → the CLI must exit(1). */
export function presetIsValid(preset: string | undefined): boolean {
  return preset === undefined || isValidPreset(preset);
}

/** Process exit code for the final install tally: 1 if anything failed, else 0. */
export function tallyExitCode(tally: InstallTally): 0 | 1 {
  return tally.failed > 0 ? 1 : 0;
}
