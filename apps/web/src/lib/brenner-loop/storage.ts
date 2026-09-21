/**
 * Brenner Loop Session Storage
 *
 * LocalStorage persistence layer for Brenner Loop sessions.
 * Enables sessions to survive browser refresh without a backend.
 *
 * Storage structure:
 * - `brenner-sessions-index`: Array of SessionSummary for listing
 * - `brenner-session-{id}`: Full Session object for each session
 *
 * Design principles:
 * 1. Fail gracefully on quota limits
 * 2. Recover from corrupted data
 * 3. Handle concurrent tabs via storage events
 * 4. Support future migration to IndexedDB/remote
 *
 * @see brenner_bot-1v26.2 (bead)
 * @module brenner-loop/storage
 */

import type { Session, SessionPhase } from "./types";
import { CURRENT_SESSION_VERSION, createSession, isSession, isSessionPhase } from "./types";

// ============================================================================
// Constants
// ============================================================================

/** Key pattern for individual sessions */
const SESSION_KEY_PREFIX = "brenner-session-";

/** Key for the sessions index */
const INDEX_KEY = "brenner-sessions-index";

/** Key for last-visited metadata (resume intelligence) */
const RESUME_INDEX_KEY = "brenner-sessions-resume-index";

/** Maximum sessions to store (prevent runaway storage) */
const MAX_SESSIONS = 100;

/** Approximate max size per session in bytes (5MB localStorage limit) */
const MAX_SESSION_SIZE = 50_000; // 50KB per session

/** Current storage schema version for migrations */
const STORAGE_VERSION = 1;

/** Key prefix for assumption ledger entries */
const ASSUMPTION_LEDGER_PREFIX = "brenner-assumption-ledger-";

/**
 * Backup key prefix for pre-migration session payloads.
 * Intentionally does NOT match `SESSION_KEY_PREFIX` so recovery scans don't treat backups as sessions.
 */
const SESSION_BACKUP_KEY_PREFIX = "brenner-session_backup:";

const FORBIDDEN_RECORD_KEYS = new Set(["__proto__", "prototype", "constructor"]);

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ============================================================================
// Session Resume Intelligence (bead brenner_bot-5199)
// ============================================================================

export type SessionResumeLocation =
  | "overview"
  | "hypothesis"
  | "evidence"
  | "operators"
  | "test-queue"
  | "agents"
  | "brief";

export interface SessionResumeEntry {
  location: SessionResumeLocation;
  visitedAt: string;
}

export const SESSION_RESUME_LOCATION_LABELS: Record<SessionResumeLocation, string> = {
  overview: "Overview",
  hypothesis: "Hypothesis",
  evidence: "Evidence",
  operators: "Operators",
  "test-queue": "Test Queue",
  agents: "Agents",
  brief: "Brief",
};

const LOCAL_SESSION_ID_PREFIX = "SESSION-";
const SESSION_RESUME_LOCATIONS = new Set<SessionResumeLocation>([
  "overview",
  "hypothesis",
  "evidence",
  "operators",
  "test-queue",
  "agents",
  "brief",
]);

function isSessionResumeLocation(value: unknown): value is SessionResumeLocation {
  return typeof value === "string" && SESSION_RESUME_LOCATIONS.has(value as SessionResumeLocation);
}

type ResumeIndex = Record<string, SessionResumeEntry>;

function loadResumeIndex(): ResumeIndex {
  if (typeof window === "undefined") return Object.create(null);

  try {
    const raw = window.localStorage.getItem(RESUME_INDEX_KEY);
    if (!raw) return Object.create(null);
    const parsed = JSON.parse(raw) as unknown;
    const rawIndex = safeRecord<unknown>(parsed);

    const out: ResumeIndex = Object.create(null);
    for (const [sessionId, entry] of Object.entries(rawIndex)) {
      if (!sessionId.startsWith(LOCAL_SESSION_ID_PREFIX)) continue;
      if (!isRecord(entry)) continue;

      const location = entry.location;
      const visitedAt = coerceString(entry.visitedAt);
      if (!isSessionResumeLocation(location)) continue;
      if (!visitedAt) continue;

      out[sessionId] = { location, visitedAt };
    }

    return out;
  } catch {
    return Object.create(null);
  }
}

