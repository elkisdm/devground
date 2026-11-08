import { describe, it, expect } from 'vitest';
import { findExistingConfig, withExts } from './config-detect.js';
import { makeRecordingOps } from './test-helpers.js';

describe('findExistingConfig', () => {
  it('devuelve la ruta del archivo encontrado', () => {
    const { ops } = makeRecordingOps({}, ['/proj/b.json']);
    expect(findExistingConfig(ops, '/proj', { files: ['a.json', 'b.json'] })).toBe('/proj/b.json');
  });

  it('devuelve package.json#clave si la clave existe', () => {
    const { ops } = makeRecordingOps({ prettier: 'x' });
    expect(findExistingConfig(ops, '/proj', { files: ['a.json'], pkgKey: 'prettier' })).toBe(
      'package.json#prettier',
    );
  });

  it('devuelve undefined si no hay nada', () => {
    const { ops } = makeRecordingOps({});
    expect(findExistingConfig(ops, '/proj', { files: ['a.json'], pkgKey: 'k' })).toBeUndefined();
  });

  it('withExts expande extensiones', () => {
    expect(withExts('a', ['js', 'ts'])).toEqual(['a.js', 'a.ts']);
  });
});
