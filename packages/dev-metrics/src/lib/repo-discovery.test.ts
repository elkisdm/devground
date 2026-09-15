import { describe, it, expect } from 'vitest';
import { dedupeWorktrees, parseRemoteOwner } from './repo-discovery.js';

describe('dedupeWorktrees', () => {
  it('L-7: keeps the MAIN worktree even when it is not first in the list', () => {
    const rootCommitOf = (p: string): string =>
      p === '/repos/atlas' || p === '/repos/atlas-worktree' ? 'root-atlas' : `root-${p}`;
    const commonDirOf = (p: string): string | null =>
      p === '/repos/atlas' || p === '/repos/atlas-worktree' ? '/repos/atlas/.git' : `${p}/.git`;
    // The worktree comes FIRST here; a first-seen dedupe would wrongly keep it.
    const isMainWorktree = (p: string): boolean => p === '/repos/atlas';

    const { kept, discarded } = dedupeWorktrees(
      ['/repos/atlas-worktree', '/repos/other', '/repos/atlas'],
      rootCommitOf,
      commonDirOf,
      isMainWorktree,
    );

    expect(kept).toEqual(['/repos/other', '/repos/atlas']);
    expect(discarded).toEqual([
      { path: '/repos/atlas-worktree', reason: 'same-repo', keptAs: '/repos/atlas' },
    ]);
  });

  it('falls back to the first seen when none of the group is judged main', () => {
    const rootCommitOf = (): string => 'root-atlas';
    const commonDirOf = (p: string): string | null =>
      p === '/repos/atlas' || p === '/repos/atlas-worktree' ? '/repos/atlas/.git' : `${p}/.git`;
    const isMainWorktree = (): boolean => false;

    const { kept, discarded } = dedupeWorktrees(
      ['/repos/atlas', '/repos/atlas-worktree'],
      rootCommitOf,
      commonDirOf,
      isMainWorktree,
    );

    expect(kept).toEqual(['/repos/atlas']);
    expect(discarded).toEqual([
      { path: '/repos/atlas-worktree', reason: 'same-repo', keptAs: '/repos/atlas' },
    ]);
  });
});

describe('dedupeWorktrees (F10)', () => {
  it('F10(a): two independent CLONES of the same repo (distinct common dirs, same root commit) collapse to one', () => {
    // `atlas/core` and `atlasengine` are separate `git clone`s of the same
    // upstream — distinct .git dirs, but git history shares its root commit.
    const rootCommitOf = (): string => 'shared-root-hash';
    const commonDirOf = (p: string): string => `${p}/.git`; // genuinely distinct — NOT a worktree relationship
    const isMainWorktree = (): boolean => false; // neither is "main" of the other's common dir

    const { kept, discarded } = dedupeWorktrees(
      ['/repos/atlas/core', '/repos/atlasengine'],
      rootCommitOf,
      commonDirOf,
      isMainWorktree,
    );

    expect(kept).toEqual(['/repos/atlas/core']); // first seen, since neither judged main
    expect(discarded).toEqual([
      { path: '/repos/atlasengine', reason: 'same-repo', keptAs: '/repos/atlas/core' },
    ]);
  });

  it('F10(b): a repo whose gitdir cannot be resolved (orphaned worktree) is DISCARDED, never kept', () => {
    const rootCommitOf = (p: string): string | null => (p === '/repos/orphan' ? null : `root-${p}`);
    const { kept, discarded } = dedupeWorktrees(['/repos/orphan', '/repos/ok'], rootCommitOf);
    expect(kept).toEqual(['/repos/ok']);
    expect(discarded).toEqual([{ path: '/repos/orphan', reason: 'orphaned-worktree' }]);
  });

  it('F10(c): identical paths in the input are deduped before grouping', () => {
    const rootCommitOf = (): string => 'root-a';
    const { kept, discarded } = dedupeWorktrees(['/repos/a', '/repos/a'], rootCommitOf);
    expect(kept).toEqual(['/repos/a']);
    expect(discarded).toEqual([]);
  });

  it('two independent repos with distinct root commits are both kept', () => {
    const rootCommitOf = (p: string): string => `root-${p}`;
    const { kept, discarded } = dedupeWorktrees(['/repos/a', '/repos/b'], rootCommitOf);
    expect(kept).toEqual(['/repos/a', '/repos/b']);
    expect(discarded).toEqual([]);
  });

  it('a non-repo (rootCommitOf null) is discarded as an orphaned worktree, does not participate in a group', () => {
    const rootCommitOf = (p: string): string | null => (p === '/repos/notgit' ? null : 'root-a');
    const isMainWorktree = (p: string): boolean => p === '/repos/a';
    const { kept, discarded } = dedupeWorktrees(
      ['/repos/notgit', '/repos/a', '/repos/a-wt'],
      rootCommitOf,
      undefined,
      isMainWorktree,
    );
    expect(kept).toEqual(['/repos/a']);
    expect(discarded).toEqual([
      { path: '/repos/notgit', reason: 'orphaned-worktree' },
      { path: '/repos/a-wt', reason: 'same-repo', keptAs: '/repos/a' },
    ]);
  });
});

describe('parseRemoteOwner', () => {
  it('parses ssh and https remotes', () => {
    expect(parseRemoteOwner('git@github.com:owner/repo.git')).toBe('owner');
    expect(parseRemoteOwner('https://github.com/owner/repo.git')).toBe('owner');
  });
});
