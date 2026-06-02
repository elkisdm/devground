import type {
  Snapshot,
  GitMetrics,
  TranscriptMetrics,
  DerivedMetrics,
  RepoBreakdown,
  UnattributedTokens,
  RepoAdoption,
  MemoryMetrics,
  EventAnnotation,
} from '../types.js';
import { SNAPSHOT_SCHEMA_VERSION } from '../types.js';
import { rSquared, safeRatio, round } from './stats.js';
import { totalTokens } from './transcript.js';

export interface BuildSnapshotInput {
  label: string | null;
  since: string | null;
  until: string | null;
  authorEmails: string[];
  git: GitMetrics;
  transcript: TranscriptMetrics;
  repoBreakdown: RepoBreakdown[];
  unattributed: UnattributedTokens;
  adoption: RepoAdoption[];
  memory: MemoryMetrics;
  events: EventAnnotation[];
  generatedAt?: string;
}

/** Computes the git+transcript derived metrics. */
export function computeDerived(
  git: GitMetrics,
  transcript: TranscriptMetrics,
  repoBreakdown: readonly RepoBreakdown[],
): DerivedMetrics {
  const totalTok = totalTokens(transcript.tokens);
  const totalCalls =
    transcript.toolUse.Write +
    transcript.toolUse.Edit +
    transcript.toolUse.Read +
    transcript.toolUse.Bash +
    transcript.toolUse.Other;

  // v2: the token series is REAL measured output per repo (read from each
  // repo's transcript dir), not a churn-proportional estimate. Repos with no
  // transcript dir (outputTokens === null) are excluded so a missing dir does
  // not masquerade as a genuine zero in the correlation.
  const measured = repoBreakdown.filter((r) => r.outputTokens !== null);
  const churnSeries = measured.map((r) => r.churnGross);
  const tokenSeries = measured.map((r) => r.outputTokens as number);

  return {
    tokensPerCommit: roundNullable(safeRatio(totalTok, git.commits)),
    toolCallsPerCommit: roundNullable(safeRatio(totalCalls, git.commits)),
    churnTokensR2: roundNullable(rSquared(churnSeries, tokenSeries)),
  };
}

function roundNullable(value: number | null): number | null {
  return value === null ? null : round(value);
}

/** Assembles a full, self-describing snapshot. */
export function buildSnapshot(input: BuildSnapshotInput): Snapshot {
  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    label: input.label,
    period: { since: input.since, until: input.until },
    authorEmails: input.authorEmails,
    git: input.git,
    transcript: input.transcript,
    derived: computeDerived(input.git, input.transcript, input.repoBreakdown),
    repoBreakdown: input.repoBreakdown,
    unattributed: input.unattributed,
    adoption: input.adoption,
    memory: input.memory,
    events: input.events,
  };
}
