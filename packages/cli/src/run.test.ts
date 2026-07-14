import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import prompts from 'prompts';
import { printStack, chooseInstallers, runInstallers, ALL_INSTALLERS, type Installer } from './run.js';
import { makeRecordingOps } from './installers/test-helpers.js';
import type { DetectedStack, InstallerOptions } from './types.js';

vi.mock('prompts', () => ({ default: vi.fn() }));

const NODE_STACK: DetectedStack = {
  framework: 'node',
  hasTypeScript: true,
  packageManager: 'pnpm',
};

beforeEach(() => {
  // printStack/chooseInstallers/runInstallers log through @devground/logger ->
  // console.log (info/log) and console.error (error); silence both.
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('printStack', () => {
  it('logs framework, TypeScript, and package manager', () => {
    const logSpy = vi.spyOn(console, 'log');

    printStack(NODE_STACK);

    const lines = logSpy.mock.calls.map((call) => String(call[0]));
    expect(lines.some((l) => l.includes('node'))).toBe(true);
    expect(lines.some((l) => l.includes('yes'))).toBe(true);
    expect(lines.some((l) => l.includes('pnpm'))).toBe(true);
  });
});

describe('chooseInstallers', () => {
  it('--yes selects every installer without prompting', async () => {
    const result = await chooseInstallers({ yes: true }, false);

    expect(result).toHaveLength(ALL_INSTALLERS.length);
    expect(prompts).not.toHaveBeenCalled();
  });

  it('--preset agents-only selects just the agents-md installer', async () => {
    const result = await chooseInstallers({ preset: 'agents-only' }, false);

    expect(result?.map((i) => i.value)).toEqual(['agents-md']);
  });

  it('defaults to the full preset in a non-interactive environment with no flags', async () => {
    const result = await chooseInstallers({}, false);

    expect(result).toHaveLength(ALL_INSTALLERS.length);
    expect(prompts).not.toHaveBeenCalled();
  });

  it('prompts interactively when TTY and no flags, returning the selected installers', async () => {
    vi.mocked(prompts).mockResolvedValue({ tools: ['prettier', 'eslint'] });

    const result = await chooseInstallers({}, true);

    expect(prompts).toHaveBeenCalledOnce();
    expect(result?.map((i) => i.value)).toEqual(['prettier', 'eslint']);
  });

  it('returns null when the interactive prompt yields no selection', async () => {
    vi.mocked(prompts).mockResolvedValue({ tools: [] });

    const result = await chooseInstallers({}, true);

    expect(result).toBeNull();
  });

  it('returns null when the interactive prompt is cancelled (no tools key)', async () => {
    vi.mocked(prompts).mockResolvedValue({});

    const result = await chooseInstallers({}, true);

    expect(result).toBeNull();
  });
});

describe('runInstallers', () => {
  function optionsFor(): InstallerOptions {
    const { ops } = makeRecordingOps();
    return { targetDir: '/proj', stack: NODE_STACK, ops };
  }

  it('tallies installed and skipped results and flushes once', () => {
    const flushCalls: Array<{ dir: string; pm: string }> = [];
    const selected: Installer[] = [
      { name: 'a', value: 'a', install: () => 'installed' },
      { name: 'b', value: 'b', install: () => 'skipped' },
      { name: 'c', value: 'c', install: () => 'installed' },
    ];
    const flush = (dir: string, pm: string) => flushCalls.push({ dir, pm });

    const tally = runInstallers(selected, optionsFor(), flush, 'pnpm', '/proj');

    expect(tally).toEqual({ installed: 2, skipped: 1, failed: 0 });
    expect(flushCalls).toEqual([{ dir: '/proj', pm: 'pnpm' }]);
  });

  it('counts a thrown installer as failed and keeps running the rest', () => {
    const selected: Installer[] = [
      {
        name: 'broken',
        value: 'broken',
        install: () => {
          throw new Error('boom');
        },
      },
      { name: 'ok', value: 'ok', install: () => 'installed' },
    ];

    const tally = runInstallers(selected, optionsFor(), () => {}, 'pnpm', '/proj');

    expect(tally).toEqual({ installed: 1, skipped: 0, failed: 1 });
  });

  it('exits 1 when the dependency flush fails', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const flush = () => {
      throw new Error('pm install failed');
    };

    runInstallers([], optionsFor(), flush, 'pnpm', '/proj');

    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
