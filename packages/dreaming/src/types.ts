/** One user or assistant turn kept in a distilled session. */
export interface Turn {
  ts: string | null;
  text: string;
}

/** A single session's transcript, distilled to its reasoning spine + errors. */
export interface DistilledSession {
  session: string;
  title: string | null;
  branch: string | null;
  cwd: string | null;
  firstTs: string | null;
  lastTs: string | null;
  userTurns: Turn[];
  assistantTurns: Turn[];
  errors: string[];
}

/** Frontmatter + size snapshot of one memory note. */
export interface MemorySnapshot {
  file: string;
  name: string;
  description: string;
  type: string;
  created: string;
  updated: string;
  bodyLen: number;
}

/** Persisted per-project dreaming state (`<memory>/.dream/state.json`). */
export interface DreamState {
  last_dream_ts?: string;
  history?: Array<{
    ts: string;
    sessions_reviewed: number;
    proposed?: number;
    applied?: number;
    proposal?: string;
  }>;
}
