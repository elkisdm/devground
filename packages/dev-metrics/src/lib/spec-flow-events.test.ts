import { describe, it, expect } from 'vitest';
import {
  parseSpecFlowEvents,
  rolloutDate,
  frictionByTier,
  reviewLoopStats,
} from './spec-flow-events.js';

const LINE = (o: Record<string, unknown>) => JSON.stringify(o);

const ev = (over: Record<string, unknown> = {}) => ({
  ts: '2026-06-09T22:52:52-0400',
  date: '2026-06-09',
  change: 'a-change',
  tier: 2,
  type: 'feat',
  size: 'medium',
  risk: 'high',
  uncertainty: 'known',
  files: ['src/a.ts'],
  questions_asked: 0,
  brief: 'inline',
  codemap_used: true,
  spec_flow_version: '0.2',
  ...over,
});

describe('parseSpecFlowEvents', () => {
  it('parses one object per line and maps snake_case to camelCase', () => {
    const text = [LINE(ev()), LINE(ev({ date: '2026-06-10', codemap_used: false }))].join('\n');
    const events = parseSpecFlowEvents(text);
    expect(events).toHaveLength(2);
    expect(events[0].questionsAsked).toBe(0);
    expect(events[0].codemapUsed).toBe(true);
    expect(events[1].codemapUsed).toBe(false);
  });

  it('skips blank and malformed lines instead of throwing', () => {
    const text = ['', LINE(ev()), '{ not valid json', '   ', LINE(ev({ date: '2026-06-11' }))].join(
      '\n',
    );
    expect(parseSpecFlowEvents(text)).toHaveLength(2);
  });

  it('drops a line with no date (unusable for segmentation)', () => {
    const text = [LINE(ev({ date: undefined })), LINE(ev())].join('\n');
    expect(parseSpecFlowEvents(text)).toHaveLength(1);
  });

  it('defaults missing/typed-wrong fields defensively', () => {
    const text = LINE({ date: '2026-06-09', files: 'not-an-array', questions_asked: 'three' });
    const [e] = parseSpecFlowEvents(text);
    expect(e.files).toEqual([]);
    expect(e.questionsAsked).toBe(0);
    expect(e.type).toBe('other');
  });

  it('parses the tests field when present', () => {
    const [e] = parseSpecFlowEvents(LINE(ev({ tests: 'added' })));
    expect(e.tests).toBe('added');
  });

  it('leaves tests undefined when absent (backward-compat with older events)', () => {
    const [e] = parseSpecFlowEvents(LINE(ev()));
    expect(e.tests).toBeUndefined();
  });
});

describe('rolloutDate', () => {
  it('returns the earliest date', () => {
    const events = parseSpecFlowEvents(
      [
        LINE(ev({ date: '2026-06-09' })),
        LINE(ev({ date: '2026-06-04' })),
        LINE(ev({ date: '2026-06-12' })),
      ].join('\n'),
    );
    expect(rolloutDate(events)).toBe('2026-06-04');
  });

  it('returns null for no events', () => {
    expect(rolloutDate([])).toBeNull();
  });
});

describe('frictionByTier', () => {
  it('averages questionsAsked within each tier', () => {
    const events = parseSpecFlowEvents(
      [
        LINE(ev({ tier: 1, questions_asked: 0 })),
        LINE(ev({ tier: 3, questions_asked: 2 })),
        LINE(ev({ tier: 3, questions_asked: 4 })),
      ].join('\n'),
    );
    const f = frictionByTier(events);
    expect(f[1]).toBe(0);
    expect(f[3]).toBe(3);
  });
});

describe('campo review (spec-flow 0.5, ADR-0036)', () => {
  function parseOne(extra: string) {
    const line = `{"event":"spec","date":"2026-09-07","change":"x","tier":1${extra}}`;
    return parseSpecFlowEvents(line)[0];
  }

  it('lee el objeto de review completo', () => {
    const e = parseOne(',"review":{"level":"high","findings":3,"resolved":2}');

    expect(e.review).toEqual({ level: 'high', findings: 3, resolved: 2 });
  });

  it('un evento viejo sin review sigue parseando', () => {
    // Retrocompatibilidad: los eventos escritos antes de 0.5 no tienen el campo.
    expect(parseOne('').review).toBeUndefined();
  });

  it('trata "n/a" como ausencia, no como objeto', () => {
    expect(parseOne(',"review":"n/a"').review).toBeUndefined();
  });

  it('un review malformado no rompe el parseo de la linea', () => {
    // Una linea corrupta no puede tumbar una corrida completa de metricas.
    expect(parseOne(',"review":{"findings":3}').review).toBeUndefined();
    expect(parseOne(',"review":42').review).toBeUndefined();
  });

  it('deja undefined los conteos ausentes en vez de 0 (spec-flow 0.6, ADR-0037)', () => {
    // Antes de 0.6 esto rellenaba con 0; un conteo ausente no es "cero hallazgos".
    const e = parseOne(',"review":{"level":"medium"}');

    expect(e.review).toEqual({ level: 'medium' });
  });
});

