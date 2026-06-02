import { pct } from './stats.js';

/**
 * Given a list of (key -> count) touches, computes the one-shot vs. heavily
 * re-touched distribution. Used for both git file re-touch and transcript
 * per-file iteration; the threshold differs per caller.
 *
 * @param counts        Map of identifier -> number of touches.
 * @param heavyThreshold A file with >= this many touches counts as "heavy".
 */
export function touchDistribution(
  counts: ReadonlyMap<string, number>,
  heavyThreshold: number,
): { files: number; oneShot: number; heavy: number; oneShotPct: number; heavyPct: number; opsPerFile: number } {
  const files = counts.size;
  let oneShot = 0;
  let heavy = 0;
  let totalOps = 0;

  for (const n of counts.values()) {
    totalOps += n;
    if (n === 1) oneShot++;
    if (n >= heavyThreshold) heavy++;
  }

  return {
    files,
    oneShot,
    heavy,
    oneShotPct: pct(oneShot, files),
    heavyPct: pct(heavy, files),
    opsPerFile: files === 0 ? 0 : totalOps / files,
  };
}

/** Increments a key's count in a mutable Map accumulator. */
export function bump(map: Map<string, number>, key: string, by = 1): void {
  map.set(key, (map.get(key) ?? 0) + by);
}
