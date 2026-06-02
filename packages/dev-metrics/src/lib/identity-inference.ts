import { defaultRun } from './gh-accounts.js';

/**
 * Identity inference: deriving the user's real author emails from git history
 * across many repos, then splitting them into CONFIRMED vs CANDIDATE buckets
 * with explicit confidence rules. Bots/agents are dropped. Never throws.
 */

/**
 * Infers real author identities (emails) from a repo's git history, restricted
 * to the most frequent committers so we do not pick up one-off contributors.
 * Returns emails ordered by descending commit count. Never throws.
 */
export function inferIdentitiesFromRepo(
  repoPath: string,
  run: (cmd: string, args: readonly string[]) => string = defaultRun,
): string[] {
  let out: string;
  try {
    out = run('git', ['-C', repoPath, 'log', '--format=%ae']);
  } catch {
    return [];
  }
  const counts = new Map<string, number>();
  for (const line of out.split('\n')) {
    const email = line.trim();
    if (email === '') continue;
    counts.set(email, (counts.get(email) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([email]) => email);
}

/**
 * GitHub noreply emails have the canonical shape `<id>+<username>@users.noreply.github.com`
 * (or, for older accounts, the bare `<username>@users.noreply.github.com`). The
 * `<username>` is the GitHub login — the CANONICAL identifier of the account, NOT
 * a bot marker. This parser extracts that login (lowercased). Returns `null` when
 * the email is not a GitHub noreply address. Pure.
 *
 *   140560932+elkisdm@users.noreply.github.com   -> 'elkisdm'
 *   elkisdm@users.noreply.github.com             -> 'elkisdm'
 *   real@example.com                             -> null
 */
export function parseNoreplyUsername(email: string): string | null {
  const lower = email.toLowerCase().trim();
  const m = /^(?:\d+\+)?([a-z0-9][a-z0-9-]*)@users\.noreply\.github\.com$/.exec(lower);
  if (m === null) return null;
  return m[1] ?? null;
}

/**
 * True when the local-part of `email` ties it to one of the detected gh logins.
 * We normalise both sides to `[a-z0-9]` (dropping dots, dashes, plus tags) and
 * accept an equality or prefix relation in EITHER direction, so:
 *   edaza@capitalinteligente.cl   ↔ gh `edaza-create`  -> true  (edaza ⊂ edazacreate)
 *   elkisdm@gmail.com             ↔ gh `elkisdm`        -> true  (equal)
 *   vpedrerop@capitalinteligente.cl ↔ {elkisdm,edaza-create} -> false
 * Requires the shorter side to be at least 4 chars to avoid spurious matches.
 */
export function localPartMatchesAccount(
  email: string,
  ownUsernames: ReadonlySet<string>,
): boolean {
  const at = email.toLowerCase().indexOf('@');
  if (at <= 0) return false;
  const local = email.slice(0, at).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (local.length < 4) return false;
  for (const login of ownUsernames) {
    const norm = login.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (norm.length < 4) continue;
    const [short, long] = local.length <= norm.length ? [local, norm] : [norm, local];
    if (long.startsWith(short)) return true;
  }
  return false;
}

/** The two confidence buckets produced by {@link inferIdentities}. */
export interface InferredIdentities {
  /**
   * HIGH confidence: emails that map to one of the user's detected `gh`
   * accounts (via the noreply username) PLUS personal emails that co-occur with
   * those in the SAME repos (same person, different email).
   */
  identities: string[];
  /**
   * AMBIGUOUS: non-bot emails that do not map to any detected account and do
   * not co-occur with a confirmed identity. These are likely co-contributors
   * (colleagues) or automation that slipped the bot filter. The user reviews
   * them and promotes the real ones into `identities` by hand.
   */
  candidateIdentities: string[];
}

/**
 * Aggregates inferred identities across many repos and splits them into
 * confirmed vs. candidate buckets. Bots/agents are dropped entirely.
 *
 * Confirmation logic (the fix for the over-eager inference bug):
 *  1. A GitHub noreply email whose `<username>` matches one of `ownUsernames`
 *     (the logins detected by `gh auth status`) is CONFIRMED — these are the
 *     canonical identifiers of the user's own accounts, so they are INCLUDED
 *     (the old code filtered them out, which was exactly backwards).
 *  2. A non-bot, non-noreply email is CONFIRMED as the same person ONLY when
 *     the evidence is strong:
 *       (a) its local-part maps to a detected gh login (equal, or one is a
 *           prefix of the other once non-alphanumerics are stripped — e.g.
 *           `edaza@…` ↔ gh login `edaza-create`), OR
 *       (b) it co-occurs with a confirmed identity in 2+ DISTINCT repos
 *           (a colleague typically shows up alongside the user in just one
 *           shared repo, not consistently across many).
 *  3. Everything else non-bot becomes a CANDIDATE: the user reviews it and
 *     promotes it manually if it is theirs. Co-contributors (colleagues, e.g.
 *     an email that shares a single repo with the user) and unrecognised
 *     automation land here — never auto-confirmed.
 *
 * `ownUsernames` should be lowercased gh logins. With an empty set we cannot
 * anchor anything, so nothing is confirmed and every non-bot email is a
 * candidate (safe: the user reviews them). Never throws.
 */
export function inferIdentities(
  repoPaths: readonly string[],
  ownUsernames: ReadonlySet<string> = new Set(),
  run: (cmd: string, args: readonly string[]) => string = defaultRun,
): InferredIdentities {
  // Per-email: total rank-weighted score and the set of repos it appeared in.
  const totals = new Map<string, number>();
  const reposByEmail = new Map<string, Set<string>>();
  for (const repo of repoPaths) {
    const emails = inferIdentitiesFromRepo(repo, run);
    emails.forEach((email, idx) => {
      if (isBotEmail(email)) return;
      // weight by rank position so the top committer of each repo dominates
      totals.set(email, (totals.get(email) ?? 0) + (emails.length - idx));
      let set = reposByEmail.get(email);
      if (set === undefined) {
        set = new Set();
        reposByEmail.set(email, set);
      }
      set.add(repo);
    });
  }

  // 1. Confirm noreply emails that map to a detected gh account.
  const confirmed = new Set<string>();
  const confirmedRepos = new Set<string>();
  for (const email of totals.keys()) {
    const username = parseNoreplyUsername(email);
    if (username !== null && ownUsernames.has(username)) {
      confirmed.add(email);
      for (const r of reposByEmail.get(email) ?? []) confirmedRepos.add(r);
    }
  }

  // 2. Confirm non-noreply emails with STRONG evidence of being the same person:
  //    (a) local-part maps to a detected gh login, OR
  //    (b) co-occurrence with a confirmed identity in 2+ distinct repos.
  for (const [email, repos] of reposByEmail) {
    if (confirmed.has(email)) continue;
    if (parseNoreplyUsername(email) !== null) continue; // foreign noreply -> candidate
    if (localPartMatchesAccount(email, ownUsernames)) {
      confirmed.add(email);
      continue;
    }
    if (confirmedRepos.size > 0) {
      let sharedRepos = 0;
      for (const r of repos) if (confirmedRepos.has(r)) sharedRepos++;
      if (sharedRepos >= 2) confirmed.add(email);
    }
  }

  const byScore = (a: string, b: string): number => (totals.get(b) ?? 0) - (totals.get(a) ?? 0);
  const identities = [...confirmed].sort(byScore);
  const candidateIdentities = [...totals.keys()].filter((e) => !confirmed.has(e)).sort(byScore);
  return { identities, candidateIdentities };
}

/**
 * Substrings/suffixes that mark a commit email as a non-human agent (AI tools,
 * CI bots, automation). These are NOT the user's identity, so they are dropped
 * from inferred identities entirely. Extend as new agents appear.
 *
 * NOTE: GitHub `*.noreply.github.com` addresses are deliberately NOT here — they
 * are the canonical identifier of a real account and are resolved against the
 * detected `gh` logins by {@link parseNoreplyUsername}. Only the dedicated bot
 * noreply `[bot]@users.noreply.github.com` matches (via the `[bot]` marker).
 */
const BOT_EMAIL_MARKERS: readonly string[] = [
  '[bot]',
  'noreply@anthropic.com',
  '@local',
  'codex',
  'cursoragent',
  '@cursor.com',
  'github-actions',
  'devnull@',
  'action@github.com',
];

/** Drops obvious non-human addresses (AI agents, CI bots, automation, etc.). */
export function isBotEmail(email: string): boolean {
  const lower = email.toLowerCase().trim();
  if (lower === '') return true;
  return BOT_EMAIL_MARKERS.some((m) => lower.includes(m));
}
