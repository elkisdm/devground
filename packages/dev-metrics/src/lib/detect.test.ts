import { describe, it, expect } from 'vitest';
import {
  parseGhAuthStatus,
  detectGithubAccounts,
  parseRemoteOwner,
  isLikelyThirdPartyFork,
  isBotEmail,
  inferIdentities,
} from './detect.js';

describe('parseGhAuthStatus', () => {
  it('parses two accounts and their active flags', () => {
    const text = [
      'github.com',
      '  ✓ Logged in to github.com account elkisdm (keyring)',
      '  - Active account: true',
      '  - Token: gho_xxx',
      '  ✓ Logged in to github.com account edaza-create (keyring)',
      '  - Active account: false',
      '  - Token: ghp_xxx',
    ].join('\n');
    const accounts = parseGhAuthStatus(text);
    expect(accounts).toEqual([
      { login: 'elkisdm', active: true },
      { login: 'edaza-create', active: false },
    ]);
  });

  it('parses a single account', () => {
    const text = [
      'github.com',
      '  ✓ Logged in to github.com account solo (keyring)',
      '  - Active account: true',
    ].join('\n');
    expect(parseGhAuthStatus(text)).toEqual([{ login: 'solo', active: true }]);
  });

  it('returns [] when not logged in', () => {
    expect(parseGhAuthStatus('You are not logged into any GitHub hosts.')).toEqual([]);
  });
});

describe('detectGithubAccounts', () => {
  it('degrades gracefully when gh is absent', () => {
    const out = detectGithubAccounts(() => {
      throw new Error('command not found: gh');
    });
    expect(out.accounts).toEqual([]);
    expect(out.warnings.length).toBeGreaterThan(0);
  });

  it('returns parsed accounts when gh succeeds', () => {
    const out = detectGithubAccounts(
      () => '  ✓ Logged in to github.com account a (keyring)\n  - Active account: true',
    );
    expect(out.accounts).toEqual([{ login: 'a', active: true }]);
  });
});

describe('parseRemoteOwner', () => {
  it('parses ssh remotes', () => {
    expect(parseRemoteOwner('git@github.com:elkisdm/devground.git')).toBe('elkisdm');
  });
  it('parses https remotes', () => {
    expect(parseRemoteOwner('https://github.com/elkisdm/devground.git')).toBe('elkisdm');
  });
  it('returns null for garbage', () => {
    expect(parseRemoteOwner('not-a-url')).toBeNull();
  });
});

describe('isLikelyThirdPartyFork', () => {
  const own = new Set(['elkisdm', 'edaza-create']);

  it('flags a repo whose origin owner is not one of the user accounts', () => {
    const fork = isLikelyThirdPartyFork(
      '/x',
      own,
      () => 'git@github.com:someoneelse/repo.git',
    );
    expect(fork).toBe(true);
  });

  it('keeps a repo owned by the user', () => {
    const fork = isLikelyThirdPartyFork(
      '/x',
      own,
      () => 'https://github.com/elkisdm/repo.git',
    );
    expect(fork).toBe(false);
  });

  it('keeps repos with no origin (local-only)', () => {
    const fork = isLikelyThirdPartyFork('/x', own, () => {
      throw new Error('no origin');
    });
    expect(fork).toBe(false);
  });

  it('cannot judge with no known usernames -> keeps', () => {
    expect(isLikelyThirdPartyFork('/x', new Set(), () => 'git@github.com:z/r.git')).toBe(false);
  });
});

describe('isBotEmail', () => {
  it('drops github noreply + bot + AI-agent addresses', () => {
    expect(isBotEmail('1234+name@users.noreply.github.com')).toBe(true);
    expect(isBotEmail('dependabot[bot]@users.noreply.github.com')).toBe(true);
    expect(isBotEmail('noreply@anthropic.com')).toBe(true);
    expect(isBotEmail('cursoragent@cursor.com')).toBe(true);
    expect(isBotEmail('real@example.com')).toBe(false);
  });
});

describe('inferIdentities', () => {
  it('aggregates + ranks emails across repos, dropping bots', () => {
    const run = (_cmd: string, args: readonly string[]): string => {
      const repo = args[1]; // '-C <repo> log ...'
      if (repo === '/a') return 'me@x.com\nme@x.com\nbot@users.noreply.github.com';
      if (repo === '/b') return 'me@x.com\nwork@y.com';
      return '';
    };
    const out = inferIdentities(['/a', '/b'], run);
    expect(out[0]).toBe('me@x.com');
    expect(out).toContain('work@y.com');
    expect(out).not.toContain('bot@users.noreply.github.com');
  });
});
