import { describe, it, expect } from 'vitest';
import { dedupeWorktrees, parseRemoteOwner } from './repo-discovery.js';

describe('dedupeWorktrees', () => {
  it('L-7: keeps the MAIN worktree even when it is not first in the list', () => {
    const commonDirOf = (p: string): string | null =>
      p === '/repos/atlas' || p === '/repos/atlas-worktree' ? '/repos/atlas/.git' : `${p}/.git`;
    // The worktree comes FIRST here; a first-seen dedupe would wrongly keep it.
    const isMainWorktree = (p: string): boolean => p === '/repos/atlas';

    const { kept, discarded } = dedupeWorktrees(
      ['/repos/atlas-worktree', '/repos/other', '/repos/atlas'],
      commonDirOf,
      isMainWorktree,
    );

    expect(kept).toEqual(['/repos/other', '/repos/atlas']);
    expect(discarded).toEqual([{ path: '/repos/atlas-worktree', keptAs: '/repos/atlas' }]);
  });

  it('falls back to the first seen when none of the group is judged main', () => {
    const commonDirOf = (p: string): string | null =>
      p === '/repos/atlas' || p === '/repos/atlas-worktree' ? '/repos/atlas/.git' : `${p}/.git`;
    const isMainWorktree = (): boolean => false;

    const { kept, discarded } = dedupeWorktrees(
      ['/repos/atlas', '/repos/atlas-worktree'],
      commonDirOf,
      isMainWorktree,
    );

    expect(kept).toEqual(['/repos/atlas']);
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

  it('a non-repo (commonDirOf null) does not participate in a group', () => {
    const commonDirOf = (p: string): string | null =>
      p === '/repos/notgit' ? null : '/repos/a/.git';
    const isMainWorktree = (p: string): boolean => p === '/repos/a';
    const { kept, discarded } = dedupeWorktrees(
      ['/repos/notgit', '/repos/a', '/repos/a-wt'],
      commonDirOf,
      isMainWorktree,
    );
    expect(kept).toEqual(['/repos/notgit', '/repos/a']);
    expect(discarded).toEqual([{ path: '/repos/a-wt', keptAs: '/repos/a' }]);
  });
});

describe('parseRemoteOwner', () => {
  it('parses ssh and https remotes', () => {
    expect(parseRemoteOwner('git@github.com:owner/repo.git')).toBe('owner');
    expect(parseRemoteOwner('https://github.com/owner/repo.git')).toBe('owner');
  });
});
