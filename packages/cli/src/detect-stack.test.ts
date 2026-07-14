import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectStack } from './detect-stack.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'devground-detect-'));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function writePackageJson(content: Record<string, unknown>): void {
  writeFileSync(join(tmpDir, 'package.json'), JSON.stringify(content));
}

describe('detectStack — framework detection', () => {
  it('detects Next.js when "next" is in dependencies', () => {
    writePackageJson({ dependencies: { next: '^16.0.0', react: '^19.0.0' } });

    expect(detectStack(tmpDir).framework).toBe('nextjs');
  });

  it('detects React when "react" is present but "next" is not', () => {
    writePackageJson({ dependencies: { react: '^19.0.0' } });

    expect(detectStack(tmpDir).framework).toBe('react');
  });

  it('detects Astro when "astro" is in dependencies', () => {
    writePackageJson({ dependencies: { astro: '^5.0.0' } });

    expect(detectStack(tmpDir).framework).toBe('astro');
  });

  it('prefers Astro over React (islands run under the Astro umbrella)', () => {
    writePackageJson({ dependencies: { astro: '^5.0.0', react: '^19.0.0' } });

    expect(detectStack(tmpDir).framework).toBe('astro');
  });

  it('prefers Next.js over Astro when both are present', () => {
    writePackageJson({ dependencies: { next: '^16.0.0', astro: '^5.0.0' } });

    expect(detectStack(tmpDir).framework).toBe('nextjs');
  });

  it('detects Node.js when no react or next, but other deps exist', () => {
    writePackageJson({ dependencies: { express: '^4.0.0' } });

    expect(detectStack(tmpDir).framework).toBe('node');
  });

  it('returns "unknown" when no dependencies', () => {
    writePackageJson({ name: 'empty-pkg' });

    expect(detectStack(tmpDir).framework).toBe('unknown');
  });

  it('reads framework from devDependencies too', () => {
    writePackageJson({ devDependencies: { next: '^16.0.0' } });

    expect(detectStack(tmpDir).framework).toBe('nextjs');
  });

  it('classifies a repo with no package.json as unknown without throwing', () => {
    const stack = detectStack(tmpDir);
    expect(stack.framework).toBe('unknown');
    expect(stack.hasTypeScript).toBe(false);
  });
});

describe('detectStack — TypeScript detection', () => {
  it('detects TypeScript when present in devDependencies', () => {
    writePackageJson({ devDependencies: { typescript: '^5.0.0' } });

    expect(detectStack(tmpDir).hasTypeScript).toBe(true);
  });

  it('reports no TypeScript when absent', () => {
    writePackageJson({ dependencies: { react: '^19.0.0' } });

    expect(detectStack(tmpDir).hasTypeScript).toBe(false);
  });
});

describe('detectStack — package manager detection', () => {
  it('detects pnpm from pnpm-lock.yaml', () => {
    writePackageJson({});
    writeFileSync(join(tmpDir, 'pnpm-lock.yaml'), '');

    expect(detectStack(tmpDir).packageManager).toBe('pnpm');
  });

  it('detects yarn from yarn.lock', () => {
    writePackageJson({});
    writeFileSync(join(tmpDir, 'yarn.lock'), '');

    expect(detectStack(tmpDir).packageManager).toBe('yarn');
  });

  it('falls back to npm when no lockfile present', () => {
    writePackageJson({});

    expect(detectStack(tmpDir).packageManager).toBe('npm');
  });

  it('prefers pnpm over yarn when both lockfiles exist', () => {
    writePackageJson({});
    writeFileSync(join(tmpDir, 'pnpm-lock.yaml'), '');
    writeFileSync(join(tmpDir, 'yarn.lock'), '');

    expect(detectStack(tmpDir).packageManager).toBe('pnpm');
  });
});

