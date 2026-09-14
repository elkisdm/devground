import { describe, it, expect } from 'vitest';
import { parseSpecFlowLog } from './spec-flow-events.js';
import {
  joinChanges,
  isApplicable,
  reviewLoopStats,
  aggregateReviewLoop,
  type ReviewRecord,
} from './spec-flow-review-loop.js';

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

// ---------------------------------------------------------------------------
// L-1: unit = the change
// ---------------------------------------------------------------------------

describe('L-1: joinChanges', () => {
  it('colapsa dos lineas review del mismo change en un solo review (el ultimo por ts)', () => {
    const { specs, reviews } = parseSpecFlowLog(
      [
        specLine(),
        reviewLine({ ts: '2026-09-14T10:00:00Z', findings: 3 }),
        reviewLine({ ts: '2026-09-14T12:00:00Z', findings: 9 }),
      ].join('\n'),
    );
    const changes = joinChanges(specs, reviews);
    expect(changes).toHaveLength(1);
    expect(changes[0]!.review?.findings).toBe(9);
  });

  it('un spec sin change valido se descarta, nunca se agrupa con otros', () => {
    const { specs, reviews } = parseSpecFlowLog(
      [specLine({ change: '' }), specLine({ change: 'real' })].join('\n'),
    );
    const changes = joinChanges(specs, reviews);
    expect(changes).toHaveLength(1);
    expect(changes[0]!.spec.change).toBe('real');
  });

  it('nombre reutilizado: spec julio + review julio, spec sept sin review -> 1 cambio abierto', () => {
    const { specs, reviews } = parseSpecFlowLog(
      [
        specLine({ ts: '2026-07-01T00:00:00Z', date: '2026-07-01' }),
        reviewLine({ ts: '2026-07-02T00:00:00Z', date: '2026-07-02', findings: 3 }),
        specLine({ ts: '2026-09-01T00:00:00Z', date: '2026-09-01' }),
      ].join('\n'),
    );
    const changes = joinChanges(specs, reviews);
    expect(changes).toHaveLength(1); // the two specs collapsed by `change`, latest wins
    expect(changes[0]!.spec.ts).toBe('2026-09-01T00:00:00Z');
    expect(changes[0]!.review).toBeNull(); // july's review is before september's spec ts -> open
  });

  it('sin review de ningun tipo -> change abierto (review: null)', () => {
    const { specs, reviews } = parseSpecFlowLog(specLine());
    const changes = joinChanges(specs, reviews);
    expect(changes[0]!.review).toBeNull();
  });

  it('count() <= n en cualquier metrica derivada (ejemplo: unclosed)', () => {
    const { specs, reviews } = parseSpecFlowLog(
      [specLine({ change: 'a' }), specLine({ change: 'b' })].join('\n'),
    );
    const stats = reviewLoopStats(specs, reviews);
    expect(stats.unclosed!.count).toBeLessThanOrEqual(stats.unclosed!.n);
  });
});

// ---------------------------------------------------------------------------
// L-2: absent = unknown, never zero/false; "no aplico" excludes from everything
// ---------------------------------------------------------------------------

