import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DevMetricsConfig, EventAnnotation } from '../types.js';

/** Conventional filename of the versionable config. */
export const CONFIG_FILENAME = 'dev-metrics.config.json';

/** Default config path: `<cwd>/dev-metrics.config.json`. */
export function defaultConfigPath(cwd = process.cwd()): string {
  return join(cwd, CONFIG_FILENAME);
}

/**
 * Reads and normalises a config file. Returns `null` when the file does not
 * exist (NOT an error: config is optional, auto-detection is the fallback).
 * Throws only on malformed JSON or a non-object root, so a typo is loud.
 */
export function loadConfig(path: string): DevMetricsConfig | null {
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, 'utf-8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Config ${path} is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Config ${path} must be a JSON object`);
  }
  return normalizeConfig(parsed as Record<string, unknown>);
}

/** Coerces an unknown object into a well-typed config with safe defaults. */
export function normalizeConfig(obj: Record<string, unknown>): DevMetricsConfig {
  const config: DevMetricsConfig = {
    repos: toStringArray(obj.repos),
    identities: toStringArray(obj.identities),
  };
  const candidates = toStringArray(obj.candidateIdentities);
  if (candidates.length > 0) config.candidateIdentities = candidates;
  if (typeof obj.baseDir === 'string') config.baseDir = obj.baseDir;
  const excludes = toStringArray(obj.excludes);
  if (excludes.length > 0) config.excludes = excludes;
  const events = toEventArray(obj.events);
  if (events.length > 0) config.events = events;
  return config;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.trim() !== '');
}

function toEventArray(value: unknown): EventAnnotation[] {
  if (!Array.isArray(value)) return [];
  const out: EventAnnotation[] = [];
  for (const v of value) {
    if (typeof v !== 'object' || v === null) continue;
    const e = v as Record<string, unknown>;
    if (typeof e.date !== 'string' || typeof e.label !== 'string') continue;
    out.push(
      typeof e.description === 'string'
        ? { date: e.date, label: e.label, description: e.description }
        : { date: e.date, label: e.label },
    );
  }
  return out;
}

/** Where a resolved value came from, for transparent logging. */
export type Source = 'flag' | 'config' | 'auto';

/** A resolved field plus its provenance. */
export interface Resolved<T> {
  value: T;
  source: Source;
}

/**
 * Resolves one list-valued field by the documented precedence:
 *   flags CLI > config file > auto-detection.
 * The first non-empty source wins. `auto` is a thunk so detection only runs
 * when neither flags nor config provided the value (lazy, no wasted scans).
 */
export function resolveList(
  flag: readonly string[] | undefined,
  fromConfig: readonly string[] | undefined,
  auto: () => string[],
): Resolved<string[]> {
  if (flag !== undefined && flag.length > 0) return { value: [...flag], source: 'flag' };
  if (fromConfig !== undefined && fromConfig.length > 0) {
    return { value: [...fromConfig], source: 'config' };
  }
  return { value: auto(), source: 'auto' };
}
