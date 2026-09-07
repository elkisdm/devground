import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { copyDirGuarded } from './copy-guarded.js';

let tmp;
let src;
let dst;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-conv-'));
  src = path.join(tmp, 'src');
  dst = path.join(tmp, 'dst');
  fs.mkdirSync(src, { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

function write(root, rel, content) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
  return full;
}

describe('copyDirGuarded', () => {
  it('copia archivos nuevos y crea el destino si no existe', () => {
    write(src, 'SKILL.md', 'contenido');

    const res = copyDirGuarded(src, dst);

    expect(res).toEqual({ written: 1, skipped: 0 });
    expect(fs.readFileSync(path.join(dst, 'SKILL.md'), 'utf8')).toBe('contenido');
  });

  it('NUNCA sobreescribe un archivo existente: conserva la edición local', () => {
    // El invariante que sostiene la promesa del paquete. Si esto se rompe, cada
    // re-instalación borra el trabajo del usuario en sus skills.
    write(src, 'SKILL.md', 'version nueva del paquete');
    write(dst, 'SKILL.md', 'MI EDICION LOCAL');

    const res = copyDirGuarded(src, dst);

    expect(fs.readFileSync(path.join(dst, 'SKILL.md'), 'utf8')).toBe('MI EDICION LOCAL');
    expect(res).toEqual({ written: 0, skipped: 1 });
  });

  it('recursa en subdirectorios y suma los conteos de cada nivel', () => {
    write(src, 'SKILL.md', 'raiz');
    write(src, 'references/base.md', 'base');
    write(src, 'references/anidado/hondo.md', 'hondo');

    const res = copyDirGuarded(src, dst);

    expect(res).toEqual({ written: 3, skipped: 0 });
    expect(fs.existsSync(path.join(dst, 'references/anidado/hondo.md'))).toBe(true);
  });

  it('en una re-instalación mixta agrega lo nuevo y respeta lo viejo', () => {
    write(src, 'SKILL.md', 'v2');
    write(src, 'references/nuevo.md', 'archivo agregado en v2');
    write(dst, 'SKILL.md', 'v1 editado por mi');

    const res = copyDirGuarded(src, dst);

    expect(res).toEqual({ written: 1, skipped: 1 });
    expect(fs.readFileSync(path.join(dst, 'SKILL.md'), 'utf8')).toBe('v1 editado por mi');
    expect(fs.existsSync(path.join(dst, 'references/nuevo.md'))).toBe(true);
  });

  it('un directorio vacío no cuenta como archivo escrito', () => {
    fs.mkdirSync(path.join(src, 'vacio'), { recursive: true });

    const res = copyDirGuarded(src, dst);

    expect(res).toEqual({ written: 0, skipped: 0 });
    expect(fs.existsSync(path.join(dst, 'vacio'))).toBe(true);
  });

  it('no sigue un symlink como si fuera archivo regular', () => {
    // withFileTypes marca el symlink como isSymbolicLink, no isFile: se ignora
    // en vez de copiarse. Copiarlo escribiría fuera del destino previsto.
    write(src, 'real.md', 'real');
    fs.symlinkSync(path.join(src, 'real.md'), path.join(src, 'enlace.md'));

    const res = copyDirGuarded(src, dst);

    expect(res).toEqual({ written: 1, skipped: 0 });
    expect(fs.existsSync(path.join(dst, 'enlace.md'))).toBe(false);
  });
});
