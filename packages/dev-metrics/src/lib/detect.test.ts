import { describe, it, expect } from 'vitest';
import {
  parseGhAuthStatus,
  detectGithubAccounts,
  parseRemoteOwner,
  isLikelyThirdPartyFork,
  isBotEmail,
  inferIdentities,
  parseNoreplyUsername,
  localPartMatchesAccount,
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

describe('parseNoreplyUsername', () => {
  it('extracts the username from a numeric-prefixed github noreply', () => {
    expect(parseNoreplyUsername('140560932+elkisdm@users.noreply.github.com')).toBe('elkisdm');
    expect(parseNoreplyUsername('273208729+edaza-create@users.noreply.github.com')).toBe(
      'edaza-create',
    );
  });
  it('extracts the username from a bare github noreply', () => {
    expect(parseNoreplyUsername('solo@users.noreply.github.com')).toBe('solo');
  });
  it('is case-insensitive', () => {
    expect(parseNoreplyUsername('123+ElkisDM@Users.NoReply.GitHub.com')).toBe('elkisdm');
  });
  it('returns null for non-noreply or bot noreply addresses', () => {
    expect(parseNoreplyUsername('real@example.com')).toBeNull();
    // a [bot] noreply does not match the [a-z0-9-] username shape -> null
    expect(parseNoreplyUsername('dependabot[bot]@users.noreply.github.com')).toBeNull();
  });
});

describe('localPartMatchesAccount', () => {
  const own = new Set(['elkisdm', 'edaza-create']);
  it('matches when the local-part is a prefix of a gh login', () => {
    expect(localPartMatchesAccount('edaza@capitalinteligente.cl', own)).toBe(true);
  });
  it('matches an exact local-part', () => {
    expect(localPartMatchesAccount('elkisdm@gmail.com', own)).toBe(true);
  });
  it('does not match an unrelated colleague email', () => {
    expect(localPartMatchesAccount('vpedrerop@capitalinteligente.cl', own)).toBe(false);
    expect(localPartMatchesAccount('export@selectcapital.cl', own)).toBe(false);
  });
  it('ignores too-short local-parts to avoid spurious matches', () => {
    expect(localPartMatchesAccount('ab@x.com', new Set(['abel']))).toBe(false);
  });
});

describe('isBotEmail', () => {
  it('drops bot + AI-agent + automation addresses', () => {
    expect(isBotEmail('dependabot[bot]@users.noreply.github.com')).toBe(true);
    expect(isBotEmail('noreply@anthropic.com')).toBe(true);
    expect(isBotEmail('cursoragent@cursor.com')).toBe(true);
    expect(isBotEmail('codex@local')).toBe(true); // the bug: this used to slip through
    expect(isBotEmail('codex@example.com')).toBe(true);
    expect(isBotEmail('someone@local')).toBe(true);
    expect(isBotEmail('github-actions[bot]@users.noreply.github.com')).toBe(true);
    expect(isBotEmail('real@example.com')).toBe(false);
  });
  it('does NOT treat a real github noreply as a bot', () => {
    // these are canonical account identifiers, resolved against gh logins
    expect(isBotEmail('140560932+elkisdm@users.noreply.github.com')).toBe(false);
  });
});

describe('inferIdentities', () => {
  it('confirms noreply emails that map to detected gh accounts; never the user-omitted ones', () => {
    const run = (_cmd: string, args: readonly string[]): string => {
      const repo = args[1];
      if (repo === '/a') {
        return [
          'edaza@capitalinteligente.cl',
          '140560932+elkisdm@users.noreply.github.com',
          'codex@local', // bot, must be dropped
          'edaza@capitalinteligente.cl',
        ].join('\n');
      }
      if (repo === '/b') {
        return ['273208729+edaza-create@users.noreply.github.com'].join('\n');
      }
      return '';
    };
    const own = new Set(['elkisdm', 'edaza-create']);
    const out = inferIdentities(['/a', '/b'], own, run);

    // the noreply identifiers the old code WRONGLY filtered are now confirmed
    expect(out.identities).toContain('140560932+elkisdm@users.noreply.github.com');
    expect(out.identities).toContain('273208729+edaza-create@users.noreply.github.com');
    // bot must never appear anywhere
    expect(out.identities).not.toContain('codex@local');
    expect(out.candidateIdentities).not.toContain('codex@local');
  });

  it('confirms a personal email whose local-part maps to a detected gh login', () => {
    const run = (_cmd: string, args: readonly string[]): string => {
      const repo = args[1];
      // edaza@ shares its local-part with gh login `edaza-create`
      if (repo === '/a') {
        return ['140560932+elkisdm@users.noreply.github.com', 'edaza@capitalinteligente.cl'].join(
          '\n',
        );
      }
      return '';
    };
    const out = inferIdentities(['/a'], new Set(['elkisdm', 'edaza-create']), run);
    expect(out.identities).toContain('edaza@capitalinteligente.cl');
    expect(out.candidateIdentities).not.toContain('edaza@capitalinteligente.cl');
  });

  it('confirms a personal email that co-occurs with a confirmed identity in 2+ repos', () => {
    const run = (_cmd: string, args: readonly string[]): string => {
      const repo = args[1];
      const lines = ['140560932+elkisdm@users.noreply.github.com', 'personal@mail.com'];
      if (repo === '/a' || repo === '/b') return lines.join('\n');
      return '';
    };
    const out = inferIdentities(['/a', '/b'], new Set(['elkisdm']), run);
    expect(out.identities).toContain('personal@mail.com');
  });

  it('keeps colleague / automation emails as candidates (single shared repo, no login match)', () => {
    const run = (_cmd: string, args: readonly string[]): string => {
      const repo = args[1];
      // colleague co-occurs with the user's confirmed noreply, but in ONE repo
      if (repo === '/a') {
        return ['140560932+elkisdm@users.noreply.github.com', 'vpedrerop@capitalinteligente.cl'].join(
          '\n',
        );
      }
      // automation alongside the user, also a single shared repo
      if (repo === '/b') {
        return ['140560932+elkisdm@users.noreply.github.com', 'export@selectcapital.cl'].join('\n');
      }
      return '';
    };
    const out = inferIdentities(['/a', '/b'], new Set(['elkisdm']), run);
    expect(out.candidateIdentities).toContain('vpedrerop@capitalinteligente.cl');
    expect(out.candidateIdentities).toContain('export@selectcapital.cl');
    expect(out.identities).not.toContain('vpedrerop@capitalinteligente.cl');
    expect(out.identities).not.toContain('export@selectcapital.cl');
  });

  it('with no detected accounts, confirms nothing and routes all non-bots to candidates', () => {
    const run = (_cmd: string, args: readonly string[]): string => {
      const repo = args[1];
      if (repo === '/a') return ['me@x.com', 'codex@local'].join('\n');
      return '';
    };
    const out = inferIdentities(['/a'], new Set(), run);
    expect(out.identities).toEqual([]);
    expect(out.candidateIdentities).toEqual(['me@x.com']);
  });
});
