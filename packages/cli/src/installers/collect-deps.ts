import type { InstallerOps, PackageManager } from '../types.js';

/**
 * Wraps an InstallerOps so addDevDependency calls are RECORDED (ordered,
 * de-duplicated) instead of executed immediately. Every other op passes through.
 * After all installers run, flush() performs a SINGLE package-manager
 * invocation with all collected packages — one graph resolution / one lockfile
 * write instead of up to 8 (aud-perf, ledger #10). First-seen order is
 * preserved so the install command is deterministic and testable.
 */
export function createDepCollector(base: InstallerOps): {
  ops: InstallerOps;
  flush: (dir: string, pm: PackageManager) => void;
} {
  const packages: string[] = [];
  const seen = new Set<string>();
  const ops: InstallerOps = {
    ...base,
    addDevDependency: (_dir, _pm, ...pkgs) => {
      for (const p of pkgs) {
        if (!seen.has(p)) { seen.add(p); packages.push(p); }
      }
    },
  };
  const flush = (dir: string, pm: PackageManager) => {
    if (packages.length === 0) return;
    base.addDevDependency(dir, pm, ...packages);
  };
  return { ops, flush };
}