function saveResumeIndex(index: ResumeIndex): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RESUME_INDEX_KEY, JSON.stringify(index));
  } catch {
    // Best-effort only; resume metadata should never block core flows.
  }
}

function removeResumeEntries(sessionIds: string[]): void {
  if (typeof window === "undefined") return;
  if (sessionIds.length === 0) return;

  const index = loadResumeIndex();
  let changed = false;

  for (const sessionId of sessionIds) {
    if (!(sessionId in index)) continue;
    delete index[sessionId];
    changed = true;
  }

  if (changed) saveResumeIndex(index);
}

export function recordSessionResumeEntry(
  sessionId: string,
  location: SessionResumeLocation,
  options: { ifMissing?: boolean } = {},
): void {
  if (typeof window === "undefined") return;
  if (!sessionId.startsWith(LOCAL_SESSION_ID_PREFIX)) return;

  const index = loadResumeIndex();
  if (options.ifMissing && index[sessionId]) return;

  index[sessionId] = { location, visitedAt: new Date().toISOString() };
  saveResumeIndex(index);
}

export function getSessionResumeEntry(sessionId: string): SessionResumeEntry | null {
  const index = loadResumeIndex();
  return index[sessionId] ?? null;
}

export function listSessionResumeEntries(): ResumeIndex {
  return loadResumeIndex();
}

export function removeSessionResumeEntry(sessionId: string): void {
  removeResumeEntries([sessionId]);
}

export function buildSessionPath(sessionId: string, location: SessionResumeLocation): string {
  const base = `/sessions/${sessionId}`;
  switch (location) {
    case "hypothesis":
      return `${base}/hypothesis`;
    case "evidence":
      return `${base}/evidence`;
    case "operators":
      return `${base}/operators`;
    case "test-queue":
      return `${base}/test-queue`;
    case "agents":
      return `${base}/agents`;
    case "brief":
      return `${base}/brief`;
    case "overview":
    default:
      return base;
  }
}

function sessionBackupKey(sessionId: string, fromVersion: number): string {
  return `${SESSION_BACKUP_KEY_PREFIX}${sessionId}:v${fromVersion}`;
}

function coerceString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function coerceStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry) => typeof entry === "string");
}

function safeRecord<T>(value: unknown): Record<string, T> {
  if (!isRecord(value)) return Object.create(null);
  const out: Record<string, T> = Object.create(null);
  for (const [key, entry] of Object.entries(value)) {
    if (FORBIDDEN_RECORD_KEYS.has(key)) continue;
    out[key] = entry as T;
  }
  return out;
}

type Migration = (data: unknown) => unknown;

function removeSessionBackups(sessionId: string): void {
  if (typeof window === "undefined") return;

  const prefix = `${SESSION_BACKUP_KEY_PREFIX}${sessionId}:v`;
  for (let i = window.localStorage.length - 1; i >= 0; i--) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(prefix)) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Best-effort cleanup only
      }
    }
  }
}

