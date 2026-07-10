#!/usr/bin/env node
// Sincroniza la skill canónica spec-flow (~/.claude/skills/spec-flow/) hacia la copia
// versionada del paquete (packages/sdd/skill/). La fuente de verdad es la skill viva.
// Copia SKILL.md + references/; NO copia evals/ (se mantiene solo en la fuente canónica).
// No se ata a prepublishOnly a propósito: la fuente vive fuera del repo (~/.claude), así
// que el mirror commiteado es lo que se publica y sincronizar es un acto deliberado.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(scriptDir, '..');
const source = path.join(os.homedir(), '.claude', 'skills', 'spec-flow');
const dest = path.join(pkgRoot, 'skill');
const INCLUDE = ['SKILL.md', 'references'];

function copyRecursive(src, dst) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dst, entry));
    }
  } else {
    fs.copyFileSync(src, dst);
  }
}

if (!fs.existsSync(source)) {
  console.error(`✗ Fuente canónica no encontrada: ${source}`);
  console.error('  Corre este script en una máquina con la skill spec-flow instalada.');
  process.exit(1);
}

for (const name of INCLUDE) {
  const src = path.join(source, name);
  if (!fs.existsSync(src)) continue;
  const dst = path.join(dest, name);
  if (fs.existsSync(dst) && fs.statSync(dst).isDirectory()) {
    fs.rmSync(dst, { recursive: true, force: true });
  }
  copyRecursive(src, dst);
}
console.log(`✓ spec-flow sincronizado: ${source} -> ${dest}`);
