/**
 * Test Queue (Planning → Execution)
 *
 * LocalStorage-backed queue of discriminative tests that have been identified
 * (e.g. via Exclusion Test ⊘) but not yet executed or fully researched.
 *
 * Core invariant: predictions must be locked before execution/result recording
 * to prevent post-hoc rationalization.
 *
 * @see brenner_bot-njjo.5 (bead)
 */

import type { ExclusionTest } from "./operators/exclusion-test";

// ============================================================================//
// Types
// ============================================================================//

export type TestQueueStatus =
  | "queued"
  | "researching"
  | "designing"
  | "in_progress"
  | "awaiting_results"
  | "completed"
  | "infeasible"
  | "deferred";

export type TestQueuePriority = "urgent" | "high" | "medium" | "low" | "someday";

export type TestQueueSource = "exclusion_test" | "agent_suggestion" | "manual";

export interface TestQueueItem {
  /** Stable ID for this queue item */
  id: string;

  /** Session / thread the queue belongs to */
  sessionId: string;

  /** Hypothesis this test is meant to discriminate */
  hypothesisId: string;

  /** Assumptions this test is meant to probe */
  assumptionIds: string[];

  /** The test definition (from Exclusion Test ⊘) */
  test: ExclusionTest;

  /** Discriminative power (1–5) */
  discriminativePower: 1 | 2 | 3 | 4 | 5;

  /** Planning status */
  status: TestQueueStatus;

  /** Triage priority */
  priority: TestQueuePriority;

  /** Pre-registered prediction if hypothesis is true */
  predictionIfTrue: string;

  /** Pre-registered prediction if hypothesis is false */
  predictionIfFalse: string;

  /** Once set, predictions cannot be changed */
  predictionsLockedAt?: string;

  /** Execution tracking */
  assignedTo?: string;
  dueDate?: string;
  estimatedEffort?: string;

  /** Metadata */
  addedAt: string;
  source: TestQueueSource;
}

export interface TestQueueStats {
  total: number;
  locked: number;
  byPriority: Record<TestQueuePriority, number>;
  byStatus: Record<TestQueueStatus, number>;
}

const VALID_STATUSES: TestQueueStatus[] = [
  "queued",
  "researching",
  "designing",
  "in_progress",
  "awaiting_results",
  "completed",
  "infeasible",
  "deferred",
];

const VALID_PRIORITIES: TestQueuePriority[] = ["urgent", "high", "medium", "low", "someday"];

const VALID_SOURCES: TestQueueSource[] = ["exclusion_test", "agent_suggestion", "manual"];

const VALID_STATUS_SET = new Set<TestQueueStatus>(VALID_STATUSES);
const VALID_PRIORITY_SET = new Set<TestQueuePriority>(VALID_PRIORITIES);
const VALID_SOURCE_SET = new Set<TestQueueSource>(VALID_SOURCES);

function isValidStatus(value: string): value is TestQueueStatus {
  return VALID_STATUS_SET.has(value as TestQueueStatus);
}

function isValidPriority(value: string): value is TestQueuePriority {
  return VALID_PRIORITY_SET.has(value as TestQueuePriority);
}

function isValidSource(value: string): value is TestQueueSource {
  return VALID_SOURCE_SET.has(value as TestQueueSource);
}

// ============================================================================//
// Storage
// ============================================================================//

const STORAGE_KEY_PREFIX = "brenner-test-queue-";

let warnedStorageError = false;

function warnStorageError(action: string, error: unknown): void {
  if (warnedStorageError) return;
  warnedStorageError = true;
  console.warn(`Test Queue: failed to ${action} localStorage`, error);
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage ?? null;
  } catch (e) {
    warnStorageError("access", e);
    return null;
  }
}

function storageKey(sessionId: string): string {
  return `${STORAGE_KEY_PREFIX}${sessionId}`;
}

