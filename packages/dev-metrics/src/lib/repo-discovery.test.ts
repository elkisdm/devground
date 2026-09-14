import { describe, it, expect } from 'vitest';
import { dedupeWorktrees, parseRemoteOwner } from './repo-discovery.js';

describe('dedupeWorktrees', () => {
  it('collapses two paths sharing the same git common dir, keeping the first seen', () => {
    const commonDirOf = (p: string): string | null =>
      p === '/repos/atlas' || p === '/repos/atlas-worktree' ? '/repos/atlas/.git' : `${p}/.git`;

    const { kept, discarded } = dedupeWorktrees(
      ['/repos/atlas', '/repos/other', '/repos/atlas-worktree'],
      commonDirOf,
    );

    expect(kept).toEqual(['/repos/atlas', '/repos/other']);
    expect(discarded).toEqual([{ path: '/repos/atlas-worktree', keptAs: '/repos/atlas' }]);
  });

  it('keeps a repo whose common dir cannot be determined (errs on the side of inclusion)', () => {
    const commonDirOf = (): string | null => null;
    const { kept, discarded } = dedupeWorktrees(['/repos/a', '/repos/b'], commonDirOf);
    expect(kept).toEqual(['/repos/a', '/repos/b']);
    expect(discarded).toEqual([]);
  });

  it('two independent repos with distinct common dirs are both kept', () => {
    const commonDirOf = (p: string): string | null => `${p}/.git`;
    const { kept, discarded } = dedupeWorktrees(['/repos/a', '/repos/b'], commonDirOf);
    expect(kept).toEqual(['/repos/a', '/repos/b']);
    expect(discarded).toEqual([]);
  });
});

describe('parseRemoteOwner', () => {
  it('parses ssh and https remotes', () => {
    expect(parseRemoteOwner('git@github.com:owner/repo.git')).toBe('owner');
    expect(parseRemoteOwner('https://github.com/owner/repo.git')).toBe('owner');
  });
});