function migrateV0ToV1(data: unknown): Session {
  if (!isRecord(data)) {
    throw new StorageError("Session data is corrupted", "CORRUPTED_DATA");
  }

  const id = coerceString(data.id);
  if (!id) {
    throw new StorageError("Session data is missing an id", "CORRUPTED_DATA");
  }

  const base = createSession({
    id,
    researchQuestion: coerceString(data.researchQuestion),
    theme: coerceString(data.theme),
    domain: coerceString(data.domain),
    createdBy: coerceString(data.createdBy),
  });

  const phase =
    typeof data.phase === "string" && isSessionPhase(data.phase)
      ? (data.phase as SessionPhase)
      : base.phase;

  const operatorApplications = isRecord(data.operatorApplications)
    ? {
        levelSplit: Array.isArray(data.operatorApplications.levelSplit)
          ? (data.operatorApplications.levelSplit as Session["operatorApplications"]["levelSplit"])
          : base.operatorApplications.levelSplit,
        exclusionTest: Array.isArray(data.operatorApplications.exclusionTest)
          ? (data.operatorApplications
              .exclusionTest as Session["operatorApplications"]["exclusionTest"])
          : base.operatorApplications.exclusionTest,
        objectTranspose: Array.isArray(data.operatorApplications.objectTranspose)
          ? (data.operatorApplications
              .objectTranspose as Session["operatorApplications"]["objectTranspose"])
          : base.operatorApplications.objectTranspose,
        scaleCheck: Array.isArray(data.operatorApplications.scaleCheck)
          ? (data.operatorApplications.scaleCheck as Session["operatorApplications"]["scaleCheck"])
          : base.operatorApplications.scaleCheck,
      }
    : base.operatorApplications;

  return {
    ...base,
    _version: 1,
    createdAt: coerceString(data.createdAt) ?? base.createdAt,
    updatedAt: coerceString(data.updatedAt) ?? base.updatedAt,
    phase,

    primaryHypothesisId: coerceString(data.primaryHypothesisId) ?? base.primaryHypothesisId,
    alternativeHypothesisIds: coerceStringArray(data.alternativeHypothesisIds),
    archivedHypothesisIds: coerceStringArray(data.archivedHypothesisIds),
    hypothesisCards: safeRecord(data.hypothesisCards),
    hypothesisEvolution: Array.isArray(data.hypothesisEvolution)
      ? (data.hypothesisEvolution as Session["hypothesisEvolution"])
      : base.hypothesisEvolution,

    operatorApplications,

    predictionIds: coerceStringArray(data.predictionIds),
    testIds: coerceStringArray(data.testIds),
    assumptionIds: coerceStringArray(data.assumptionIds),

    pendingAgentRequests: Array.isArray(data.pendingAgentRequests)
      ? (data.pendingAgentRequests as Session["pendingAgentRequests"])
      : base.pendingAgentRequests,
    agentResponses: Array.isArray(data.agentResponses)
      ? (data.agentResponses as Session["agentResponses"])
      : base.agentResponses,
    synthesis: isRecord(data.synthesis)
      ? (data.synthesis as unknown as Session["synthesis"])
      : base.synthesis,

    evidenceLedger: Array.isArray(data.evidenceLedger)
      ? (data.evidenceLedger as Session["evidenceLedger"])
      : base.evidenceLedger,
    artifacts: Array.isArray(data.artifacts)
      ? (data.artifacts as Session["artifacts"])
      : base.artifacts,

    commits: Array.isArray(data.commits) ? (data.commits as Session["commits"]) : base.commits,
    headCommitId: coerceString(data.headCommitId) ?? base.headCommitId,

    researchQuestion: coerceString(data.researchQuestion) ?? base.researchQuestion,
    theme: coerceString(data.theme) ?? base.theme,
    domain: coerceString(data.domain) ?? base.domain,
    tags: Array.isArray(data.tags)
      ? (data.tags.filter((t) => typeof t === "string") as string[])
      : base.tags,
    notes: coerceString(data.notes) ?? base.notes,
    createdBy: coerceString(data.createdBy) ?? base.createdBy,
  };
}

const SESSION_MIGRATIONS: Record<number, Migration> = {
  1: migrateV0ToV1,
};

function getSessionVersion(value: unknown): number {
  if (!isRecord(value)) return 0;
  const v = value._version;
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return 0;
  return v;
}

function runSessionMigrations(data: unknown, fromVersion: number): Session {
  let current: unknown = data;
  for (let nextVersion = fromVersion + 1; nextVersion <= CURRENT_SESSION_VERSION; nextVersion++) {
    const migration = SESSION_MIGRATIONS[nextVersion];
    if (!migration) {
      throw new StorageError(
        `Missing migration for session schema v${nextVersion}`,
        "CORRUPTED_DATA",
      );
    }
    current = migration(current);
  }

  if (!isSession(current)) {
    throw new StorageError("Session data is corrupted", "CORRUPTED_DATA");
  }
  return current;
}