function safeParseArray(raw: string | null): unknown[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function coerceItem(raw: unknown): TestQueueItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string") return null;
  if (typeof r.sessionId !== "string") return null;
  if (typeof r.hypothesisId !== "string") return null;

  const assumptionIds = Array.isArray(r.assumptionIds)
    ? r.assumptionIds.filter(
        (entry): entry is string => typeof entry === "string" && entry.length > 0,
      )
    : [];

  if (!r.test || typeof r.test !== "object") return null;
  const test = r.test as Record<string, unknown>;
  if (typeof test.id !== "string") return null;
  if (typeof test.name !== "string") return null;
  if (typeof test.description !== "string") return null;
  if (typeof test.category !== "string") return null;
  if (typeof test.falsificationCondition !== "string") return null;
  if (typeof test.supportCondition !== "string") return null;
  if (typeof test.rationale !== "string") return null;
  if (typeof test.feasibility !== "string") return null;

  if (typeof r.discriminativePower !== "number") return null;
  if (!Number.isFinite(r.discriminativePower)) return null;
  if (r.discriminativePower < 1 || r.discriminativePower > 5) return null;

  if (typeof r.status !== "string" || !isValidStatus(r.status)) return null;
  if (typeof r.priority !== "string" || !isValidPriority(r.priority)) return null;
  if (typeof r.predictionIfTrue !== "string") return null;
  if (typeof r.predictionIfFalse !== "string") return null;
  if (typeof r.addedAt !== "string") return null;
  if (typeof r.source !== "string" || !isValidSource(r.source)) return null;

  const item: TestQueueItem = {
    id: r.id,
    sessionId: r.sessionId,
    hypothesisId: r.hypothesisId,
    assumptionIds,
    test: r.test as ExclusionTest,
    discriminativePower: r.discriminativePower as TestQueueItem["discriminativePower"],
    status: r.status,
    priority: r.priority,
    predictionIfTrue: r.predictionIfTrue,
    predictionIfFalse: r.predictionIfFalse,
    addedAt: r.addedAt,
    source: r.source,
  };

  if (typeof r.predictionsLockedAt === "string" && r.predictionsLockedAt.length > 0) {
    item.predictionsLockedAt = r.predictionsLockedAt;
  }
  if (typeof r.assignedTo === "string" && r.assignedTo.length > 0) {
    item.assignedTo = r.assignedTo;
  }
  if (typeof r.dueDate === "string" && r.dueDate.length > 0) {
    item.dueDate = r.dueDate;
  }
  if (typeof r.estimatedEffort === "string" && r.estimatedEffort.length > 0) {
    item.estimatedEffort = r.estimatedEffort;
  }

  return item;
}

export function loadTestQueue(sessionId: string): TestQueueItem[] {
  const storage = getStorage();
  if (storage === null) {
    return [];
  }

  let raw: string | null = null;
  try {
    raw = storage.getItem(storageKey(sessionId));
  } catch (e) {
    warnStorageError("read", e);
    return [];
  }
  const arr = safeParseArray(raw);
  const items: TestQueueItem[] = [];
  for (const entry of arr) {
    const item = coerceItem(entry);
    if (item && item.sessionId === sessionId) items.push(item);
  }
  return items;
}

export function saveTestQueue(sessionId: string, items: TestQueueItem[]): void {
  const storage = getStorage();
  if (storage === null) {
    return;
  }

  try {
    storage.setItem(storageKey(sessionId), JSON.stringify(items));
  } catch (e) {
    warnStorageError("write", e);
  }
}

export function clearTestQueue(sessionId: string): void {
  const storage = getStorage();
  if (storage === null) {
    return;
  }

  try {
    storage.removeItem(storageKey(sessionId));
  } catch (e) {
    warnStorageError("clear", e);
  }
}

// ============================================================================//
// Helpers
// ============================================================================//

export function priorityFromPower(power: 1 | 2 | 3 | 4 | 5): TestQueuePriority {
  if (power >= 5) return "urgent";
  if (power === 4) return "high";
  if (power === 3) return "medium";
  if (power === 2) return "low";
  return "someday";
}

export function isPredictionsLocked(item: TestQueueItem): boolean {
  return typeof item.predictionsLockedAt === "string" && item.predictionsLockedAt.length > 0;
}

export function getTestQueueStats(items: TestQueueItem[]): TestQueueStats {
  const byPriority: TestQueueStats["byPriority"] = {
    urgent: 0,
    high: 0,
    medium: 0,
    low: 0,
    someday: 0,
  };
  const byStatus: TestQueueStats["byStatus"] = {
    queued: 0,
    researching: 0,
    designing: 0,
    in_progress: 0,
    awaiting_results: 0,
    completed: 0,
    infeasible: 0,
    deferred: 0,
  };

  let locked = 0;
  for (const item of items) {
    if (byPriority[item.priority] !== undefined) byPriority[item.priority] += 1;
    if (byStatus[item.status] !== undefined) byStatus[item.status] += 1;
    if (isPredictionsLocked(item)) locked += 1;
  }

  return {
    total: items.length,
    locked,
    byPriority,
    byStatus,
  };
}

