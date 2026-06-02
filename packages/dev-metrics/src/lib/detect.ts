/**
 * Auto-detection helpers for `init`. None of these throw on a missing tool or
 * an unauthenticated `gh`: they DEGRADE (return empty + a `warnings[]`) so the
 * package works for someone with 1 repo and no `gh` just as well as for someone
 * with 19 repos and 2 GitHub accounts. Cardinality is never assumed.
 *
 * This module was split into three focused modules by responsibility. It now
 * re-exports them so existing imports from `./detect.js` keep working:
 *  - `gh-accounts`        — parsing `gh auth status` and account detection.
 *  - `repo-discovery`     — filesystem repo discovery + fork heuristic.
 *  - `identity-inference` — inferring real author identities + confidence.
 */

export type { GithubAccount, GithubDetection } from './gh-accounts.js';
export { parseGhAuthStatus, detectGithubAccounts, defaultRun } from './gh-accounts.js';

export type { DiscoverReposOptions } from './repo-discovery.js';
export {
  discoverRepos,
  defaultBaseDir,
  isGitRepo,
  isLikelyThirdPartyFork,
  parseRemoteOwner,
} from './repo-discovery.js';

export type { InferredIdentities } from './identity-inference.js';
export {
  inferIdentitiesFromRepo,
  parseNoreplyUsername,
  localPartMatchesAccount,
  inferIdentities,
  isBotEmail,
} from './identity-inference.js';