// ============================================================================
// Types
// ============================================================================

/**
 * Summary of a session for list views.
 * Avoids loading full session data for browsing.
 */
export interface SessionSummary {
  /** Session ID */
  id: string;

  /** Preview of the hypothesis statement */
  hypothesis: string;

  /** Current session phase */
  phase: SessionPhase;

  /** Current confidence level (0-100) */
  confidence: number;

  /** Research question (if set) */
  researchQuestion?: string;

  /** Theme (if set) */
  theme?: string;

  /** When the session was last updated */
  updatedAt: string;

  /** When the session was created */
  createdAt: string;
}

/**
 * Storage interface for session persistence.
 * Designed to be implementation-agnostic for future migration.
 */
export interface SessionStorage {
  /**
   * Save a session to storage.
   * Creates or updates as appropriate.
   * @throws StorageError on quota exceeded or other failures
   */
  save(session: Session): Promise<void>;

  /**
   * Load a session by ID.
   * @returns Session if found, null otherwise
   */
  load(sessionId: string): Promise<Session | null>;

  /**
   * List all sessions with summaries.
   * Sorted by updatedAt (most recent first).
   */
  list(): Promise<SessionSummary[]>;

  /**
   * Delete a session by ID.
   * Silently succeeds if session doesn't exist.
   */
  delete(sessionId: string): Promise<void>;

  /**
   * Clear all sessions (use with caution).
   */
  clear(): Promise<void>;

  /**
   * Get storage statistics.
   */
  stats(): Promise<StorageStats>;
}

/**
 * Storage statistics for monitoring.
 */
export interface StorageStats {
  /** Number of sessions stored */
  sessionCount: number;

  /** Approximate total size in bytes */
  totalSize: number;

  /** Approximate remaining quota in bytes */
  remainingQuota: number;

  /** Oldest session date */
  oldestSession?: string;

  /** Newest session date */
  newestSession?: string;
}

/**
 * Assumption ledger entry persisted alongside sessions (localStorage).
 */
export interface AssumptionLedgerEntry {
  id: string;
  statement: string;
  criticality: "foundational" | "important" | "minor";
  dependsOn: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Error types for storage operations.
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: StorageErrorCode,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "StorageError";
  }
}

export type StorageErrorCode =
  | "QUOTA_EXCEEDED"
  | "CORRUPTED_DATA"
  | "SESSION_NOT_FOUND"
  | "SERIALIZATION_ERROR"
  | "UNKNOWN_ERROR";

function assumptionLedgerKey(sessionId: string): string {
  return `${ASSUMPTION_LEDGER_PREFIX}${sessionId}`;
}

/**
 * Load assumption ledger entries for a session.
 */
export function loadAssumptionLedger(sessionId: string): AssumptionLedgerEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(assumptionLedgerKey(sessionId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AssumptionLedgerEntry[]) : [];
  } catch {
    return [];
  }
}

/**
 * Save assumption ledger entries for a session.
 */
export function saveAssumptionLedger(sessionId: string, entries: AssumptionLedgerEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(assumptionLedgerKey(sessionId), JSON.stringify(entries));
  } catch (error) {
    throw new StorageError("Failed to save assumption ledger", "QUOTA_EXCEEDED", error);
  }
}

/**
 * Merge new entries into the assumption ledger, preserving createdAt.
 */
export function upsertAssumptionLedger(sessionId: string, entries: AssumptionLedgerEntry[]): void {
  const existing = loadAssumptionLedger(sessionId);
  const byId = new Map(existing.map((entry) => [entry.id, entry]));

  for (const entry of entries) {
    const prior = byId.get(entry.id);
    byId.set(entry.id, {
      ...prior,
      ...entry,
      createdAt: prior?.createdAt ?? entry.createdAt,
    });
  }

  saveAssumptionLedger(sessionId, Array.from(byId.values()));
}