export function generateQueueItemId(sessionId: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `TQ-${sessionId}-${crypto.randomUUID()}`;
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const rnd = new Uint32Array(1);
    crypto.getRandomValues(rnd);
    return `TQ-${sessionId}-${Date.now().toString(36)}-${rnd[0].toString(36).slice(0, 6)}`;
  }

  // Last resort fallback
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `TQ-${sessionId}-${ts}-${rand}`;
}

function stableIdForExclusionTest(sessionId: string, test: ExclusionTest): string {
  return `TQ-${sessionId}-${test.id}`;
}

// ============================================================================//
// Mutations (load → update → save)
// ============================================================================//

export function addExclusionTestsToQueue(args: {
  sessionId: string;
  hypothesisId: string;
  tests: ExclusionTest[];
  source: TestQueueSource;
}): TestQueueItem[] {
  const { sessionId, hypothesisId, tests, source } = args;

  const existing = loadTestQueue(sessionId);
  const existingIds = new Set(existing.map((i) => i.id));
  const now = new Date().toISOString();

  const toAdd: TestQueueItem[] = [];

  for (const test of tests) {
    const id = stableIdForExclusionTest(sessionId, test);
    if (existingIds.has(id)) continue;

    toAdd.push({
      id,
      sessionId,
      hypothesisId,
      assumptionIds: [],
      test,
      discriminativePower: test.discriminativePower,
      status: "queued",
      priority: priorityFromPower(test.discriminativePower),
      predictionIfTrue: test.supportCondition,
      predictionIfFalse: test.falsificationCondition,
      addedAt: now,
      source,
    });
  }

  const next = [...existing, ...toAdd];
  saveTestQueue(sessionId, next);
  return next;
}

export function addManualQueueItem(args: {
  sessionId: string;
  hypothesisId: string;
  assumptionIds?: string[];
  test: ExclusionTest;
  source: TestQueueSource;
}): TestQueueItem[] {
  const { sessionId, hypothesisId, assumptionIds, test, source } = args;
  const existing = loadTestQueue(sessionId);
  const existingIds = new Set(existing.map((item) => item.id));
  const now = new Date().toISOString();
  const id = stableIdForExclusionTest(sessionId, test);

  if (existingIds.has(id)) return existing;

  const item: TestQueueItem = {
    id,
    sessionId,
    hypothesisId,
    assumptionIds: Array.isArray(assumptionIds) ? assumptionIds : [],
    test,
    discriminativePower: test.discriminativePower,
    status: "queued",
    priority: priorityFromPower(test.discriminativePower),
    predictionIfTrue: test.supportCondition,
    predictionIfFalse: test.falsificationCondition,
    addedAt: now,
    source,
  };

  const next = [...existing, item];
  saveTestQueue(sessionId, next);
  return next;
}

export function updateQueueItem(
  sessionId: string,
  itemId: string,
  patch: Partial<Omit<TestQueueItem, "id" | "sessionId" | "addedAt" | "source">>,
): TestQueueItem[] {
  const items = loadTestQueue(sessionId);

  const next = items.map((item) => {
    if (item.id !== itemId) return item;

    const locked = isPredictionsLocked(item);
    const safePatch: typeof patch = { ...patch };

    if (locked) {
      delete (safePatch as Record<string, unknown>).predictionIfTrue;
      delete (safePatch as Record<string, unknown>).predictionIfFalse;
    }

    return { ...item, ...safePatch };
  });

  saveTestQueue(sessionId, next);
  return next;
}

export function lockQueueItemPredictions(sessionId: string, itemId: string): TestQueueItem[] {
  const items = loadTestQueue(sessionId);
  const now = new Date().toISOString();

  const next = items.map((item) => {
    if (item.id !== itemId) return item;
    if (isPredictionsLocked(item)) return item;

    if (item.predictionIfTrue.trim().length === 0 || item.predictionIfFalse.trim().length === 0) {
      return item;
    }

    return { ...item, predictionsLockedAt: now };
  });

  saveTestQueue(sessionId, next);
  return next;
}
