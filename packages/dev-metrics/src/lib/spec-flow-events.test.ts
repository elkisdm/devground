import { describe, it, expect } from 'vitest';
import {
  parseSpecFlowEvents,
  parseSpecFlowLog,
  rolloutDate,
  frictionByTier,
  versionAtLeast,
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
    expect(e.questionsAsked).toBeUndefined(); // "three" is not a safe count, not silently 0
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

describe('event discriminator (causa D, ADR-0037): assumption_reversed no cuenta como spec', () => {
  it('una linea event:"assumption_reversed" NO aparece en specs y SI en reversals', () => {
    const line = LINE({
      event: 'assumption_reversed',
      date: '2026-09-14',
      change: 'x',
      assumption: 'el reingreso escribe el nivel',
      cost: 'rework',
    });
    const { specs, reviews, reversals } = parseSpecFlowLog(line);
    expect(specs).toHaveLength(0);
    expect(reviews).toHaveLength(0);
    expect(reversals).toStrictEqual([
      {
        ts: '2026-09-14',
        date: '2026-09-14',
        change: 'x',
        assumption: 'el reingreso escribe el nivel',
        cost: 'rework',
      },
    ]);
  });

  it('un evento sin "event" (pre-0.6) se trata como spec por defecto', () => {
    const { specs } = parseSpecFlowLog(LINE(ev()));
    expect(specs).toHaveLength(1);
  });

  it('event:"review" no aparece en specs', () => {
    const line = LINE({ event: 'review', date: '2026-09-14', change: 'x', level: 'high' });
    const { specs, reviews } = parseSpecFlowLog(line);
    expect(specs).toHaveLength(0);
    expect(reviews).toHaveLength(1);
  });

  it('un event desconocido se descarta sin adivinar', () => {
    const line = LINE({ event: 'something_else', date: '2026-09-14', change: 'x' });
    const { specs, reviews, reversals } = parseSpecFlowLog(line);
    expect(specs).toHaveLength(0);
    expect(reviews).toHaveLength(0);
    expect(reversals).toHaveLength(0);
  });
});

describe('count() (ADR-0037): solo enteros no negativos y seguros', () => {
  function findings(value: unknown) {
    const line = LINE({
      event: 'review',
      date: '2026-09-14',
      change: 'x',
      level: 'high',
      findings: value,
    });
    return parseSpecFlowLog(line).reviews[0]?.findings;
  }

  it('rechaza -1 (negativo)', () => {
    expect(findings(-1)).toBeUndefined();
  });

  it('rechaza 1.5 (fraccion)', () => {
    expect(findings(1.5)).toBeUndefined();
  });

  it('rechaza "10" (string)', () => {
    expect(findings('10')).toBeUndefined();
  });

  it('rechaza 1e308 (no es entero seguro)', () => {
    expect(findings(1e308)).toBeUndefined();
  });

  it('acepta 0 y enteros normales', () => {
    expect(findings(0)).toBe(0);
    expect(findings(10)).toBe(10);
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
    expect(f[1]).toEqual({ mean: 0, n: 1 });
    expect(f[3]).toEqual({ mean: 3, n: 2 });
  });

  it('ignora eventos sin questionsAsked valido en vez de tratarlos como 0', () => {
    const events = parseSpecFlowEvents(
      [
        LINE(ev({ tier: 1, questions_asked: 'n/a' })),
        LINE(ev({ tier: 1, questions_asked: 2 })),
      ].join('\n'),
    );
    expect(frictionByTier(events)[1]).toEqual({ mean: 2, n: 1 }); // no (0+2)/2 = 1
  });

  it('L-2: un tier no parseable queda excluido de la tabla, nunca una fila T0 falsa', () => {
    const events = parseSpecFlowEvents(
      [
        LINE(ev({ tier: 'dos', questions_asked: 3 })),
        LINE(ev({ tier: 2, questions_asked: 1 })),
      ].join('\n'),
    );
    const f = frictionByTier(events);
    expect(f[0]).toBeUndefined();
    expect(f[2]).toEqual({ mean: 1, n: 1 });
  });
});

describe('versionAtLeast', () => {
  it('compara versiones "0.2".."0.6"', () => {
    expect(versionAtLeast('0.6', '0.6')).toBe(true);
    expect(versionAtLeast('0.5', '0.6')).toBe(false);
    expect(versionAtLeast('0.10', '0.6')).toBe(true);
  });

  it('ausente cuenta como version antigua', () => {
    expect(versionAtLeast(undefined, '0.6')).toBe(false);
    expect(versionAtLeast('', '0.6')).toBe(false);
  });
});

describe('campo review inline (spec-flow 0.5, ADR-0036)', () => {
  function parseOne(extra: string) {
    const line = `{"event":"spec","date":"2026-09-07","change":"x","tier":1${extra}}`;
    return parseSpecFlowEvents(line)[0];
  }

  it('lee el objeto de review completo', () => {
    const e = parseOne(',"review":{"level":"high","findings":3,"resolved":2}');
    expect(e.review).toStrictEqual({ level: 'high', findings: 3, resolved: 2 });
  });

  it('un evento viejo sin review sigue parseando', () => {
    expect(parseOne('').review).toBeUndefined();
  });

  it('trata "n/a" como ausencia, no como objeto', () => {
    expect(parseOne(',"review":"n/a"').review).toBeUndefined();
  });

  it('un review malformado no rompe el parseo de la linea', () => {
    expect(parseOne(',"review":{"findings":3}').review).toBeUndefined();
    expect(parseOne(',"review":42').review).toBeUndefined();
  });

  it('deja ausentes los conteos invalidos en vez de 0 (spec-flow 0.6, ADR-0037)', () => {
    const e = parseOne(',"review":{"level":"medium"}');
    expect(e.review).toStrictEqual({ level: 'medium' });
  });
});

describe('spec-flow 0.6: premortem/spec_review en el evento spec (ADR-0037)', () => {
  function parseOne(extra: string) {
    const line = `{"event":"spec","date":"2026-09-14","change":"x","tier":2${extra}}`;
    return parseSpecFlowEvents(line)[0];
  }

  it('(a) evento v0.4 sin ninguno de los campos nuevos: premortem/specReview/tests/review no existen', () => {
    const e = parseOne('');
    expect(e.review).toBeUndefined();
    expect(e.premortem).toBeUndefined();
    expect(e.premortemSkipped).toBeUndefined();
    expect(e.specReview).toBeUndefined();
    expect('review' in e).toBe(false);
    expect('premortem' in e).toBe(false);
    expect('specReview' in e).toBe(false);
  });

  it('(b) premortem {"na": n} se lee tal cual', () => {
    const e = parseOne(',"premortem":{"na":2}');
    expect(e.premortem).toStrictEqual({ na: 2 });
    expect(e.premortemSkipped).toBeUndefined();
  });

  it('(c) premortem false marca premortemSkipped, no un objeto', () => {
    const e = parseOne(',"premortem":false');
    expect(e.premortem).toBeUndefined();
    expect(e.premortemSkipped).toBe(true);
  });

  it('(d) premortem true (legado) es un objeto vacio', () => {
    const e = parseOne(',"premortem":true');
    expect(e.premortem).toStrictEqual({});
    expect(e.premortemSkipped).toBeUndefined();
  });

  it('(e) premortem "n/a"/ausente/otro es ausente en ambos campos', () => {
    expect(parseOne(',"premortem":"n/a"').premortem).toBeUndefined();
    expect(parseOne(',"premortem":"n/a"').premortemSkipped).toBeUndefined();
    expect(parseOne(',"premortem":[1,2]').premortem).toBeUndefined();
  });

  it('(f) spec_review con un conteo valido se lee', () => {
    const e = parseOne(',"spec_review":{"gaps_found":3,"gaps_adopted":2}');
    expect(e.specReview).toStrictEqual({ gapsFound: 3, gapsAdopted: 2 });
  });

  it('(g) spec_review {} (sin datos legibles) es ausente', () => {
    expect(parseOne(',"spec_review":{}').specReview).toBeUndefined();
  });

  it('(h) spec_review "n/a" o array es ausente', () => {
    expect(parseOne(',"spec_review":"n/a"').specReview).toBeUndefined();
    expect(parseOne(',"spec_review":[1]').specReview).toBeUndefined();
  });

  it('(i) evento v0.6 completo mapea todos los campos', () => {
    const e = parseOne(
      ',"premortem":{"na":1}' +
        ',"spec_review":{"gaps_found":3,"gaps_adopted":2}' +
        ',"tests":"verified"' +
        ',"review":{"level":"high","passes":2,"findings":10,"findings_capped":true,' +
        '"induced":0,"resolved":12,"redesigned":false}',
    );
    expect(e.premortem).toStrictEqual({ na: 1 });
    expect(e.specReview).toStrictEqual({ gapsFound: 3, gapsAdopted: 2 });
    expect(e.tests).toBe('verified');
    expect(e.review).toStrictEqual({
      level: 'high',
      passes: 2,
      findings: 10,
      findingsCapped: true,
      induced: 0,
      resolved: 12,
      redesigned: false,
    });
  });

  it('(j) findings:"pending" queda ausente, nunca 0', () => {
    const e = parseOne(',"review":{"level":"high","findings":"pending"}');
    expect(e.review).toStrictEqual({ level: 'high' });
    expect(e.review?.findings).toBeUndefined();
  });
});

describe('spec-flow 0.6: evento review separado (ADR-0037)', () => {
  function parseReview(extra: string) {
    const line = `{"event":"review","date":"2026-09-14","change":"x"${extra}}`;
    return parseSpecFlowLog(line).reviews[0];
  }

  it('level:"n/a" y level ausente son undefined (=no aplico review)', () => {
    expect(parseReview(',"level":"n/a"').level).toBeUndefined();
    expect(parseReview('').level).toBeUndefined();
  });

  it('level real se conserva', () => {
    expect(parseReview(',"level":"high"').level).toBe('high');
  });

  it('mapea todos los campos 0.6', () => {
    const r = parseReview(
      ',"level":"high","passes":2,"findings":10,"findings_capped":true,' +
        '"found_total":13,"induced":0,"resolved":11,"open":2,"redesigned":false,"tests":"verified"',
    );
    expect(r).toStrictEqual({
      ts: r.ts,
      date: '2026-09-14',
      change: 'x',
      specFlowVersion: '',
      level: 'high',
      passes: 2,
      findings: 10,
      findingsCapped: true,
      foundTotal: 13,
      induced: 0,
      resolved: 11,
      open: 2,
      redesigned: false,
      tests: 'verified',
    });
  });
});