// ============================================================================
// Index Management
// ============================================================================

/**
 * Internal index format stored in localStorage.
 */
interface StorageIndex {
  version: number;
  summaries: SessionSummary[];
}

/**
 * Load the sessions index from localStorage.
 */
function loadIndex(): StorageIndex {
  if (typeof window === "undefined") {
    return { version: STORAGE_VERSION, summaries: [] };
  }

  try {
    const raw = window.localStorage.getItem(INDEX_KEY);
    if (!raw) {
      return { version: STORAGE_VERSION, summaries: [] };
    }

    const parsed = JSON.parse(raw) as StorageIndex;

    // Handle version migration if needed
    if (parsed.version !== STORAGE_VERSION) {
      console.warn(
        `Storage index version mismatch: expected ${STORAGE_VERSION}, got ${parsed.version}`,
      );
      // For now, just accept it. Future: add migration logic.
    }

    return parsed;
  } catch (error) {
    console.error("Failed to load session index, starting fresh:", error);
    return { version: STORAGE_VERSION, summaries: [] };
  }
}

/**
 * Save the sessions index to localStorage.
 */
function saveIndex(index: StorageIndex): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  } catch (error) {
    // If we can't save the index, we're in trouble
    console.error("Failed to save session index:", error);
    throw new StorageError("Failed to save session index", "QUOTA_EXCEEDED", error);
  }
}

/**
 * Create a summary from a full session.
 */
function createSummary(session: Session): SessionSummary {
  // Get hypothesis preview (first 100 chars)
  // Use optional chaining for hypothesisCards to handle malformed/recovered sessions
  const hypothesisPreview =
    session.hypothesisCards?.[session.primaryHypothesisId]?.statement || "(No hypothesis)";

  // Get confidence from primary hypothesis
  const confidence = session.hypothesisCards?.[session.primaryHypothesisId]?.confidence ?? 50;

  return {
    id: session.id,
    hypothesis:
      hypothesisPreview.length > 100 ? hypothesisPreview.slice(0, 97) + "..." : hypothesisPreview,
    phase: session.phase,
    confidence,
    researchQuestion: session.researchQuestion,
    theme: session.theme,
    updatedAt: session.updatedAt,
    createdAt: session.createdAt,
  };
}

// ============================================================================
// LocalStorage Implementation
// ============================================================================

/**
 * LocalStorage-based implementation of SessionStorage.
 */
