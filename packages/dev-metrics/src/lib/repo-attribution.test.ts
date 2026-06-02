import { describe, it, expect } from 'vitest';
import { repoPathToProjectDir } from './repo-attribution.js';

describe('repoPathToProjectDir', () => {
  it('maps a plain absolute path by replacing non-alphanumerics with dashes', () => {
    expect(repoPathToProjectDir('/Users/macbookpro/Documents/encuentrosmart')).toBe(
      '-Users-macbookpro-Documents-encuentrosmart',
    );
  });

  it('collapses a space the same as any other non-alphanumeric (one dash each)', () => {
    // "HCLP -Capitalinteligente" -> the space AND the dash each become a dash,
    // yielding a double dash, matching the real dir on disk.
    expect(repoPathToProjectDir('/Users/macbookpro/Documents/HCLP -Capitalinteligente')).toBe(
      '-Users-macbookpro-Documents-HCLP--Capitalinteligente',
    );
  });

  it('turns a trailing space into a trailing dash', () => {
    expect(repoPathToProjectDir('/Users/macbookpro/Documents/inversoragcp ')).toBe(
      '-Users-macbookpro-Documents-inversoragcp-',
    );
  });

  it('keeps digits and is purely deterministic', () => {
    const p = '/Users/x/devground-1';
    expect(repoPathToProjectDir(p)).toBe('-Users-x-devground-1');
    expect(repoPathToProjectDir(p)).toBe(repoPathToProjectDir(p));
  });

  it('replaces dots and other punctuation', () => {
    expect(repoPathToProjectDir('/a.b/c_d')).toBe('-a-b-c-d');
  });
});
