#!/usr/bin/env node
// Sincroniza los archivos vivos de la regla de orquestación (~/.claude) hacia el
// mirror versionado (packages/sdd/orchestration/). Fuente de verdad = los archivos
// vivos. settings.hooks.json y CLAUDE.rule.md son extractos de merge: se mantienen
// a mano, este script NO los toca. Tampoco copia delegacion.json (parámetros de cada máquina).
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
  ['agents/ejecutor-mecanico.md',     'orchestration/agents/ejecutor-mecanico.md'],
  ['agents/ejecutor-critico.md',      'orchestration/agents/ejecutor-critico.md'],
  ['scripts/encargar.py',             'orchestration/scripts/encargar.py'],
  ['scripts/delegacion-gate.py',      'orchestration/scripts/delegacion-gate.py'],
  ['scripts/delegacion-medicion.py',  'orchestration/scripts/delegacion-medicion.py'],
  ['scripts/encargar.test.py',            'orchestration/test/encargar.test.py'],
  ['scripts/delegacion-gate.test.py',     'orchestration/test/delegacion-gate.test.py'],
  ['scripts/delegacion-medicion.test.py', 'orchestration/test/delegacion-medicion.test.py'],
  ['plantillas/encargo-reglas.md',    'orchestration/plantillas/encargo-reglas.md'],
];
let n = 0;
for (const [src, dst] of MAP) {
  const s = path.join(home, '.claude', src);
  if (!fs.existsSync(s)) { console.error(`✗ falta fuente: ${s}`); process.exit(1); }
  const d = path.join(pkgRoot, dst);
  fs.mkdirSync(path.dirname(d), { recursive: true });
  fs.copyFileSync(s, d);
  n++;
}
console.log(`✓ orquestación sincronizada: ${n} archivos desde ~/.claude -> orchestration/`);