export class LocalStorageSessionStorage implements SessionStorage {
  /**
   * Check if localStorage is available.
   */
  private isAvailable(): boolean {
    if (typeof window === "undefined") return false;

    try {
      const testKey = "__storage_test__";
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the storage key for a session.
   */
  private getSessionKey(sessionId: string): string {
    return `${SESSION_KEY_PREFIX}${sessionId}`;
  }

  async save(session: Session): Promise<void> {
    if (!this.isAvailable()) {
      throw new StorageError("LocalStorage not available", "UNKNOWN_ERROR");
    }

    // Update session timestamp
    const updatedSession: Session = {
      ...session,
      _version: CURRENT_SESSION_VERSION,
      updatedAt: new Date().toISOString(),
    };

    // Serialize the session
    let serialized: string;
    try {
      serialized = JSON.stringify(updatedSession);
    } catch (error) {
      throw new StorageError("Failed to serialize session", "SERIALIZATION_ERROR", error);
    }

    // Check size limit
    if (serialized.length > MAX_SESSION_SIZE) {
      console.warn(`Session ${session.id} exceeds recommended size (${serialized.length} bytes)`);
    }

    // Try to save the session
    try {
      window.localStorage.setItem(this.getSessionKey(session.id), serialized);
    } catch (error) {
      // Check if it's a quota error
      if (
        error instanceof DOMException &&
        (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
      ) {
        throw new StorageError(
          "Storage quota exceeded. Try deleting old sessions.",
          "QUOTA_EXCEEDED",
          error,
        );
      }
      throw new StorageError("Failed to save session", "UNKNOWN_ERROR", error);
    }

    // Update the index
    const index = loadIndex();
    const existingIdx = index.summaries.findIndex((s) => s.id === session.id);
    const summary = createSummary(updatedSession);

    if (existingIdx >= 0) {
      // Update existing
      index.summaries[existingIdx] = summary;
    } else {
      // Add new
      index.summaries.unshift(summary);

      // Enforce max sessions limit
      if (index.summaries.length > MAX_SESSIONS) {
        // Remove oldest sessions
        const toRemove = index.summaries.splice(MAX_SESSIONS);
        for (const old of toRemove) {
          try {
            window.localStorage.removeItem(this.getSessionKey(old.id));
            window.localStorage.removeItem(assumptionLedgerKey(old.id));
            removeSessionBackups(old.id);
          } catch {
            // Ignore cleanup errors
          }
        }
        removeResumeEntries(toRemove.map((old) => old.id));
        console.warn(`Removed ${toRemove.length} old sessions to stay under limit`);
      }
    }

    // Sort by updatedAt (most recent first)
    index.summaries.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    saveIndex(index);
  }

  async load(sessionId: string): Promise<Session | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const raw = window.localStorage.getItem(this.getSessionKey(sessionId));
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as unknown;
      const version = getSessionVersion(parsed);

      if (version > CURRENT_SESSION_VERSION) {
        throw new StorageError(
          `Session schema v${version} is newer than supported (v${CURRENT_SESSION_VERSION})`,
          "CORRUPTED_DATA",
        );
      }

      const needsMigrate = version < CURRENT_SESSION_VERSION;
      if (!needsMigrate && isSession(parsed)) {
        return parsed;
      }

      const backupKey = sessionBackupKey(sessionId, version);
      try {
        if (window.localStorage.getItem(backupKey) === null) {
          window.localStorage.setItem(backupKey, raw);
        }
      } catch (error) {
        throw new StorageError(
          "Failed to create session backup before migration",
          "QUOTA_EXCEEDED",
          error,
        );
      }

      const migrated = needsMigrate ? runSessionMigrations(parsed, version) : migrateV0ToV1(parsed);

      // Persist migrated payload without changing timestamps.
      try {
        window.localStorage.setItem(this.getSessionKey(sessionId), JSON.stringify(migrated));
      } catch (error) {
        throw new StorageError("Failed to save migrated session", "QUOTA_EXCEEDED", error);
      }

      // Keep the index consistent.
      const index = loadIndex();
      const existingIdx = index.summaries.findIndex((s) => s.id === sessionId);
      const summary = createSummary(migrated);
      if (existingIdx >= 0) {
        index.summaries[existingIdx] = summary;
      } else {
        index.summaries.unshift(summary);
      }
      index.summaries.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      saveIndex(index);

      return migrated;
    } catch (error) {
      if (error instanceof StorageError) throw error;

      console.error(`Failed to load session ${sessionId}:`, error);
      throw new StorageError("Failed to parse session data", "CORRUPTED_DATA", error);
    }
  }

  async list(): Promise<SessionSummary[]> {
    if (!this.isAvailable()) {
      return [];
    }

    const index = loadIndex();

    // Verify summaries against actual storage (cleanup orphans)
    const orphanedIds: string[] = [];
    const validSummaries = index.summaries.filter((summary) => {
      const exists = window.localStorage.getItem(this.getSessionKey(summary.id)) !== null;
      if (!exists) {
        console.warn(`Orphaned index entry for ${summary.id}, removing`);
        orphanedIds.push(summary.id);
      }
      return exists;
    });

    // Update index if we cleaned up orphans
    if (validSummaries.length !== index.summaries.length) {
      index.summaries = validSummaries;
      saveIndex(index);
      removeResumeEntries(orphanedIds);
    }

    return validSummaries;
  }

  async delete(sessionId: string): Promise<void> {
    if (!this.isAvailable()) return;

    // Remove from storage
    try {
      window.localStorage.removeItem(this.getSessionKey(sessionId));
      window.localStorage.removeItem(assumptionLedgerKey(sessionId));
      removeSessionBackups(sessionId);
    } catch (error) {
      console.error(`Failed to delete session ${sessionId}:`, error);
    }
    removeResumeEntries([sessionId]);

    // Remove from index
    const index = loadIndex();
    index.summaries = index.summaries.filter((s) => s.id !== sessionId);
    saveIndex(index);
  }

  async clear(): Promise<void> {
    if (!this.isAvailable()) return;

    const index = loadIndex();

    // Remove all session data
    for (const summary of index.summaries) {
      try {
        window.localStorage.removeItem(this.getSessionKey(summary.id));
        window.localStorage.removeItem(assumptionLedgerKey(summary.id));
        removeSessionBackups(summary.id);
      } catch {
        // Ignore individual failures
      }
    }

    // Clear the index
    index.summaries = [];
    saveIndex(index);

    try {
      window.localStorage.removeItem(RESUME_INDEX_KEY);
    } catch {
      // Best-effort only
    }
  }

  async stats(): Promise<StorageStats> {
    if (!this.isAvailable()) {
      return {
        sessionCount: 0,
        totalSize: 0,
        remainingQuota: 0,
      };
    }

    const index = loadIndex();
    let totalSize = 0;

    // Calculate total size of sessions
    for (const summary of index.summaries) {
      const raw = window.localStorage.getItem(this.getSessionKey(summary.id));
      if (raw) {
        totalSize += raw.length * 2; // UTF-16 = 2 bytes per char
      }
    }

    // Add index size
    const indexRaw = window.localStorage.getItem(INDEX_KEY);
    if (indexRaw) {
      totalSize += indexRaw.length * 2;
    }

    // Estimate remaining quota (5MB typical limit)
    const TYPICAL_QUOTA = 5 * 1024 * 1024;
    const remainingQuota = Math.max(0, TYPICAL_QUOTA - totalSize);

    // Find oldest and newest
    let oldestSession: string | undefined;
    let newestSession: string | undefined;

    if (index.summaries.length > 0) {
      const sorted = [...index.summaries].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      oldestSession = sorted[0].createdAt;
      newestSession = sorted[sorted.length - 1].createdAt;
    }

    return {
      sessionCount: index.summaries.length,
      totalSize,
      remainingQuota,
      oldestSession,
      newestSession,
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Default session storage instance.
 * Use this for all session persistence operations.
 */
export const sessionStorage = new LocalStorageSessionStorage();

// ============================================================================
// Recovery Utilities
// ============================================================================

/**
 * Roll back a migrated session to a prior stored backup version.
 *
 * Note: backups are written during `load()` when a migration/normalization occurs.
 */
export function rollbackSessionMigration(sessionId: string, toVersion: number): boolean {
  if (typeof window === "undefined") return false;

  const backup = window.localStorage.getItem(sessionBackupKey(sessionId, toVersion));
  if (!backup) return false;

  try {
    window.localStorage.setItem(`${SESSION_KEY_PREFIX}${sessionId}`, backup);
  } catch (error) {
    throw new StorageError("Failed to restore session backup", "QUOTA_EXCEEDED", error);
  }

  return true;
}

/**
 * Attempt to recover sessions from corrupted storage.
 * Scans all localStorage keys matching the session pattern and rebuilds the index.
 *
 * @returns Number of sessions recovered
 */
export async function recoverSessions(): Promise<number> {
  if (typeof window === "undefined") return 0;

  const recovered: SessionSummary[] = [];

  // Scan localStorage for session keys
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key?.startsWith(SESSION_KEY_PREFIX)) continue;

    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      const session = JSON.parse(raw) as Session;

      // Basic validation
      if (session.id && session.phase && session.createdAt) {
        recovered.push(createSummary(session));
      }
    } catch {
      console.warn(`Skipping corrupted session at ${key}`);
    }
  }

  // Rebuild index
  if (recovered.length > 0) {
    const index: StorageIndex = {
      version: STORAGE_VERSION,
      summaries: recovered.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    };
    saveIndex(index);
  }

  return recovered.length;
}

/**
 * Estimate available storage space.
 * @returns Approximate bytes remaining
 */
export function estimateRemainingStorage(): number {
  if (typeof window === "undefined") return 0;

  // Calculate current usage
  let used = 0;
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key) {
      const value = window.localStorage.getItem(key);
      if (value) {
        used += (key.length + value.length) * 2;
      }
    }
  }

  // Typical quota is 5MB
  const TYPICAL_QUOTA = 5 * 1024 * 1024;
  return Math.max(0, TYPICAL_QUOTA - used);
}

