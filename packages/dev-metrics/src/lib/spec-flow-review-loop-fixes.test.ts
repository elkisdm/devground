import { describe, it, expect } from 'vitest';
import { parseSpecFlowLog } from './spec-flow-events.js';
import { joinChanges, reviewLoopStats, aggregateReviewLoop } from './spec-flow-review-loop.js';

/**
 * F2/F3/F4/F6: universe/denominator fixes on top of L-10's consumers
 * (`spec-flow-review-loop.test.ts`), split into its own file to keep that
 * file under `max-lines`. Same fixtures as `spec-flow-review-loop.test.ts`.
 */

const LINE = (o: Record<string, unknown>) => JSON.stringify(o);

function specLine(over: Record<string, unknown> = {}): string {
  return LINE({
    event: 'spec',
    date: '2026-09-14',
    change: 'x',
    tier: 2,
    spec_flow_version: '0.6',
    ...over,
  });
}

function reviewLine(over: Record<string, unknown> = {}): string {
  return LINE({ event: 'review', date: '2026-09-14', change: 'x', level: 'high', ...over });
}

function toParsed(
  lines: string[],
): [
  ReturnType<typeof parseSpecFlowLog>['specs'],
  ReturnType<typeof parseSpecFlowLog>['reviews'],
  ReturnType<typeof parseSpecFlowLog>['reversals'],
] {
  const { specs, reviews, reversals } = parseSpecFlowLog(lines.join('\n'));
  return [specs, reviews, reversals];
}

describe('F8: joinChanges no pierde un review sin ts real del mismo dia', () => {
  it('un review sin ts real (ts===date) del MISMO dia que un spec con ts real se une', () => {
    const { specs, reviews } = parseSpecFlowLog(
      [
        specLine({ ts: '2026-09-14T09:00:00Z', date: '2026-09-14' }),
        // no `ts` in the raw event -> the parser falls back to ts = date (midnight)
        reviewLine({ date: '2026-09-14', findings: 2 }),
      ].join('\n'),
    );
    const changes = joinChanges(specs, reviews);
    expect(changes[0]!.review).not.toBeNull();
    expect(changes[0]!.review!.findings).toBe(2);
  });
});

describe('F11: findings_capped:false sin findings numerico no es exacto', () => {
  it('cuenta en nTotal, no en nExact', () => {
    const { specs, reviews } = parseSpecFlowLog(
      [
        specLine({ premortem: { na: 1 } }),
        reviewLine({ findings: 'pending', findings_capped: false }),
      ].join('\n'),
    );
    const stats = reviewLoopStats(specs, reviews);
    const arm = stats.firstPassFindings.premortem!;
    expect(arm.nTotal).toBe(1);
    expect(arm.nExact).toBe(0);
    expect(arm.nCensored).toBe(0);
    expect(arm.nUnknownCap).toBe(1);
    expect(arm.meanExact).toBeNull();
  });
});

describe('F7: aggregateReviewLoop.unclosed.rate es la mediana por repo', () => {
  it('nunca count/n agrupado', () => {
    const emptyStats = reviewLoopStats(...toParsed([]));
    const repoA = { ...emptyStats, unclosed: { count: 1, n: 100 } };
    const repoB = { ...emptyStats, unclosed: { count: 2, n: 2 } };
    const agg = aggregateReviewLoop([repoA, repoB]);
    expect(agg.unclosed).toEqual({ rate: 0.505, count: 3, n: 102, repos: 2 }); // not 3/102 = 0.03
  });
});