describe('spec-flow 0.6: review.passes/findingsCapped/induced/redesigned (ADR-0037)', () => {
  function parseOne(extra: string) {
    const line = `{"event":"spec","date":"2026-09-14","change":"x","tier":2${extra}}`;
    return parseSpecFlowEvents(line)[0];
  }

  it('(a) evento v0.4 sin review: review, premortem y specReview quedan undefined', () => {
    const e = parseOne('');
    expect(e.review).toBeUndefined();
    expect(e.premortem).toBeUndefined();
    expect(e.specReview).toBeUndefined();
  });

  it('(b) evento v0.5 (solo level/findings/resolved): campos 0.6 quedan undefined', () => {
    const e = parseOne(',"review":{"level":"high","findings":3,"resolved":3}');
    expect(e.review).toEqual({ level: 'high', findings: 3, resolved: 3 });
    expect(e.review?.passes).toBeUndefined();
    expect(e.review?.findingsCapped).toBeUndefined();
    expect(e.review?.induced).toBeUndefined();
    expect(e.review?.redesigned).toBeUndefined();
  });

  it('(c) evento v0.6 completo: todos los campos mapeados', () => {
    const e = parseOne(
      ',"premortem":true' +
        ',"spec_review":{"gaps_found":3,"gaps_adopted":2}' +
        ',"tests":"verified"' +
        ',"review":{"level":"high","passes":2,"findings":10,"findings_capped":true,' +
        '"induced":0,"resolved":12,"redesigned":false}',
    );
    expect(e.premortem).toBe(true);
    expect(e.specReview).toEqual({ gapsFound: 3, gapsAdopted: 2 });
    expect(e.tests).toBe('verified');
    expect(e.review).toEqual({
      level: 'high',
      passes: 2,
      findings: 10,
      findingsCapped: true,
      induced: 0,
      resolved: 12,
      redesigned: false,
    });
  });

  it('(d) findings:"pending" queda undefined, nunca 0', () => {
    const e = parseOne(',"review":{"level":"high","findings":"pending"}');
    expect(e.review).toEqual({ level: 'high' });
    expect(e.review?.findings).toBeUndefined();
  });

  it('(e) premortem "n/a" es undefined; true/false se leen tal cual', () => {
    expect(parseOne(',"premortem":"n/a"').premortem).toBeUndefined();
    expect(parseOne(',"premortem":true').premortem).toBe(true);
    expect(parseOne(',"premortem":false').premortem).toBe(false);
    expect(parseOne(',"spec_review":"n/a"').specReview).toBeUndefined();
  });
});

describe('reviewLoopStats', () => {
  it('(f) agrega passes/capped/induced/pre-mortem, cada uno sobre su propio denominador', () => {
    const events = parseSpecFlowEvents(
      [
        // capped, sin pre-mortem, findings 12, induced 0 (definido, no > 0)
        '{"date":"2026-09-14","change":"a","tier":2,"premortem":false,' +
          '"review":{"level":"high","findings":12,"findings_capped":true,"induced":0}}',
        // no capped, con pre-mortem, findings 4, passes 3, induced 2
        '{"date":"2026-09-14","change":"b","tier":2,"premortem":true,' +
          '"review":{"level":"high","findings":4,"passes":3,"induced":2}}',
        // sin review: no cuenta en ningún denominador
        '{"date":"2026-09-14","change":"c","tier":2}',
      ].join('\n'),
    );

    const stats = reviewLoopStats(events);

    expect(stats.withReview).toBe(2);
    expect(stats.medianPasses).toBe(3);
    expect(stats.cappedRate).toBe(0.5);
    expect(stats.inducedRate).toBe(0.5);
    expect(stats.firstPassFindings).toEqual({ withPremortem: 4, withoutPremortem: 12 });
  });

  it('sin eventos con review, todo queda null y withReview en 0', () => {
    const events = parseSpecFlowEvents('{"date":"2026-09-14","change":"a","tier":1}');
    const stats = reviewLoopStats(events);
    expect(stats).toEqual({
      withReview: 0,
      medianPasses: null,
      sharePassesAtMost2: null,
      cappedRate: null,
      inducedRate: null,
      firstPassFindings: { withPremortem: null, withoutPremortem: null },
    });
  });
});
