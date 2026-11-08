import { join } from 'node:path';
import type { InstallerOps } from '../types.js';

/**
 * Busca una config previa del usuario entre TODAS las variantes que la
 * herramienta real carga. Devuelve la primera encontrada: la ruta del archivo,
 * o `package.json#<clave>` si la clave existe en package.json. `undefined` si
 * no hay ninguna.
 */
export function findExistingConfig(
  ops: InstallerOps,
  targetDir: string,
  { files, pkgKey }: { files: string[]; pkgKey?: string },
): string | undefined {
  for (const file of files) {
    const path = join(targetDir, file);
    if (ops.fileExists(path)) return path;
  }
  if (pkgKey !== undefined && pkgKey in ops.readPackageJson(targetDir)) {
    return `package.json#${pkgKey}`;
  }
  return undefined;
}

/** Expande `base` con cada extensión: `withExts('a.config', ['js','ts'])` → `['a.config.js','a.config.ts']`. */
export function withExts(base: string, exts: string[]): string[] {
  return exts.map((ext) => `${base}.${ext}`);
}