describe('L-2: ausente es desconocido, "no aplico" excluye de todo', () => {
  it('passes:0 no es un bucle acotado (invalido, no cuenta)', () => {
    const { specs, reviews } = parseSpecFlowLog(
      [specLine(), reviewLine({ passes: 0, findings: 1 })].join('\n'),
    );
    const stats = reviewLoopStats(specs, reviews);
    expect(stats.passes).toBeNull();
  });

  it('level "n/a" excluye el cambio de TODAS las metricas de review, incluido "sin cierre"', () => {
    const { specs, reviews } = parseSpecFlowLog(
      [specLine(), reviewLine({ level: 'n/a', findings: 5, passes: 2 })].join('\n'),
    );
    const stats = reviewLoopStats(specs, reviews);
    expect(stats.passes).toBeNull();
    expect(stats.capped).toBeNull();
    expect(stats.unclosed).toBeNull(); // el unico cambio 0.6 es "no aplico" -> universo vacio
  });

  it('un ReviewRecord con level "n/a" no es aplicable', () => {
    const r: ReviewRecord = { ts: '2026-09-14', level: 'n/a' };
    expect(isApplicable(r)).toBe(false);
    expect(isApplicable(null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// L-3: tripartite censoring
// ---------------------------------------------------------------------------

describe('L-3: censura tripartita', () => {
  it('un brazo totalmente censurado no es null y conserva su n', () => {
    const { specs, reviews } = parseSpecFlowLog(
      [
        specLine({ change: 'a', premortem: { na: 1 } }),
        reviewLine({ change: 'a', findings: 9, findings_capped: true }),
        specLine({ change: 'b', premortem: { na: 2 } }),
        reviewLine({ change: 'b', findings: 20, findings_capped: true }),
      ].join('\n'),
    );
    const stats = reviewLoopStats(specs, reviews);
    const arm = stats.firstPassFindings.premortem;
    expect(arm).not.toBeNull();
    expect(arm!.meanExact).toBeNull();
    expect(arm!.nTotal).toBe(2);
    expect(arm!.nCensored).toBe(2);
    expect(arm!.cappedShare).toBe(1);
  });

  it('findings_capped ausente entra en nUnknownCap, no cuenta como exacto ni censurado', () => {
    const { specs, reviews } = parseSpecFlowLog(
      [specLine({ premortem: { na: 1 } }), reviewLine({ findings: 4 })].join('\n'),
    );
    const stats = reviewLoopStats(specs, reviews);
    const arm = stats.firstPassFindings.premortem!;
    expect(arm.nExact).toBe(0);
    expect(arm.nCensored).toBe(0);
    expect(arm.nUnknownCap).toBe(1);
    expect(arm.cappedShare).toBeNull(); // denominador (exact+censored) es 0
  });
});

// ---------------------------------------------------------------------------
// L-4: unclosed
// ---------------------------------------------------------------------------

describe('L-4: sin cierre', () => {
  it('spec 0.6 sin review cuenta como sin cierre', () => {
    const { specs, reviews } = parseSpecFlowLog(specLine());
    const stats = reviewLoopStats(specs, reviews);
    expect(stats.unclosed).toEqual({ count: 1, n: 1 });
  });

  it('spec 0.5 con review inline findings:"pending" cuenta como sin cierre', () => {
    const line = LINE({
      event: 'spec',
      date: '2026-09-14',
      change: 'x',
      tier: 1,
      spec_flow_version: '0.5',
      review: { level: 'high', findings: 'pending' },
    });
    const { specs, reviews } = parseSpecFlowLog(line);
    const stats = reviewLoopStats(specs, reviews);
    expect(stats.unclosed).toEqual({ count: 1, n: 1 });
  });

  it('count <= n con universo mixto (una cerrada, una sin cerrar)', () => {
    const { specs, reviews } = parseSpecFlowLog(
      [
        specLine({ change: 'a' }),
        reviewLine({ change: 'a', findings: 2 }),
        specLine({ change: 'b' }), // sin review -> sin cierre
      ].join('\n'),
    );
    const stats = reviewLoopStats(specs, reviews);
    expect(stats.unclosed).toEqual({ count: 1, n: 2 });
    expect(stats.unclosed!.count).toBeLessThanOrEqual(stats.unclosed!.n);
  });
});

// ---------------------------------------------------------------------------
// L-5: exhaustive, exclusive arms
// ---------------------------------------------------------------------------

describe('L-5: brazos exhaustivos y excluyentes', () => {
  it('exhaustividad: la suma de nTotal de los brazos = cambios 0.6 T2+ con review aplicable', () => {
    const { specs, reviews } = parseSpecFlowLog(
      [
        specLine({ change: 'a', premortem: { na: 2 } }), // premortem
        reviewLine({ change: 'a', findings: 1 }),
        specLine({ change: 'b', premortem: { na: 5 } }), // compliance (na>=4)
        reviewLine({ change: 'b', findings: 2 }),
        specLine({ change: 'c', premortem: false }), // compliance (skipped)
        reviewLine({ change: 'c', findings: 3 }),
        specLine({ change: 'd' }), // undeclared (absent)
        reviewLine({ change: 'd', findings: 4 }),
        specLine({ change: 'e', premortem: true }), // undeclared (legacy true)
        reviewLine({ change: 'e', findings: 5 }),
        specLine({ change: 'f', premortem: { na: 2 } }), // premortem, but review n/a -> excluded from universe
        reviewLine({ change: 'f', level: 'n/a' }),
      ].join('\n'),
    );
    const stats = reviewLoopStats(specs, reviews);
    const { premortem, compliance, undeclared } = stats.firstPassFindings;
    const total = (premortem?.nTotal ?? 0) + (compliance?.nTotal ?? 0) + (undeclared?.nTotal ?? 0);
    expect(total).toBe(5); // a,b,c,d,e (f excluded: review level "n/a" = "no aplico")
    expect(premortem!.nTotal).toBe(1); // a
    expect(compliance!.nTotal).toBe(2); // b, c
    expect(undeclared!.nTotal).toBe(2); // d, e
  });

  it('na=3 exacto entra a premortem, nunca a compliance (guarda contra el mutante na>=3)', () => {
    const { specs, reviews } = parseSpecFlowLog(
      [specLine({ premortem: { na: 3 } }), reviewLine({ findings: 1 })].join('\n'),
    );
    const stats = reviewLoopStats(specs, reviews);
    expect(stats.firstPassFindings.premortem!.nTotal).toBe(1);
    expect(stats.firstPassFindings.compliance).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// L-6: the intermediate inline contract on a 0.6 spec is read as a review
// ---------------------------------------------------------------------------

describe('L-6: contrato intermedio (review inline en un spec 0.6, atlas/core)', () => {
  const line = LINE({
    event: 'spec',
    date: '2026-09-14',
    change: 'x',
    tier: 2,
    spec_flow_version: '0.6',
    premortem: true,
    review: {
      level: 'high',
      passes: 2,
      findings: 2,
      findings_capped: false,
      induced: 2,
      resolved: 4,
      redesigned: false,
    },
  });

  it('entra en passes/induced y en el brazo undeclared, no cuenta como sin cierre', () => {
    const { specs, reviews } = parseSpecFlowLog(line);
    const stats = reviewLoopStats(specs, reviews);
    expect(stats.passes).toEqual({ median: 2, sharePassesAtMost2: 1, n: 1 });
    expect(stats.induced!.n).toBe(1);
    expect(stats.firstPassFindings.undeclared!.nTotal).toBe(1);
    expect(stats.unclosed).toEqual({ count: 0, n: 1 }); // tiene review aplicable con findings -> no sin cierre
  });
});

// ---------------------------------------------------------------------------
// L-10: every field the parser writes has a consumer
// ---------------------------------------------------------------------------

describe('L-10: assumptions/gate/tests/resolved tienen consumidor', () => {
  it('reversalRate = reversiones / suma de assumptions', () => {
    const { specs, reviews, reversals } = parseSpecFlowLog(
      [
        specLine({ assumptions: 4 }),
        LINE({ event: 'assumption_reversed', date: '2026-09-14', change: 'x' }),
      ].join('\n'),
    );
    const stats = reviewLoopStats(specs, reviews, reversals);
    expect(stats.reversalRate).toEqual({ ratio: 0.25, n: 1 });
  });

  it('gateAdoption = suma gaps_adopted / suma gaps_found', () => {
    const { specs, reviews } = parseSpecFlowLog(
      specLine({ spec_review: { gaps_found: 4, gaps_adopted: 2 } }),
    );
    const stats = reviewLoopStats(specs, reviews);
    expect(stats.gateAdoption).toEqual({ ratio: 0.5, n: 1 });
  });

  it('verifiedShare = proporcion de tests:"verified" en T2+ con review aplicable', () => {
    const { specs, reviews } = parseSpecFlowLog(
      [specLine({ change: 'a' }), reviewLine({ change: 'a', tests: 'verified' })].join('\n'),
    );
    const stats = reviewLoopStats(specs, reviews);
    expect(stats.verifiedShare).toEqual({ rate: 1, n: 1 });
  });

  it('resolvedShare = suma resolved / suma found_total', () => {
    const { specs, reviews } = parseSpecFlowLog(
      [specLine(), reviewLine({ resolved: 3, found_total: 4 })].join('\n'),
    );
    const stats = reviewLoopStats(specs, reviews);
    expect(stats.resolvedShare).toEqual({ ratio: 0.75, n: 1 });
  });

  it('invariante 7: quitar cualquiera de estos campos cambia el resultado agregado', () => {
    const fullCorpus = [
      specLine({
        change: 'a',
        assumptions: 4,
        premortem: { na: 1 },
        spec_review: { gaps_found: 2, gaps_adopted: 1 },
      }),
      reviewLine({
        change: 'a',
        passes: 2,
        findings: 3,
        findings_capped: false,
        induced: 1,
        resolved: 3,
        found_total: 4,
        open: 1,
        redesigned: true,
        tests: 'verified',
      }),
      LINE({ event: 'assumption_reversed', date: '2026-09-14', change: 'a' }),
    ];

    function statsFor(fields: Record<string, unknown>) {
      const merged = { ...(JSON.parse(fullCorpus[1]!) as Record<string, unknown>), ...fields };
      const lines = [fullCorpus[0]!, JSON.stringify(merged), fullCorpus[2]!];
      const { specs, reviews, reversals } = parseSpecFlowLog(lines.join('\n'));
      return reviewLoopStats(specs, reviews, reversals);
    }

    const baseline = statsFor({});

    // Removing/blanking each field must change SOME part of the stats.
    expect(statsFor({ passes: undefined })).not.toEqual(baseline);
    expect(statsFor({ induced: undefined })).not.toEqual(baseline);
    expect(statsFor({ resolved: undefined })).not.toEqual(baseline);
    expect(statsFor({ found_total: undefined })).not.toEqual(baseline);
    expect(statsFor({ open: undefined })).not.toEqual(baseline);
    expect(statsFor({ redesigned: undefined })).not.toEqual(baseline);
    expect(statsFor({ tests: undefined })).not.toEqual(baseline);
    expect(statsFor({ findings_capped: undefined })).not.toEqual(baseline);

    // assumptions/spec_review/premortem live on the spec line.
    const specWithout = (drop: string) => {
      const spec = JSON.parse(fullCorpus[0]!) as Record<string, unknown>;
      delete spec[drop];
      const { specs, reviews, reversals } = parseSpecFlowLog(
        [JSON.stringify(spec), fullCorpus[1]!, fullCorpus[2]!].join('\n'),
      );
      return reviewLoopStats(specs, reviews, reversals);
    };
    expect(specWithout('assumptions')).not.toEqual(baseline);
    expect(specWithout('spec_review')).not.toEqual(baseline);
    expect(specWithout('premortem')).not.toEqual(baseline);
  });
});

// ---------------------------------------------------------------------------
// L-11: aggregation reports only repos with data, n is a real sum
// ---------------------------------------------------------------------------

describe('L-11: cada numero con su n, repos solo con datos', () => {
  it('un repo sin ninguna metrica de review no cuenta en `repos`', () => {
    const withData = reviewLoopStats(...toParsed([specLine(), reviewLine({ findings: 1 })]));
    const empty = reviewLoopStats(...toParsed([]));
    const agg = aggregateReviewLoop([withData, empty]);
    expect(agg.repos).toBe(1);
  });

  it('n es una suma real entre repos, nunca una mediana', () => {
    const a = reviewLoopStats(
      ...toParsed([specLine({ change: 'a' }), reviewLine({ change: 'a', findings: 1, passes: 2 })]),
    );
    const b = reviewLoopStats(
      ...toParsed([specLine({ change: 'b' }), reviewLine({ change: 'b', findings: 1, passes: 4 })]),
    );
    const agg = aggregateReviewLoop([a, b]);
    expect(agg.passes!.n).toBe(2);
    expect(agg.passes!.median).toBe(3); // median of the two per-repo medians (2, 4)
  });
});

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
