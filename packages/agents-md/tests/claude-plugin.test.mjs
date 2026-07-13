// Validación del plugin de Claude Code del repo (.claude-plugin/ + skills/).
// Gate de research/ecc-inspiration.md §1: manifest válido, rutas que existen,
// y el set de skills EXACTO — una skill interna que se cuele aquí se publica.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const pluginDir = path.join(repoRoot, '.claude-plugin');
const skillsDir = path.join(repoRoot, 'skills');

// Set curado y deliberado. dreaming y deepcheck quedan fuera (piloto privado);
// audit-devground-init es interna del repo (destilada por deepcheck).
const CURATED_SKILLS = ['cimientos', 'escritura-tecnica', 'spec-flow'];

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

describe('plugin.json', () => {
  const plugin = readJson(path.join(pluginDir, 'plugin.json'));

  it('nombre kebab-case y versión semver', () => {
    expect(plugin.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(plugin.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(plugin.description).toBeTruthy();
  });

  it('NO declara hooks: los hooks del harness son opt-in (npx devground-hooks)', () => {
    // Un plugin auto-carga sus hooks para todo el que lo instala; con
    // devground-hooks instalado correrían DOS veces por edición. Decisión
    // de research/ecc-inspiration.md §1 — este test la hace permanente.
    expect(plugin.hooks).toBeUndefined();
  });
});

describe('marketplace.json', () => {
  const marketplace = readJson(path.join(pluginDir, 'marketplace.json'));

  it('describe el marketplace y expone el plugin del propio repo', () => {
    expect(marketplace.name).toBe('devground');
    expect(marketplace.description).toBeTruthy();
    expect(marketplace.plugins).toHaveLength(1);
    expect(marketplace.plugins[0]).toMatchObject({ name: 'devground', source: './' });
  });

  it('el nombre del plugin coincide con plugin.json', () => {
    const plugin = readJson(path.join(pluginDir, 'plugin.json'));
    expect(marketplace.plugins[0].name).toBe(plugin.name);
  });
});

describe('skills/ (raíz del plugin)', () => {
  it('contiene EXACTAMENTE el set curado', () => {
    expect(fs.readdirSync(skillsDir).sort()).toEqual([...CURATED_SKILLS].sort());
  });

  it.each(CURATED_SKILLS)('%s: resuelve dentro del repo y su SKILL.md es válido', (name) => {
    const dir = path.join(skillsDir, name);
    const real = fs.realpathSync(dir);
    expect(real.startsWith(fs.realpathSync(repoRoot) + path.sep)).toBe(true);

    const skillMd = fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8');
    const frontmatter = skillMd.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
    expect(frontmatter).toMatch(new RegExp(`^name: ${name}$`, 'm'));
    expect(frontmatter).toMatch(/^description:/m);
  });
});