describe('F2/F6: universo de verifiedShare (0.6-only, tests real) e inline-vs-event', () => {
  it('F2: universo = solo 0.6 con tests real (excluye 0.5 "added" y 0.6 "n/a")', () => {
    const { specs, reviews } = parseSpecFlowLog(
      [
        // 0.5 change with tests:"added" — must NOT count under the old, unrestricted universe.
        specLine({ change: 'a', spec_flow_version: '0.5' }),
        reviewLine({ change: 'a', tests: 'added' }),
        // 0.6 change with tests:"n/a" — must NOT count as a false negative for "verified".
        specLine({ change: 'b' }),
        reviewLine({ change: 'b', tests: 'n/a' }),
        // 0.6 change with tests:"verified" — the only one that should count.
        specLine({ change: 'c' }),
        reviewLine({ change: 'c', tests: 'verified' }),
      ].join('\n'),
    );
    const stats = reviewLoopStats(specs, reviews);
    expect(stats.verifiedShare).toEqual({ rate: 1, n: 1 });
  });

  it('F6: un inline completo (found_total/open/tests) da el MISMO resultado que el evento review equivalente', () => {
    const inlineLine = LINE({
      event: 'spec',
      date: '2026-09-14',
      change: 'x',
      tier: 2,
      spec_flow_version: '0.6',
      review: {
        level: 'high',
        found_total: 5,
        resolved: 5,
        open: 1,
        tests: 'verified',
      },
    });
    const eventLines = [
      specLine({ change: 'x' }),
      reviewLine({ change: 'x', found_total: 5, resolved: 5, open: 1, tests: 'verified' }),
    ].join('\n');

    const inline = parseSpecFlowLog(inlineLine);
    const asEvent = parseSpecFlowLog(eventLines);
    const inlineStats = reviewLoopStats(inline.specs, inline.reviews);
    const eventStats = reviewLoopStats(asEvent.specs, asEvent.reviews);

    expect(inlineStats.open).toEqual({ sum: 1, median: 1, n: 1 });
    expect(inlineStats.resolvedShare).toEqual({ ratio: 1, n: 1 });
    expect(inlineStats.verifiedShare).toEqual({ rate: 1, n: 1 });
    expect(inlineStats.open).toEqual(eventStats.open);
    expect(inlineStats.resolvedShare).toEqual(eventStats.resolvedShare);
    expect(inlineStats.verifiedShare).toEqual(eventStats.verifiedShare);
  });
});

describe('F3/F4/F6: resolvedShare/reversalRate denominators, inline review invariant 7', () => {
  it('F3: resolvedShare excluye una review level:"n/a" aunque traiga resolved/found_total', () => {
    const { specs, reviews } = parseSpecFlowLog(
      [specLine(), reviewLine({ level: 'n/a', resolved: 3, found_total: 4 })].join('\n'),
    );
    const stats = reviewLoopStats(specs, reviews);
    expect(stats.resolvedShare).toBeNull();
  });

  it('F4: reversalRate divide por el maximo assumptions declarado, no por el del spec re-emitido', () => {
    const { specs, reviews, reversals } = parseSpecFlowLog(
      [
        specLine({ ts: '2026-09-14T08:00:00Z', assumptions: 10 }),
        LINE({ event: 'assumption_reversed', date: '2026-09-14', change: 'x' }),
        specLine({ ts: '2026-09-14T09:00:00Z', assumptions: 3 }), // re-emitted, shrunk
      ].join('\n'),
    );
    const stats = reviewLoopStats(specs, reviews, reversals);
    expect(stats.reversalRate).toEqual({ ratio: 0.1, n: 1 }); // 1/10, not 1/3
  });

  it('F6: invariante 7 tambien vale para el review INLINE (found_total/open/tests)', () => {
    const reversalLine = LINE({ event: 'assumption_reversed', date: '2026-09-14', change: 'a' });
    function inlineSpecLine(reviewOverrides: Record<string, unknown> = {}): string {
      return LINE({
        event: 'spec',
        date: '2026-09-14',
        change: 'a',
        tier: 2,
        spec_flow_version: '0.6',
        assumptions: 4,
        review: {
          level: 'high',
          passes: 2,
          findings: 3,
          findings_capped: false,
          induced: 1,
          resolved: 3,
          found_total: 4,
          open: 1,
          redesigned: true,
          tests: 'verified',
          ...reviewOverrides,
        },
      });
    }
    function statsFor(reviewOverrides: Record<string, unknown>) {
      const { specs, reviews, reversals } = parseSpecFlowLog(
        [inlineSpecLine(reviewOverrides), reversalLine].join('\n'),
      );
      return reviewLoopStats(specs, reviews, reversals);
    }
    const baseline = statsFor({});
    expect(statsFor({ found_total: undefined })).not.toEqual(baseline);
    expect(statsFor({ open: undefined })).not.toEqual(baseline);
    expect(statsFor({ tests: undefined })).not.toEqual(baseline);
  });
});
