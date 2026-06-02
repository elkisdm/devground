import { writeFileSync, existsSync } from 'node:fs';
import type { DevMetricsConfig } from '../types.js';
import {
  detectGithubAccounts,
  discoverRepos,
  inferIdentities,
  isLikelyThirdPartyFork,
  defaultBaseDir,
} from '../lib/detect.js';
import { defaultConfigPath } from '../lib/config.js';
import { info, success, warn } from '../lib/logger.js';

export interface InitArgs {
  /** Where to write the config (default: ./dev-metrics.config.json). */
  configPath?: string;
  /** Base dir to scan for repos (default: ~/Documents). */
  baseDir?: string;
  /** Max scan depth below baseDir. */
  maxDepth?: number;
  /** Path fragments to exclude from discovery. */
  excludes?: string[];
  /** Overwrite an existing config file. */
  force?: boolean;
  /** Keep third-party forks instead of excluding them heuristically. */
  includeForks?: boolean;
}

/** Result of running `init`: the config produced and any warnings to surface. */
export interface InitResult {
  config: DevMetricsConfig;
  path: string;
  warnings: string[];
  written: boolean;
}

/**
 * Auto-detects accounts, repos and identities, then writes a versionable
 * `dev-metrics.config.json`. Degrades gracefully at every step: a missing `gh`,
 * an empty base dir, or repos with no remote never crash — they just narrow
 * what can be detected and add a warning. The result is editable by hand
 * (override repos/identities), which is the documented manual-override path.
 */
export function runInit(args: InitArgs): InitResult {
  const warnings: string[] = [];
  const path = args.configPath ?? defaultConfigPath();
  const baseDir = args.baseDir ?? defaultBaseDir();

  if (existsSync(path) && args.force !== true) {
    warnings.push(
      `${path} already exists. Re-run with --force to overwrite, or edit it by hand.`,
    );
    return {
      config: { repos: [], identities: [] },
      path,
      warnings,
      written: false,
    };
  }

  // 1. GitHub accounts (may be 0, 1, 2 or N — never assumed).
  info('Detecting GitHub accounts via `gh auth status`...');
  const gh = detectGithubAccounts();
  warnings.push(...gh.warnings);
  const ownUsernames = new Set(gh.accounts.map((a) => a.login.toLowerCase()));
  if (gh.accounts.length > 0) {
    info(`Found ${gh.accounts.length} GitHub account(s): ${gh.accounts.map((a) => a.login).join(', ')}`);
  }

  // 2. Discover repos under baseDir.
  info(`Scanning ${baseDir} for git repositories...`);
  const allRepos = discoverRepos({
    baseDir,
    maxDepth: args.maxDepth,
    excludes: args.excludes,
  });

  // 2b. Exclude third-party forks heuristically (origin owner not one of the
  //     user's gh logins). Skipped when --include-forks or no logins known.
  let repos = allRepos;
  if (args.includeForks !== true && ownUsernames.size > 0) {
    const kept: string[] = [];
    let excluded = 0;
    for (const repo of allRepos) {
      if (isLikelyThirdPartyFork(repo, ownUsernames)) {
        excluded++;
        continue;
      }
      kept.push(repo);
    }
    repos = kept;
    if (excluded > 0) {
      info(`Excluded ${excluded} repo(s) whose origin owner is not one of your GitHub accounts (use --include-forks to keep them).`);
    }
  }
  info(`Discovered ${repos.length} repo(s).`);
  if (repos.length === 0) {
    warnings.push(
      `No git repos found under ${baseDir}. Set baseDir or add repos manually in the config.`,
    );
  }

  // 3. Infer real identities (emails) from the discovered repos' git logs.
  info('Inferring author identities from git history...');
  const identities = inferIdentities(repos);
  if (identities.length === 0) {
    warnings.push(
      'No author identities inferred from git history. Add identities manually in the config.',
    );
  } else {
    info(`Inferred ${identities.length} identity/identities: ${identities.join(', ')}`);
  }

  const config: DevMetricsConfig = {
    repos,
    identities,
    baseDir,
  };
  if (args.excludes !== undefined && args.excludes.length > 0) config.excludes = args.excludes;

  writeFileSync(path, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  success(`Config written: ${path}`);
  for (const w of warnings) warn(w);

  return { config, path, warnings, written: true };
}
