import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const skillDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'skills',
  'rueditas',
);
const refs = path.join(skillDir, 'references');
const read = (p) => fs.readFileSync(p, 'utf8');
const size = (p) => fs.statSync(p).size;
const etapas = [1, 2, 3, 4, 5].map((n) => path.join(refs, `etapa-${n}.md`));

describe('presupuesto de tokens', () => {
  it('SKILL.md pesa 6144 bytes o menos', () => {
    expect(size(path.join(skillDir, 'SKILL.md'))).toBeLessThanOrEqual(6144);
  });

  it.each(etapas)('%s existe y pesa 2048 bytes o menos', (f) => {
    expect(fs.existsSync(f)).toBe(true);
    expect(size(f)).toBeLessThanOrEqual(2048);
  });

  it('existe progreso-plantilla.md', () => {
    expect(fs.existsSync(path.join(refs, 'progreso-plantilla.md'))).toBe(true);
  });
});

describe('etapas', () => {
  it.each(etapas)('%s tiene «Listo cuando» con cada punto marcado', (f) => {
    const texto = read(f);
    expect(texto).toContain('## Listo cuando');
    const seccion = texto.split('## Listo cuando')[1].split(/\n## /)[0];
    const puntos = seccion.split('\n').filter((l) => l.startsWith('- [ ]'));
    expect(puntos.length).toBeGreaterThan(0);
    for (const p of puntos) expect(p).toMatch(/\[(revisas|evidencia|decide)\]/);
  });
});

describe('glosario', () => {
  const lineas = read(path.join(refs, 'glosario.md'))
    .split('\n')
    .filter((l) => l.startsWith('- **'));

  it('cada línea es «- **término**: texto» de 240 caracteres o menos', () => {
    for (const l of lineas) {
      expect(l).toMatch(/^- \*\*[^*]+\*\*: \S/);
      expect(l.length).toBeLessThanOrEqual(240);
    }
  });

  it('no repite términos (sin distinguir mayúsculas)', () => {
    const terminos = lineas.map((l) => l.match(/^- \*\*([^*]+)\*\*/)[1].toLowerCase());
    expect(new Set(terminos).size).toBe(terminos.length);
  });

  it('tiene al menos 30 términos', () => {
    expect(lineas.length).toBeGreaterThanOrEqual(30);
  });
});

describe('SKILL.md', () => {
  const texto = read(path.join(skillDir, 'SKILL.md'));
  const front = texto.match(/^---\n([\s\S]*?)\n---/)[1];

  it('frontmatter con name rueditas y description de 300 caracteres o menos', () => {
    expect(front).toMatch(/^name: rueditas$/m);
    const desc = front.match(/^description: (.+)$/m)[1];
    expect(desc.length).toBeLessThanOrEqual(300);
  });

  it('explica cómo apagar y que el progreso no se borra', () => {
    expect(texto).toContain('quita las rueditas');
    expect(texto).toContain('.claude/skills/rueditas/');
    expect(texto).toMatch(
      /NO (se )?borr\w*[^\n]*\.devground\/rueditas\.md|\.devground\/rueditas\.md[^\n]*NO (se )?borr/i,
    );
  });
});

describe('reglas aprendidas de errores reales', () => {
  const skill = read(path.join(skillDir, 'SKILL.md'));
  const etapa3 = read(etapas[2]);
  const etapa4 = read(etapas[3]);

  it('para cuando el mismo error vuelve dos veces y revisa la premisa', () => {
    expect(skill).toMatch(/mismo error[^\n]*dos veces/i);
    expect(skill).toMatch(/premisa/i);
  });

  it('pide el monto y el sí antes de gastar o hacer algo irreversible', () => {
    expect(skill).toMatch(/cuánto cuesta/i);
    expect(skill).toMatch(/irreversible/i);
  });

  it('revisa claves y .gitignore antes de cada commit', () => {
    expect(etapa3).toMatch(/antes del commit[^\n]*claves[^\n]*\.gitignore/i);
  });

  it('solo da algo por publicado tras abrir la dirección real y ver el cambio nuevo', () => {
    expect(etapa4).toMatch(/publicado[^\n]*dirección real[^\n]*cambio nuevo/i);
  });
});
