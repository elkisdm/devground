#!/usr/bin/env node
// Sincroniza los archivos vivos de la regla de orquestación (~/.claude) hacia el
// mirror versionado (packages/sdd/orchestration/). Fuente de verdad = los archivos
// vivos. settings.hooks.json y CLAUDE.rule.md son extractos de merge: se mantienen
// a mano, este script NO los toca.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const home = os.homedir();
const MAP = [
  ['scripts/orchestrator-gate.sh',    'orchestration/scripts/orchestrator-gate.sh'],
  ['scripts/orchestrator-context.sh', 'orchestration/scripts/orchestrator-context.sh'],
  ['agents/planner.md',               'orchestration/agents/planner.md'],
  ['agents/planner-deep.md',          'orchestration/agents/planner-deep.md'],
  ['agents/ejecutor.md',              'orchestration/agents/ejecutor.md'],
];
let n = 0;
for (const [src, dst] of MAP) {
  const s = path.join(home, '.claude', src);
  if (!fs.existsSync(s)) { console.error(`✗ falta fuente: ${s}`); process.exit(1); }
  fs.copyFileSync(s, path.join(pkgRoot, dst));
  n++;
}
console.log(`✓ orquestación sincronizada: ${n} archivos desde ~/.claude -> orchestration/`);
