import type { DevMetricsConfig } from '../types.js';
import { loadConfig, resolveList, type Source } from '../lib/config.js';
import {
  discoverRepos,
  inferIdentities,
  detectGithubAccounts,
  defaultBaseDir,
} from '../lib/detect.js';

/** Flags the user actually passed (undefined = not passed, so fall through). */
export interface CollectFlags {
  repos?: string[];
  emails?: string[];
}

/** Fully resolved collect inputs plus where each came from. */
export interface ResolvedCollectInputs {
  repos: string[];
  identities: string[];
  reposSource: Source;
  identitiesSource: Source;
  /** The config file that was loaded, or null when none existed. */
  config: DevMetricsConfig | null;
  warnings: string[];
}

export interface ResolveOptions {
  flags: CollectFlags;
  /** Path to dev-metrics.config.json (default: ./dev-metrics.config.json). */
  configPath?: string;
  /** Injectable repo discoverer (for tests / to avoid scanning the disk). */
  discover?: (baseDir: string) => string[];
  /** Injectable identity inferrer. */
  infer?: (repos: readonly string[]) => string[];
}

/**
 * Resolves repos and identities by the documented precedence:
 *   flags CLI > dev-metrics.config.json > auto-detection.
 *
 * Each field is resolved INDEPENDENTLY: you can pass `--repos` on the CLI and
 * let identities come from the config or auto-detection. Auto-detection runs
 * lazily, only for the fields that neither flags nor config supplied — so a
 * fully-specified config never triggers a disk scan.
 */
export function resolveCollectInputs(opts: ResolveOptions): ResolvedCollectInputs {
  const warnings: string[] = [];
  const configPath = opts.configPath;
  const config = configPath !== undefined ? loadConfig(configPath) : null;
  const discover = opts.discover ?? ((baseDir: string) => discoverRepos({ baseDir }));
  // Auto-inference returns CONFIRMED identities only (candidates are never used
  // for git filtering). Anchored to the detected gh logins so a colleague's
  // email is never silently attributed to the user.
  const infer =
    opts.infer ??
    ((repos): string[] => {
      const own = new Set(detectGithubAccounts().accounts.map((a) => a.login.toLowerCase()));
      return inferIdentities(repos, own).identities;
    });
  const baseDir = config?.baseDir ?? defaultBaseDir();

  const repos = resolveList(opts.flags.repos, config?.repos, () => {
    const found = discover(baseDir);
    if (found.length === 0) {
      warnings.push(
        `No repos from flags, config, or auto-detection (scanned ${baseDir}). ` +
          `Pass --repos, run \`dev-metrics init\`, or edit dev-metrics.config.json.`,
      );
    }
    return found;
  });

  const identities = resolveList(opts.flags.emails, config?.identities, () => {
    // Auto-infer from whatever repos resolved above (real emails from git log).
    const inferred = infer(repos.value);
    if (inferred.length === 0) {
      warnings.push(
        'No identities from flags, config, or git history. Pass --emails or set identities in the config.',
      );
    }
    return inferred;
  });

  return {
    repos: repos.value,
    identities: identities.value,
    reposSource: repos.source,
    identitiesSource: identities.source,
    config,
    warnings,
  };
}