/**
 * Clean up old sessions to free space.
 * Removes sessions older than the specified number of days.
 *
 * @param daysOld Sessions older than this will be removed
 * @returns Number of sessions removed
 */
export async function cleanupOldSessions(daysOld: number = 30): Promise<number> {
  const storage = sessionStorage;
  const summaries = await storage.list();
  const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;

  let removed = 0;
  for (const summary of summaries) {
    if (new Date(summary.updatedAt).getTime() < cutoff) {
      await storage.delete(summary.id);
      removed++;
    }
  }

  return removed;
}

// ============================================================================
// Event Listeners for Cross-Tab Sync
// ============================================================================

/**
 * Callback type for storage change events.
 */
export type StorageChangeCallback = (
  event: "save" | "delete" | "clear",
  sessionId?: string,
) => void;

const changeListeners = new Set<StorageChangeCallback>();

let storageListenerAttached = false;
let storageListener: ((event: StorageEvent) => void) | null = null;

function handleStorageEvent(event: StorageEvent) {
  if (!event.key) {
    // Storage was cleared
    changeListeners.forEach((cb) => cb("clear"));
    return;
  }

  if (event.key === INDEX_KEY) {
    // Index changed, likely a save or delete
    if (event.newValue && event.oldValue) {
      try {
        const oldIndex = JSON.parse(event.oldValue) as StorageIndex;
        const newIndex = JSON.parse(event.newValue) as StorageIndex;

        // Find what changed
        const oldIds = new Set(oldIndex.summaries.map((s) => s.id));
        const newIds = new Set(newIndex.summaries.map((s) => s.id));

        // Deleted sessions
        oldIndex.summaries.forEach((s) => {
          if (!newIds.has(s.id)) {
            changeListeners.forEach((cb) => cb("delete", s.id));
          }
        });

        // New or updated sessions
        newIndex.summaries.forEach((s) => {
          if (!oldIds.has(s.id)) {
            changeListeners.forEach((cb) => cb("save", s.id));
          } else {
            // Check if updated
            const oldSummary = oldIndex.summaries.find((os) => os.id === s.id);
            if (oldSummary && oldSummary.updatedAt !== s.updatedAt) {
              changeListeners.forEach((cb) => cb("save", s.id));
            }
          }
        });
      } catch {
        // Ignore parse errors
      }
    }
  }
}

function attachStorageListenerIfNeeded() {
  if (storageListenerAttached) return;
  if (typeof window === "undefined") return;
  storageListener = handleStorageEvent;
  window.addEventListener("storage", storageListener);
  storageListenerAttached = true;
}

function detachStorageListenerIfNeeded() {
  if (!storageListenerAttached) return;
  if (typeof window === "undefined") return;
  if (storageListener) {
    window.removeEventListener("storage", storageListener);
  }
  storageListener = null;
  storageListenerAttached = false;
}

/**
 * Subscribe to storage changes (for cross-tab sync).
 */
export function onStorageChange(callback: StorageChangeCallback): () => void {
  changeListeners.add(callback);
  attachStorageListenerIfNeeded();

  return () => {
    changeListeners.delete(callback);
    if (changeListeners.size === 0) {
      detachStorageListenerIfNeeded();
    }
  };
}
