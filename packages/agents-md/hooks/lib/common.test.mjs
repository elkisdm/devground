import { describe, it, expect } from 'vitest';
import { isDisabled, editedFilePath, findProjectBin } from './common.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

describe('isDisabled', () => {
  it('is enabled by default', () => {
    expect(isDisabled('typecheck', {})).toBe(false);
  });

  it.each(['1', 'true', 'all', 'ALL'])('kill switch global: %s', (value) => {
    expect(isDisabled('typecheck', { DEVGROUND_HOOKS_DISABLE: value })).toBe(true);
  });

  it('disables only the listed hooks', () => {
    const env = { DEVGROUND_HOOKS_DISABLE: 'typecheck, console-log' };
    expect(isDisabled('typecheck', env)).toBe(true);
    expect(isDisabled('console-log', env)).toBe(true);
    expect(isDisabled('prettier', env)).toBe(false);
  });
});

describe('editedFilePath', () => {
  it('extracts tool_input.file_path', () => {
    expect(editedFilePath({ tool_input: { file_path: '/a/b.ts' } })).toBe('/a/b.ts');
  });

  it.each([null, {}, { tool_input: {} }, { tool_input: { file_path: '' } }])(
    'returns null for %j',
    (input) => {
      expect(editedFilePath(input)).toBe(null);
    },
  );
});

describe('findProjectBin', () => {
  it('walks up to the nearest node_modules/.bin', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-hooks-'));
    const bin = path.join(root, 'node_modules', '.bin');
    fs.mkdirSync(bin, { recursive: true });
    fs.writeFileSync(path.join(bin, 'tsc'), '');
    const nested = path.join(root, 'src', 'deep');
    fs.mkdirSync(nested, { recursive: true });

    expect(findProjectBin('tsc', nested)).toBe(path.join(bin, 'tsc'));
    expect(findProjectBin('prettier', nested)).toBe(null);
  });
});
