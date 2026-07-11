import type { UserConfig } from 'vitest/config';

/** Glob de rutas críticas (dinero/leads/auth) exigidas por ADR-0012. */
export declare const CRITICAL_GLOBS: string;

/** Umbrales altos y fijos aplicados al glob de rutas críticas. */
export declare const CRITICAL_THRESHOLDS: Record<
  string,
  { lines: number; functions: number; statements: number; branches: number }
>;

declare const config: UserConfig;
export default config;
