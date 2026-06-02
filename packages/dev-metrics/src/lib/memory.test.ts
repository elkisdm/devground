import { describe, it, expect } from 'vitest';
import {
  isoWeek,
  aggregateMemory,
  parseCreatedFrontmatter,
  OBSIDIAN_ADOPTION_DATE,
  type MemoryNote,
} from './memory.js';

function note(
  project: string,
  date: string,
  bytes = 100,
  dateSource: 'frontmatter' | 'mtime' = 'frontmatter',
): MemoryNote {
  return { project, file: `${project}/${date}.md`, date, dateSource, bytes };
}

describe('isoWeek', () => {
  it('labels a date as YYYY-Www', () => {
    expect(isoWeek('2026-05-16')).toMatch(/^2026-W\d{2}$/);
  });

  it('puts dates in the same calendar week into the same bucket', () => {
    // 2026-05-18 (Mon) and 2026-05-22 (Fri) share an ISO week.
    expect(isoWeek('2026-05-18')).toBe(isoWeek('2026-05-22'));
  });

  it('separates adjacent weeks', () => {
    expect(isoWeek('2026-05-18')).not.toBe(isoWeek('2026-05-25'));
  });
});

describe('aggregateMemory', () => {
  it('counts notes, groups by project, and sums bytes', () => {
    const notes = [
      note('p1', '2026-05-20', 10),
      note('p1', '2026-05-21', 20),
      note('p2', '2026-06-01', 30),
    ];
    const c = aggregateMemory(notes);
    expect(c.totalNotes).toBe(3);
    expect(c.notesByProject).toEqual({ p1: 2, p2: 1 });
    expect(c.totalBytes).toBe(60);
  });

  it('splits notes by the Obsidian adoption date', () => {
    const notes = [
      note('p', '2026-05-01'), // before
      note('p', OBSIDIAN_ADOPTION_DATE), // on adoption -> after (inclusive)
      note('p', '2026-06-01'), // after
    ];
    const c = aggregateMemory(notes);
    expect(c.notesBeforeAdoption).toBe(1);
    expect(c.notesAfterAdoption).toBe(2);
  });

  it('buckets notes by ISO week', () => {
    const c = aggregateMemory([note('p', '2026-05-18'), note('p', '2026-05-19')]);
    const weeks = Object.values(c.notesByWeek);
    expect(weeks.reduce((a, b) => a + b, 0)).toBe(2);
  });

  it('handles an empty corpus', () => {
    const c = aggregateMemory([]);
    expect(c.totalNotes).toBe(0);
    expect(c.totalBytes).toBe(0);
    expect(c.notesByProject).toEqual({});
  });

  it('counts notes whose date came from mtime fallback', () => {
    const c = aggregateMemory([
      note('p', '2026-05-20', 10, 'frontmatter'),
      note('p', '2026-05-21', 10, 'mtime'),
    ]);
    expect(c.notesFromMtime).toBe(1);
  });
});

describe('parseCreatedFrontmatter', () => {
  it('reads created: from the frontmatter block', () => {
    const content = ['---', 'name: x', 'created: 2026-05-28', 'description: y', '---', '# body'].join('\n');
    expect(parseCreatedFrontmatter(content)).toBe('2026-05-28');
  });

  it('tolerates quotes around the date', () => {
    const content = ['---', "created: '2026-01-02'", '---'].join('\n');
    expect(parseCreatedFrontmatter(content)).toBe('2026-01-02');
  });

  it('returns null when there is no frontmatter', () => {
    expect(parseCreatedFrontmatter('# just a heading\ncreated: 2026-05-28')).toBeNull();
  });

  it('returns null when frontmatter has no created field', () => {
    expect(parseCreatedFrontmatter(['---', 'name: x', '---'].join('\n'))).toBeNull();
  });

  it('ignores a created: that appears after the frontmatter block', () => {
    const content = ['---', 'name: x', '---', 'created: 2026-05-28'].join('\n');
    expect(parseCreatedFrontmatter(content)).toBeNull();
  });
});
