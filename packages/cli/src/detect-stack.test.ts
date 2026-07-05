import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
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

describe('detectStack — Swift detection (ADR-0021)', () => {
  it('detects Swift from a Package.swift', () => {
    writePackageJson({});
    writeFileSync(join(tmpDir, 'Package.swift'), '// swift-tools-version: 6.2');

    expect(detectStack(tmpDir).hasSwift).toBe(true);
  });

  it('detects Swift from an .xcodeproj bundle', () => {
    writePackageJson({});
    mkdirSync(join(tmpDir, 'MyApp.xcodeproj'));

    expect(detectStack(tmpDir).hasSwift).toBe(true);
  });

  it('detects Swift from an .xcworkspace bundle', () => {
    writePackageJson({});
    mkdirSync(join(tmpDir, 'MyApp.xcworkspace'));

    expect(detectStack(tmpDir).hasSwift).toBe(true);
  });

  it('reports no Swift for a plain Node project', () => {
    writePackageJson({ dependencies: { next: '^16.0.0' } });

    expect(detectStack(tmpDir).hasSwift).toBe(false);
  });

  it('classifies a Swift-only repo with no package.json without throwing', () => {
    writeFileSync(join(tmpDir, 'Package.swift'), '// swift-tools-version: 6.2');

    const stack = detectStack(tmpDir);
    expect(stack.hasSwift).toBe(true);
    expect(stack.framework).toBe('unknown');
    expect(stack.hasTypeScript).toBe(false);
  });
});
