/**
 * Net/gross churn ratio = (added - deleted) / (added + deleted).
 *
 * Interpreted as "code survival": 1 means everything added stayed,
 * 0 means as much was deleted as added, negative means net shrink.
 * Returns `0` when there is no churn at all (avoids division by zero).
 */
export function netGrossRatio(added: number, deleted: number): number {
  const gross = added + deleted;
  if (gross === 0) return 0;
  return (added - deleted) / gross;
}

/**
 * Pearson correlation coefficient `r` between two equal-length series.
 * Returns `null` when it cannot be computed (length < 2, mismatched
 * lengths, or zero variance in either series).
 */
export function pearson(xs: readonly number[], ys: readonly number[]): number | null {
  if (xs.length !== ys.length || xs.length < 2) return null;

  const n = xs.length;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i] as number;
    sumY += ys[i] as number;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let cov = 0;
  let varX = 0;
  let varY = 0;
  for (let i = 0; i < n; i++) {
    const dx = (xs[i] as number) - meanX;
    const dy = (ys[i] as number) - meanY;
    cov += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }

  if (varX === 0 || varY === 0) return null;

  return cov / Math.sqrt(varX * varY);
}

/**
 * Coefficient of determination R^2 = Pearson(r)^2.
 * Returns `null` when the correlation is undefined.
 */
export function rSquared(xs: readonly number[], ys: readonly number[]): number | null {
  const r = pearson(xs, ys);
  if (r === null) return null;
  return r * r;
}

/** Safe percentage: `part / total * 100`, `0` when total is 0. */
export function pct(part: number, total: number): number {
  if (total === 0) return 0;
  return (part / total) * 100;
}

/** Safe ratio that returns `null` instead of dividing by zero. */
export function safeRatio(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return numerator / denominator;
}

/** Rounds to a fixed number of decimals (default 4) for stable JSON output. */
export function round(value: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
