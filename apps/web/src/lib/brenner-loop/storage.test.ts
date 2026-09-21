/**
 * Storage Layer Tests
 *
 * Tests for the LocalStorage session persistence implementation.
 *
 * @see brenner_bot-1v26.2 (bead)
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  buildSessionPath,
  cleanupOldSessions,
  estimateRemainingStorage,
  getSessionResumeEntry,
  LocalStorageSessionStorage,
  listSessionResumeEntries,
  loadAssumptionLedger,
  onStorageChange,
  recordSessionResumeEntry,
  recoverSessions,
  removeSessionResumeEntry,
  rollbackSessionMigration,
  StorageError,
  saveAssumptionLedger,
  upsertAssumptionLedger,
} from "./storage";
import type { Session, SessionPhase } from "./types";

// ============================================================================
// Mock localStorage
// ============================================================================

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

// Replace global localStorage with mock
Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
});

Object.defineProperty(global, "window", {
  value: {
    localStorage: localStorageMock,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
});

// ============================================================================
// Test Utilities
// ============================================================================

function createTestSession(overrides: Partial<Session> = {}): Session {
  const now = new Date().toISOString();
  const id = overrides.id ?? `SESSION-TEST-${Date.now()}`;
  const hypothesisId = `HC-${id}-001-v1`;

  return {
    id,
    _version: 1,
    createdAt: now,
    updatedAt: now,
    phase: "intake" as SessionPhase,
    primaryHypothesisId: hypothesisId,
    alternativeHypothesisIds: [],
    archivedHypothesisIds: [],
    hypothesisCards: {
      [hypothesisId]: {
        id: hypothesisId,
        version: 1,
        statement: "Test hypothesis for storage testing",
        mechanism: "Testing mechanism for storage tests",
        domain: ["testing"],
        predictionsIfTrue: ["The tests should pass"],
        predictionsIfFalse: [],
        impossibleIfTrue: ["Tests fail catastrophically"],
        confounds: [],
        assumptions: [],
        confidence: 50,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      },
    },
    hypothesisEvolution: [],
    operatorApplications: {
      levelSplit: [],
      exclusionTest: [],
      objectTranspose: [],
      scaleCheck: [],
    },
    predictionIds: [],
    testIds: [],
    assumptionIds: [],
    pendingAgentRequests: [],
    agentResponses: [],
    evidenceLedger: [],
    artifacts: [],
    commits: [],
    headCommitId: "",
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("LocalStorageSessionStorage", () => {
  let storage: LocalStorageSessionStorage;

  beforeEach(() => {
    localStorageMock.clear();
    storage = new LocalStorageSessionStorage();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe("save", () => {
    test("should save a session successfully", async () => {
      const session = createTestSession();

      await storage.save(session);

      // Verify session is saved
      const raw = localStorageMock.getItem(`brenner-session-${session.id}`);
      expect(raw).toBeTruthy();

      if (!raw) {
        throw new Error("Expected session to be saved in localStorage");
      }
      const saved = JSON.parse(raw);
      expect(saved.id).toBe(session.id);
    });

    test("should update the index when saving", async () => {
      const session = createTestSession();

      await storage.save(session);

      const indexRaw = localStorageMock.getItem("brenner-sessions-index");
      if (!indexRaw) {
        throw new Error("Expected sessions index to be saved in localStorage");
      }
      const index = JSON.parse(indexRaw);
      expect(index.summaries).toHaveLength(1);
      expect(index.summaries[0].id).toBe(session.id);
    });

    test("should update existing session", async () => {
      const session = createTestSession();
      await storage.save(session);

      // Modify and save again
      session.phase = "sharpening";
      await storage.save(session);

      const summaries = await storage.list();
      expect(summaries).toHaveLength(1);
      expect(summaries[0].phase).toBe("sharpening");
    });

    test("should update updatedAt timestamp on save", async () => {
      const session = createTestSession({
        updatedAt: "2020-01-01T00:00:00.000Z",
      });

      await storage.save(session);

      const loaded = await storage.load(session.id);
      if (!loaded) {
        throw new Error("Expected session to load after save");
      }
      expect(loaded.updatedAt).not.toBe("2020-01-01T00:00:00.000Z");
    });
  });

  describe("load", () => {
    test("should load a saved session", async () => {
      const session = createTestSession();
      await storage.save(session);

      const loaded = await storage.load(session.id);

      expect(loaded).not.toBeNull();
      if (!loaded) {
        throw new Error("Expected session to load after save");
      }
      expect(loaded.id).toBe(session.id);
      expect(loaded.phase).toBe(session.phase);
    });

    test("should return null for non-existent session", async () => {
      const loaded = await storage.load("non-existent-id");
      expect(loaded).toBeNull();
    });

    test("should throw StorageError for corrupted data", async () => {
      localStorageMock.setItem("brenner-session-corrupted", "not valid json{");

      await expect(storage.load("corrupted")).rejects.toThrow(StorageError);
    });

    test("should migrate legacy sessions without _version (v0) and create a backup", async () => {
      const session = createTestSession();
      const legacy: Record<string, unknown> = { ...session };
      delete (legacy as { _version?: unknown })._version;

      localStorageMock.setItem(`brenner-session-${session.id}`, JSON.stringify(legacy));

      const loaded = await storage.load(session.id);
      expect(loaded).not.toBeNull();
      if (!loaded) {
        throw new Error("Expected session to load after migration");
      }
      expect(loaded._version).toBe(1);

      const backup = localStorageMock.getItem(`brenner-session_backup:${session.id}:v0`);
      expect(backup).toBeTruthy();

      const persisted = localStorageMock.getItem(`brenner-session-${session.id}`);
      expect(persisted).toBeTruthy();
      if (!persisted) {
        throw new Error("Expected migrated session to be persisted");
      }
      const parsed = JSON.parse(persisted) as Record<string, unknown>;
      expect(parsed._version).toBe(1);
    });

    test("should allow rolling back a migrated legacy session", async () => {
      const session = createTestSession();
      const legacy: Record<string, unknown> = { ...session };
      delete (legacy as { _version?: unknown })._version;

      localStorageMock.setItem(`brenner-session-${session.id}`, JSON.stringify(legacy));

      const loaded = await storage.load(session.id);
      expect(loaded?._version).toBe(1);

      const rolledBack = rollbackSessionMigration(session.id, 0);
      expect(rolledBack).toBe(true);

      const restoredRaw = localStorageMock.getItem(`brenner-session-${session.id}`);
      expect(restoredRaw).toBeTruthy();
      if (!restoredRaw) {
        throw new Error("Expected restored session payload");
      }
      const restored = JSON.parse(restoredRaw) as Record<string, unknown>;
      expect(restored._version).toBeUndefined();
    });

    test("rollbackSessionMigration should return false when no backup exists", () => {
      const rolledBack = rollbackSessionMigration("SESSION-NO-BACKUP", 0);
      expect(rolledBack).toBe(false);
    });
  });

  describe("list", () => {
    test("should return empty array when no sessions", async () => {
      const summaries = await storage.list();
      expect(summaries).toEqual([]);
    });

    test("should return summaries for saved sessions", async () => {
      const session1 = createTestSession({ id: "SESSION-1" });
      const session2 = createTestSession({ id: "SESSION-2" });

      await storage.save(session1);
      await storage.save(session2);

      const summaries = await storage.list();
      expect(summaries).toHaveLength(2);
    });

    test("should order by updatedAt (most recent first)", async () => {
      const old = createTestSession({ id: "SESSION-OLD" });
      await storage.save(old);

      // Wait a tiny bit to ensure different timestamps
      await new Promise((r) => setTimeout(r, 10));

      const newer = createTestSession({ id: "SESSION-NEW" });
      await storage.save(newer);

      const summaries = await storage.list();
      expect(summaries[0].id).toBe("SESSION-NEW");
      expect(summaries[1].id).toBe("SESSION-OLD");
    });

    test("should clean up orphaned index entries", async () => {
      const session = createTestSession();
      await storage.save(session);

      // Manually remove the session data but keep index
      localStorageMock.removeItem(`brenner-session-${session.id}`);

      const summaries = await storage.list();
      expect(summaries).toHaveLength(0);
    });
  });

  describe("delete", () => {
    test("should delete a session", async () => {
      const session = createTestSession();
      await storage.save(session);

      await storage.delete(session.id);

      const loaded = await storage.load(session.id);
      expect(loaded).toBeNull();
    });

    test("should remove from index", async () => {
      const session = createTestSession();
      await storage.save(session);

      await storage.delete(session.id);

      const summaries = await storage.list();
      expect(summaries).toHaveLength(0);
    });

    test("should not throw for non-existent session", async () => {
      // Should complete without throwing
      await storage.delete("non-existent");
      // If we get here, the test passed
      expect(true).toBe(true);
    });

    test("should remove assumption ledger entries for the session", async () => {
      const session = createTestSession();
      await storage.save(session);

      saveAssumptionLedger(session.id, [
        {
          id: "A-TEST-001",
          statement: "Assumption ledger entry",
          criticality: "important",
          dependsOn: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      await storage.delete(session.id);

      expect(loadAssumptionLedger(session.id)).toEqual([]);
    });
  });

  describe("resume metadata", () => {
    test("should record and retrieve last visited location", () => {
      recordSessionResumeEntry("SESSION-TEST-001", "hypothesis");
      expect(getSessionResumeEntry("SESSION-TEST-001")).toEqual({
        location: "hypothesis",
        visitedAt: expect.any(String),
      });
    });

    test("should not overwrite when ifMissing=true", () => {
      recordSessionResumeEntry("SESSION-TEST-002", "operators");
      const first = getSessionResumeEntry("SESSION-TEST-002");
      expect(first?.location).toBe("operators");

      recordSessionResumeEntry("SESSION-TEST-002", "test-queue", { ifMissing: true });
      expect(getSessionResumeEntry("SESSION-TEST-002")).toEqual(first);
    });

    test("should be removed when deleting a session", async () => {
      const session = createTestSession({ id: "SESSION-RESUME-DELETE" });
      await storage.save(session);

      recordSessionResumeEntry(session.id, "evidence");
      expect(getSessionResumeEntry(session.id)?.location).toBe("evidence");

      await storage.delete(session.id);
      expect(getSessionResumeEntry(session.id)).toBeNull();
    });

    test("should be removed when clearing all sessions", async () => {
      const session1 = createTestSession({ id: "SESSION-RESUME-CLEAR-1" });
      const session2 = createTestSession({ id: "SESSION-RESUME-CLEAR-2" });
      await storage.save(session1);
      await storage.save(session2);

      recordSessionResumeEntry(session1.id, "hypothesis");
      recordSessionResumeEntry(session2.id, "operators");

      await storage.clear();

      expect(getSessionResumeEntry(session1.id)).toBeNull();
      expect(getSessionResumeEntry(session2.id)).toBeNull();
    });

    test("should ignore non-local session IDs and support listing/removal", () => {
      recordSessionResumeEntry("REMOTE-TEST-001", "overview");
      expect(getSessionResumeEntry("REMOTE-TEST-001")).toBeNull();

      recordSessionResumeEntry("SESSION-TEST-003", "overview");
      expect(Object.keys(listSessionResumeEntries())).toContain("SESSION-TEST-003");

      removeSessionResumeEntry("SESSION-TEST-003");
      expect(getSessionResumeEntry("SESSION-TEST-003")).toBeNull();
    });

    test("should tolerate corrupted resume index payloads", () => {
      localStorageMock.setItem("brenner-sessions-resume-index", "not-json");
      expect(listSessionResumeEntries()).toEqual({});

      const protoEntry = { location: "overview", visitedAt: new Date().toISOString() };
      const okEntry = { location: "overview", visitedAt: new Date().toISOString() };
      const badEntry = { location: "overview", visitedAt: new Date().toISOString() };
      const payload = JSON.stringify({
        ["__proto__"]: protoEntry,
        "SESSION-OK": okEntry,
        "BAD-SESSION": badEntry,
      });
      localStorageMock.setItem("brenner-sessions-resume-index", payload);
      const entries = listSessionResumeEntries();
      expect(Object.keys(entries)).toEqual(["SESSION-OK"]);
    });

    test("buildSessionPath maps locations to routes", () => {
      expect(buildSessionPath("SESSION-1", "overview")).toBe("/sessions/SESSION-1");
      expect(buildSessionPath("SESSION-1", "hypothesis")).toBe("/sessions/SESSION-1/hypothesis");
      expect(buildSessionPath("SESSION-1", "test-queue")).toBe("/sessions/SESSION-1/test-queue");
      expect(buildSessionPath("SESSION-1", "brief")).toBe("/sessions/SESSION-1/brief");
    });
  });

  describe("clear", () => {
    test("should remove all sessions", async () => {
      const session1 = createTestSession({ id: "SESSION-1" });
      const session2 = createTestSession({ id: "SESSION-2" });
      await storage.save(session1);
      await storage.save(session2);

      await storage.clear();

      const summaries = await storage.list();
      expect(summaries).toHaveLength(0);
    });

    test("should remove all assumption ledger entries", async () => {
      const session1 = createTestSession({ id: "SESSION-1" });
      const session2 = createTestSession({ id: "SESSION-2" });
      await storage.save(session1);
      await storage.save(session2);

      saveAssumptionLedger(session1.id, [
        {
          id: "A-SESSION-1-001",
          statement: "Session 1 assumption",
          criticality: "minor",
          dependsOn: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      saveAssumptionLedger(session2.id, [
        {
          id: "A-SESSION-2-001",
          statement: "Session 2 assumption",
          criticality: "foundational",
          dependsOn: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      await storage.clear();

      expect(loadAssumptionLedger(session1.id)).toEqual([]);
      expect(loadAssumptionLedger(session2.id)).toEqual([]);
    });
  });

  describe("stats", () => {
    test("should return correct session count", async () => {
      const session1 = createTestSession({ id: "SESSION-1" });
      const session2 = createTestSession({ id: "SESSION-2" });
      await storage.save(session1);
      await storage.save(session2);

      const stats = await storage.stats();
      expect(stats.sessionCount).toBe(2);
    });

    test("should calculate total size", async () => {
      const session = createTestSession();
      await storage.save(session);

      const stats = await storage.stats();
      expect(stats.totalSize).toBeGreaterThan(0);
    });
  });
});

describe("Recovery utilities", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe("recoverSessions", () => {
    test("should recover sessions from storage", async () => {
      // Manually add session data without index
      const session = createTestSession();
      localStorageMock.setItem(`brenner-session-${session.id}`, JSON.stringify(session));

      const count = await recoverSessions();
      expect(count).toBe(1);

      // Verify index was rebuilt
      const indexRaw = localStorageMock.getItem("brenner-sessions-index");
      if (!indexRaw) {
        throw new Error("Expected sessions index to be rebuilt");
      }
      const index = JSON.parse(indexRaw);
      expect(index.summaries).toHaveLength(1);
    });
  });

  describe("estimateRemainingStorage", () => {
    test("should return positive value for empty storage", () => {
      const remaining = estimateRemainingStorage();
      expect(remaining).toBeGreaterThan(0);
    });
  });

  describe("cleanupOldSessions", () => {
    test("should remove sessions older than specified days", async () => {
      // Create an old session
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);
      const oldSession = createTestSession({
        id: "OLD-SESSION",
        updatedAt: oldDate.toISOString(),
      });

      // Save with manual timestamp preservation
      const raw = JSON.stringify({
        ...oldSession,
        updatedAt: oldDate.toISOString(),
      });
      localStorageMock.setItem(`brenner-session-${oldSession.id}`, raw);

      // Save index manually too
      localStorageMock.setItem(
        "brenner-sessions-index",
        JSON.stringify({
          version: 1,
          summaries: [
            {
              id: oldSession.id,
              hypothesis: "Test",
              phase: "intake",
              confidence: 50,
              updatedAt: oldDate.toISOString(),
              createdAt: oldDate.toISOString(),
            },
          ],
        }),
      );

      const removed = await cleanupOldSessions(30);
      expect(removed).toBe(1);
    });
  });
});

describe("Assumption ledger upserts", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  test("upsertAssumptionLedger preserves createdAt and merges by id", () => {
    const sessionId = "SESSION-ASSUMPTIONS";
    const createdAt = "2026-01-01T00:00:00Z";

    saveAssumptionLedger(sessionId, [
      {
        id: "A-1",
        statement: "Initial",
        criticality: "important",
        dependsOn: [],
        createdAt,
        updatedAt: createdAt,
      },
    ]);

    upsertAssumptionLedger(sessionId, [
      {
        id: "A-1",
        statement: "Updated",
        criticality: "important",
        dependsOn: [],
        createdAt: "2099-01-01T00:00:00Z",
        updatedAt: "2099-01-01T00:00:00Z",
      },
      {
        id: "A-2",
        statement: "New",
        criticality: "minor",
        dependsOn: ["A-1"],
        createdAt: "2026-01-02T00:00:00Z",
        updatedAt: "2026-01-02T00:00:00Z",
      },
    ]);

    const entries = loadAssumptionLedger(sessionId);
    expect(entries).toHaveLength(2);
    const a1 = entries.find((e) => e.id === "A-1")!;
    expect(a1.statement).toBe("Updated");
    expect(a1.createdAt).toBe(createdAt);
  });
});

describe("storage change events", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  test("onStorageChange attaches/detaches listeners and routes events", () => {
    const cb = vi.fn();
    const unsubscribe = onStorageChange(cb);

    expect(window.addEventListener).toHaveBeenCalledWith("storage", expect.any(Function));
    const handler = (
      window.addEventListener as unknown as { mock: { calls: unknown[][] } }
    ).mock.calls.find((call) => call[0] === "storage")?.[1] as
      | ((event: StorageEvent) => void)
      | undefined;

    if (!handler) {
      throw new Error("Expected storage handler to be registered");
    }

    handler({ key: null } as StorageEvent);
    expect(cb).toHaveBeenCalledWith("clear");

    const oldIndex = JSON.stringify({
      version: 1,
      summaries: [
        { id: "A", updatedAt: "t1" },
        { id: "B", updatedAt: "t1" },
      ],
    });
    const newIndex = JSON.stringify({
      version: 1,
      summaries: [
        { id: "A", updatedAt: "t2" },
        { id: "C", updatedAt: "t1" },
      ],
    });

    handler({
      key: "brenner-sessions-index",
      oldValue: oldIndex,
      newValue: newIndex,
    } as StorageEvent);
    expect(cb).toHaveBeenCalledWith("delete", "B");
    expect(cb).toHaveBeenCalledWith("save", "A");
    expect(cb).toHaveBeenCalledWith("save", "C");

    unsubscribe();
    expect(window.removeEventListener).toHaveBeenCalledWith("storage", handler);
  });
});

describe("SessionSummary", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  test("should include hypothesis preview", async () => {
    const storage = new LocalStorageSessionStorage();
    const session = createTestSession();

    await storage.save(session);
    const summaries = await storage.list();

    expect(summaries[0].hypothesis).toContain("Test hypothesis");
  });

  test("should truncate long hypothesis statements", async () => {
    const storage = new LocalStorageSessionStorage();
    const longStatement = "A".repeat(200);
    const session = createTestSession();
    session.hypothesisCards[session.primaryHypothesisId].statement = longStatement;

    await storage.save(session);
    const summaries = await storage.list();

    expect(summaries[0].hypothesis.length).toBeLessThanOrEqual(100);
    expect(summaries[0].hypothesis.endsWith("...")).toBe(true);
  });
});
