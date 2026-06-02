import type { Snapshot } from '../types.js';
import { totalTokens } from './transcript.js';
import { aggregateByCohort } from './cohort.js';

function fmt(n: number | null): string {
  if (n === null) return 'n/a';
  return Number.isInteger(n) ? n.toLocaleString('en-US') : n.toFixed(4);
}

function pctStr(n: number): string {
  return `${n.toFixed(1)}%`;
}

function period(s: Snapshot): string {
  const since = s.period.since ?? '(beginning)';
  const until = s.period.until ?? '(now)';
  return `${since} -> ${until}`;
}

/** Renders a snapshot as a human-readable markdown report. */
export function renderReport(s: Snapshot): string {
  const g = s.git;
  const t = s.transcript;
  const d = s.derived;
  const lines: string[] = [];

  lines.push(`# dev-metrics report`);
  lines.push('');
  lines.push(`- **Label**: ${s.label ?? '(none)'}`);
  lines.push(`- **Period**: ${period(s)}`);
  lines.push(`- **Generated**: ${s.generatedAt}`);
  lines.push(`- **Authors**: ${s.authorEmails.join(', ') || '(all)'}`);
  lines.push(`- **Schema**: v${s.schemaVersion}`);
  lines.push('');

  lines.push(`## Git`);
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Commits | ${fmt(g.commits)} |`);
  lines.push(`| Lines added | ${fmt(g.churn.added)} |`);
  lines.push(`| Lines deleted | ${fmt(g.churn.deleted)} |`);
  lines.push(`| Net/gross ratio (survival) | ${fmt(g.churn.netGrossRatio)} |`);
  lines.push(`| Rework ratio (fix+refactor)/feat | ${fmt(g.reworkRatio)} |`);
  lines.push(`| Files touched | ${fmt(g.files.touched)} |`);
  lines.push(`| One-shot files | ${pctStr(g.files.oneShotPct)} |`);
  lines.push(`| Reworked files (5+) | ${pctStr(g.files.reworkedPct)} |`);
  lines.push(`| Commits / active day | ${fmt(g.commitsPerActiveDay)} |`);
  lines.push('');

  // MEJORA B (v3): per-identity attribution. Only meaningful with 2+
  // identities; with 0 or 1 the dimension is omitted (not invented).
  const authors = Object.entries(g.commitsByAuthor).filter(([, n]) => n > 0);
  if (s.authorEmails.length >= 2 && authors.length >= 2) {
    lines.push(`### Commits by identity`);
    lines.push('');
    lines.push(`| Identity | Commits |`);
    lines.push(`| --- | --- |`);
    for (const [email, n] of authors.sort((a, b) => b[1] - a[1])) {
      lines.push(`| ${email} | ${fmt(n)} |`);
    }
    lines.push('');
    lines.push(
      `> Per-identity = git commits attributed by author email. Token cost by ACCOUNT remains inattributable (transcripts do not store it) — independent of how many identities you track. See ADR-0006.`,
    );
    lines.push('');
  }

  lines.push(`### Commit types`);
  lines.push('');
  lines.push(`| Type | Count |`);
  lines.push(`| --- | --- |`);
  for (const [type, count] of Object.entries(g.commitTypes)) {
    if (count > 0) lines.push(`| ${type} | ${fmt(count)} |`);
  }
  lines.push('');

  lines.push(`## Claude Code transcripts`);
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Assistant messages | ${fmt(t.messages)} |`);
  lines.push(`| Duplicates dropped (uuid) | ${fmt(t.duplicatesDropped)} |`);
  lines.push(`| Input tokens | ${fmt(t.tokens.input)} |`);
  lines.push(`| Output tokens | ${fmt(t.tokens.output)} |`);
  lines.push(`| Cache creation tokens | ${fmt(t.tokens.cacheCreation)} |`);
  lines.push(`| Cache read tokens | ${fmt(t.tokens.cacheRead)} |`);
  lines.push(`| Total tokens | ${fmt(totalTokens(t.tokens))} |`);
  lines.push(`| Write calls | ${fmt(t.toolUse.Write)} |`);
  lines.push(`| Edit calls | ${fmt(t.toolUse.Edit)} |`);
  lines.push(`| Read calls | ${fmt(t.toolUse.Read)} |`);
  lines.push(`| Bash calls | ${fmt(t.toolUse.Bash)} |`);
  lines.push(`| Edit/Write ratio | ${fmt(t.editWriteRatio)} |`);
  lines.push(`| Files iterated | ${fmt(t.fileIteration.files)} |`);
  lines.push(`| One-shot files | ${pctStr(t.fileIteration.oneShotPct)} |`);
  lines.push(`| Iterated files (4+) | ${pctStr(t.fileIteration.iteratedPct)} |`);
  lines.push(`| Ops / file | ${fmt(t.fileIteration.opsPerFile)} |`);
  lines.push('');

  if (Object.keys(t.tokensByModel).length > 0) {
    lines.push(`### Tokens by model`);
    lines.push('');
    lines.push(`| Model | Input | Output | Cache create | Cache read |`);
    lines.push(`| --- | --- | --- | --- | --- |`);
    for (const [model, u] of Object.entries(t.tokensByModel)) {
      lines.push(
        `| ${model} | ${fmt(u.input)} | ${fmt(u.output)} | ${fmt(u.cacheCreation)} | ${fmt(u.cacheRead)} |`,
      );
    }
    lines.push('');
  }

  lines.push(`## Derived`);
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Tokens / commit | ${fmt(d.tokensPerCommit)} |`);
  lines.push(`| Tool calls / commit | ${fmt(d.toolCallsPerCommit)} |`);
  lines.push(`| Churn<->output_tokens R^2 (real) | ${fmt(d.churnTokensR2)} |`);
  lines.push('');
  lines.push(
    `> v2: per-repo tokens are now MEASURED from each repo's \`~/.claude/projects/<DIR>\` transcripts, so the R^2 above is computed on real per-repo totals (not a churn estimate). Only the *account* that paid is still inattributable. See ADR-0006.`,
  );
  lines.push('');

  // Per-repo measured tokens + unattributed bucket (MEJORA 1).
  lines.push(`## Per-repo tokens (measured)`);
  lines.push('');
  lines.push(`| Repo | Commits | Churn | Output tokens | Total tokens | Dir found |`);
  lines.push(`| --- | --- | --- | --- | --- | --- |`);
  for (const r of s.repoBreakdown) {
    const name = r.path.split('/').pop() ?? r.path;
    lines.push(
      `| ${name} | ${fmt(r.commits)} | ${fmt(r.churnGross)} | ${fmt(r.outputTokens)} | ${fmt(r.totalTokens)} | ${r.transcriptDirFound ? 'yes' : 'no'} |`,
    );
  }
  lines.push(
    `| _unattributed_ (${s.unattributed.dirs} dir) | — | — | ${fmt(s.unattributed.tokens.output)} | ${fmt(totalTokens(s.unattributed.tokens))} | — |`,
  );
  lines.push('');
  lines.push(
    `> Unattributed = project dirs that map to no requested repo (subagents, sessions from \`~\`, other repos). Kept separate, never redistributed.`,
  );
  lines.push('');

  // Adoption + cohorts (MEJORA 2).
  if (s.adoption.length > 0) {
    lines.push(`## Standards adoption`);
    lines.push('');
    lines.push(`| Repo | Born | Cohort | tsconfig | strict | eslint | first test | husky | 1st conv. |`);
    lines.push(`| --- | --- | --- | --- | --- | --- | --- | --- | --- |`);
    for (const a of s.adoption) {
      const name = a.path.split('/').pop() ?? a.path;
      const m = a.markers;
      lines.push(
        `| ${name} | ${m.born ?? '—'} | ${a.cohort} | ${m.tsconfig ?? '—'} | ${m.tsconfigStrict ? 'yes' : 'no'} | ${m.eslintFlatConfig ?? '—'} | ${m.firstTest ?? '—'} | ${m.huskyPreCommit ?? '—'} | ${m.firstConventionalCommit ?? '—'} |`,
      );
    }
    lines.push('');

    const cohorts = aggregateByCohort(s);
    if (cohorts.length > 0) {
      lines.push(`### By cohort`);
      lines.push('');
      lines.push(`| Cohort | Repos | Commits | Churn | Total tokens | Tokens/commit |`);
      lines.push(`| --- | --- | --- | --- | --- | --- |`);
      for (const c of cohorts) {
        lines.push(
          `| ${c.cohort} | ${fmt(c.repos)} | ${fmt(c.commits)} | ${fmt(c.churnGross)} | ${fmt(c.totalTokens)} | ${fmt(c.tokensPerCommit)} |`,
        );
      }
      lines.push('');
      lines.push(
        `> Cohort: \`born-standardized\` = key markers (tsconfig + eslint flat config + first test) within ~7 days of birth; \`retrofitted\` = all present but later; \`partial\` = at least one missing.`,
      );
      lines.push('');
    }
  }

  // Memory / context cost (MEJORA 3).
  const mem = s.memory;
  lines.push(`## Memory & context cost`);
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Memory notes (excl. MEMORY.md) | ${fmt(mem.totalNotes)} |`);
  lines.push(`| Notes after Obsidian adoption (mtime-reliable) | ${fmt(mem.notesAfterAdoption)} |`);
  lines.push(`| Notes before adoption (mtime UNRELIABLE) | ${fmt(mem.notesBeforeAdoption)} |`);
  lines.push(`| Corpus size (bytes) | ${fmt(mem.totalBytes)} |`);
  lines.push(`| Context-cost proxy: mean early-output / session | ${fmt(mem.contextCost.meanEarlyOutputPerSession)} |`);
  lines.push(`| Context-cost first-N msgs | ${fmt(mem.contextCost.firstN)} |`);
  lines.push(`| Sessions reading /memory/ | ${fmt(mem.reuse.sessionsReadingMemory)} |`);
  lines.push(`| /memory/ Read ops | ${fmt(mem.reuse.memoryReadOps)} |`);
  lines.push('');
  lines.push(
    `> Caveats: (a) the 2026-05-16 Obsidian migration RESET file mtimes, so pre-adoption note volume is not reliable; (b) "context cost" is a PROXY = output tokens in the first ${mem.contextCost.firstN} assistant messages of each session (lower trend = better continuity, not a direct measure).`,
  );
  lines.push('');

  if (s.events.length > 0) {
    lines.push(`## Event annotations`);
    lines.push('');
    lines.push(`| Date | Label | Description |`);
    lines.push(`| --- | --- | --- |`);
    for (const e of s.events) {
      lines.push(`| ${e.date} | ${e.label} | ${e.description ?? ''} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
