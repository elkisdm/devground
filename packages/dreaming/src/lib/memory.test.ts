import { describe, it, expect } from 'vitest';
import { parseFrontmatter } from './memory.js';

describe('parseFrontmatter', () => {
  it('parses flat keys + nested metadata', () => {
    const content = [
      '---',
      'name: foo-bar',
      'description: "A quoted desc with: colon"',
      'metadata:',
      '  node_type: memory',
      '  created: 2026-06-10',
      '  updated: 2026-07-07',
      '  type: project',
      '---',
      'body here',
    ].join('\n');
    const fm = parseFrontmatter(content);
    expect(fm.name).toBe('foo-bar');
    expect(fm.description).toBe('A quoted desc with: colon');
    expect(fm.type).toBe('project');
    expect(fm.created).toBe('2026-06-10');
    expect(fm.updated).toBe('2026-07-07');
  });

  it('handles a broken frontmatter (empty name, no description/type)', () => {
    const content = ['---', 'name: ""', 'metadata:', '  node_type: memory', '---', 'body'].join('\n');
    const fm = parseFrontmatter(content);
    expect(fm.name).toBe('');
    expect(fm.description).toBe('');
    expect(fm.type).toBe('');
    expect(fm.created).toBe('');
  });

  it('falls back to shared parseCreatedFrontmatter for created', () => {
    // created lives in a flat position our nested scan would skip; shared parser finds it.
    const content = ['---', 'name: x', 'created: 2026-01-02', '---', 'body'].join('\n');
    const fm = parseFrontmatter(content);
    expect(fm.created).toBe('2026-01-02');
  });

  it('returns blanks when there is no frontmatter', () => {
    const fm = parseFrontmatter('no frontmatter here');
    expect(fm).toEqual({ name: '', description: '', type: '', created: '', updated: '' });
  });
});
