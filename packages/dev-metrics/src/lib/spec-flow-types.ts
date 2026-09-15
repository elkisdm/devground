/**
 * Event shapes for spec-flow's per-change telemetry (`<repo>/.spec-flow/events.jsonl`,
 * ADR-0037). Split out of `spec-flow-events.ts` (the parser) to keep that module
 * under `max-lines` — these are pure type declarations, re-exported from
 * `spec-flow-events.js` for backward compatibility.
 */

export interface SpecFlowEvent {
  /** ISO-8601 timestamp with timezone. */
  ts: string;
  /** YYYY-MM-DD of the change. */
  date: string;
  /** kebab-case change name. */
  change: string;
  /** 0..3 ceremony tier. `undefined` when absent/malformed — NEVER 0 by default (L-2). */
  tier?: number;
  /** Conventional-commit type. */
  type: string;
  size: string;
  risk: string;
  uncertainty: string;
  /** Paths the change declared touching. */
  files: string[];
  /** Friction gauge — should be ~0 under the Prime Directive. `undefined` when absent/malformed (never `0` by default). */
  questionsAsked?: number;
  /** `"inline"` or a path to the persisted brief. */
  brief: string;
  /** Whether Step 0 found and read a code map. */
  codemapUsed: boolean;
  specFlowVersion: string;
  /** DoD compliance for tests: "verified"|"added"|"updated"|"n/a"|"deferred". Optional, backward-compatible. */
  tests?: string;
  /** Inferred-and-stated assumption count (Step 1). `undefined` when absent/malformed. */
  assumptions?: number;
  /**
   * Inline review carried by the spec event itself — the spec-flow 0.5 shape,
   * kept as the baseline the 0.6 numbers are compared against. 0.6 events
   * write the closing review as a SEPARATE `"review"` event (see `ReviewEvent`)
   * instead.
   */
  review?: SpecFlowReview;
  /**
   * Pre-mortem outcome (0.6, Tier 2+ Step 3). `{}` means the section was
   * written but no usable `na` count came with it (or `premortem:true`,
   * the legacy shape). `{na}` is the count of rows answered `n/a` (0-5).
   * `undefined` for absent/`"n/a"` (Tier 0-1, or an older event).
   */
  premortem?: { na?: number };
  /** `true` when the spec event explicitly recorded `premortem:false` — the section was skipped. */
  premortemSkipped?: boolean;
  /** Design-gate outcome (0.6, Tier 2+ Step 3.6). `undefined` for absent/`"n/a"`/no readable counts. */
  specReview?: { gapsFound?: number; gapsAdopted?: number };
}

export interface SpecFlowReview {
  level: string;
  /** Findings from review pass 1 (comparable across changes). `undefined` when missing/malformed. */
  findings?: number;
  /** Total findings closed across all passes. `undefined` when missing/malformed. */
  resolved?: number;
  /** How many review passes ran before the change closed. Valid only when ≥ 1 (L-2). */
  passes?: number;
  /** True when pass 1 hit the reviewer's finding cap — `findings` is "at least", not exact. */
  findingsCapped?: boolean;
  /** Findings in a later pass whose `file:line` falls inside an earlier pass's fix diff. */
  induced?: number;
  /** Whether an induced finding sent the change back to the spec for a redesign. */
  redesigned?: boolean;
  /** Total findings found across all passes (F6: same field the separate `review` event carries). */
  foundTotal?: number;
  /** Debt: deferred or still unresolved at close (F6). */
  open?: number;
  /** DoD compliance for tests (F6). */
  tests?: string;
}

/**
 * The closing review event (spec-flow 0.6, ADR-0037). Written when the review
 * loop closes, committed with the last fix commit, and joined to its `spec`
 * event by `change`. `level` is `undefined` both when the field is absent and
 * when it is the literal `"n/a"` — either way, no review applied, and this
 * event must NOT count as "reviewed" in any aggregate.
 */
export interface ReviewEvent {
  ts: string;
  date: string;
  change: string;
  level?: string;
  /** Pass-1 findings — the number comparable across changes. `undefined` when missing/malformed. */
  findings?: number;
  /** True when pass 1 hit the reviewer's cap — `findings` is a floor, not exact. */
  findingsCapped?: boolean;
  /** Findings across ALL passes. */
  foundTotal?: number;
  /** How many passes completed (a dead pass does not count). Valid only when ≥ 1 (L-2). */
  passes?: number;
  /** Pass ≥2 findings whose defect did not exist before the earlier fixes. */
  induced?: number;
  /** Findings fixed. */
  resolved?: number;
  /** Debt: deferred or still unresolved at close. */
  open?: number;
  /** Whether an induced finding triggered the stop rule's redesign. */
  redesigned?: boolean;
  /** DoD compliance for tests. */
  tests?: string;
  specFlowVersion: string;
}

/** The quality counter-signal: an inferred assumption that turned out wrong. */
export interface ReversalEvent {
  ts: string;
  date: string;
  /** Same `change` as the spec event it corrects. */
  change: string;
  assumption?: string;
  cost?: string;
  /** Optional: the model-orchestrator task id whose inference was reversed. */
  taskId?: number;
}
