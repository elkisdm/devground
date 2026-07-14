#!/usr/bin/env node

/**
 * Installs the orchestration hard-rule (gate + context hooks + planner/ejecutor
 * agents) into ~/.claude. Standalone files are copied guarded (never overwritten);
 * settings.json and CLAUDE.md are MERGE targets, so their snippets are printed for
 * you to merge by hand.
 *
 *   npx -p @devground/sdd devground-orchestration
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const g = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const w = (m) => console.log(`  \x1b[33m!\x1b[0m ${m}`);
const i = (m) => console.log(`  \x1b[36m→\x1b[0m ${m}`);

function copyDirGuarded(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  let written = 0, skipped = 0;
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) { const r = copyDirGuarded(s, d); written += r.written; skipped += r.skipped; }
    else if (e.isFile()) {
      if (fs.existsSync(d)) { skipped++; }
      else { fs.copyFileSync(s, d); if (s.endsWith('.sh')) fs.chmodSync(d, 0o755); written++; }
    }
  }
  return { written, skipped };
}

const home = os.homedir();
const base = path.join(__dirname, 'orchestration');
if (!fs.existsSync(base)) {
  console.error('\x1b[31m✗\x1b[0m orchestration/ not found in package. Aborting.');
  process.exit(1);
}
let written = 0, skipped = 0;
for (const [sub, dst] of [['scripts', path.join(home, '.claude', 'scripts')], ['agents', path.join(home, '.claude', 'agents')]]) {
  const r = copyDirGuarded(path.join(base, sub), dst);
  written += r.written; skipped += r.skipped;
}
if (written > 0) g(`orchestration installed — ~/.claude — ${written} file(s)`);
if (skipped > 0) w(`${skipped} file(s) already existed (kept your version)`);
if (written === 0 && skipped > 0) i('Files already up to date.');

console.log('');
i('Manual merge required (these are merge targets, not standalone files):');
i(`1. Add the hook blocks from ${path.join(base, 'settings.hooks.json')} to ~/.claude/settings.json ("hooks" key).`);
i(`2. Add the rule paragraph from ${path.join(base, 'CLAUDE.rule.md')} to your CLAUDE.md "## Rules".`);
i('Bypass switch (per session): CLAUDE_ORCHESTRATOR_GATE=off');
