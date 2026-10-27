/**
 * Supabase sync client — Phase 1 contract.
 *
 * The apps stay local-first: the till's Zustand store remains the source of
 * truth for the current device. This client is the bridge to the central
 * Postgres backend: push local mutations up, pull remote changes down.
 *
 * Boundary rules (mirrors the app):
 *   · records carry `updated_at` + `version` — deltas only, never full dumps
 *   · stock-level changes are push-only movements; balances are recomputed
 *   · RLS in the database enforces the same role matrix as apps/web/src/lib/roles.ts
 */

export interface SyncConfig {
  /** https://<project>.supabase.co */
  url: string;
  anonKey: string;
}

/** One logical record as synced. `table` names the backend table. */
export interface SyncRecord {
  table: string;
  id: string;
  /** Full row payload — the domain object serialized. */
  data: Record<string, unknown>;
  /** Client-side mutation time — drives last-write-wins on conflicts. */
  updatedAt: string;
  version: number;
  deleted?: boolean;
}

export interface PullResult {
  records: SyncRecord[];
  /** High-water mark — pass back as `since` on the next pull. */
  cursor: string;
  hasMore: boolean;
}

export interface PushResult {
  accepted: string[];   // record ids the server stored
  conflicts: { id: string; serverVersion: number }[];
  errors: { id: string; message: string }[];
}

export type SyncStatus = 'offline' | 'synced' | 'syncing' | 'error';

/**
 * Contract for the sync engine (Phase 2 implements the engine on top of this;
 * the app never talks to supabase-js directly).
 */
export interface PosSyncClient {
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;

  /** Rows changed server-side since `cursor` ('' = full pull). */
  pull(since: string): Promise<PullResult>;

  /** Locally-created/updated rows not yet acknowledged by the server. */
  push(records: SyncRecord[]): Promise<PushResult>;

  /** Live updates for tills that should react immediately (sales, stock). */
  subscribe(tables: string[], onChange: (r: SyncRecord) => void): () => void;

  status(): SyncStatus;
  onStatus(cb: (s: SyncStatus) => void): () => void;
}
