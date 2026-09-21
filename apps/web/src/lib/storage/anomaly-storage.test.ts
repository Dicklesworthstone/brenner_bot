import { randomUUID } from "node:crypto";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Anomaly, createAnomaly } from "../schemas/anomaly";
import { AnomalyStorage, type SessionAnomalyFile } from "./anomaly-storage";

// ============================================================================
// Test Helpers
// ============================================================================

async function createTempDir(): Promise<string> {
  const dir = join(tmpdir(), `anomaly-storage-test-${randomUUID()}`);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function createTestAnomaly(sessionId: string, seq: number): Anomaly {
  return createAnomaly({
    id: `X-${sessionId}-${seq.toString().padStart(3, "0")}`,
    observation: `Test observation for anomaly ${seq} in session ${sessionId}`,
    source: {
      type: "experiment",
      reference: `T-${sessionId}-001`,
    },
    conflictsWith: {
      hypotheses: [`H-${sessionId}-001`],
      assumptions: [],
      description: `This conflicts with hypothesis 1 in session ${sessionId}`,
    },
    sessionId,
  });
}

// ============================================================================
// Tests
// ============================================================================

describe("AnomalyStorage", () => {
  let tempDir: string;
  let storage: AnomalyStorage;

  beforeEach(async () => {
    tempDir = await createTempDir();
    storage = new AnomalyStorage({ baseDir: tempDir });
  });

  afterEach(async () => {
    // Clean up temp directory to avoid inode exhaustion
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  // ============================================================================
  // Basic CRUD Tests
  // ============================================================================

  describe("saveAnomaly / getAnomalyById", () => {
    it("saves and retrieves an anomaly", async () => {
      const anomaly = createTestAnomaly("RS20251230", 1);
      await storage.saveAnomaly(anomaly);

      const retrieved = await storage.getAnomalyById(anomaly.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(anomaly.id);
      expect(retrieved?.observation).toBe(anomaly.observation);
    });

    it("updates existing anomaly", async () => {
      const anomaly = createTestAnomaly("RS20251230", 1);
      await storage.saveAnomaly(anomaly);

      const updated = { ...anomaly, observation: "Updated observation text here" };
      await storage.saveAnomaly(updated);

      const retrieved = await storage.getAnomalyById(anomaly.id);
      expect(retrieved?.observation).toBe("Updated observation text here");

      // Should still have only one anomaly
      const all = await storage.loadSessionAnomalies("RS20251230");
      expect(all).toHaveLength(1);
    });

    it("returns null for non-existent anomaly", async () => {
      const retrieved = await storage.getAnomalyById("X-NONEXISTENT-001");
      expect(retrieved).toBeNull();
    });

    it("returns null for invalid ID format", async () => {
      const retrieved = await storage.getAnomalyById("invalid-id");
      expect(retrieved).toBeNull();
    });
  });

  describe("deleteAnomaly", () => {
    it("deletes an existing anomaly", async () => {
      const anomaly = createTestAnomaly("RS20251230", 1);
      await storage.saveAnomaly(anomaly);

      const deleted = await storage.deleteAnomaly(anomaly.id);
      expect(deleted).toBe(true);

      const retrieved = await storage.getAnomalyById(anomaly.id);
      expect(retrieved).toBeNull();
    });

    it("returns false for non-existent anomaly", async () => {
      const deleted = await storage.deleteAnomaly("X-NONEXISTENT-001");
      expect(deleted).toBe(false);
    });
  });

  // ============================================================================
  // Session Operations Tests
  // ============================================================================

  describe("loadSessionAnomalies / saveSessionAnomalies", () => {
    it("returns empty array for non-existent session", async () => {
      const anomalies = await storage.loadSessionAnomalies("NONEXISTENT");
      expect(anomalies).toEqual([]);
    });

    it("returns empty array for malformed session file JSON", async () => {
      const good = createTestAnomaly("GOOD", 1);
      await storage.saveAnomaly(good);

      await fs.mkdir(join(tempDir, ".research", "anomalies"), { recursive: true });
      await fs.writeFile(join(tempDir, ".research", "anomalies", "BAD-anomalies.json"), "not-json");

      const loaded = await storage.loadSessionAnomalies("BAD");
      expect(loaded).toEqual([]);

      const index = await storage.rebuildIndex();
      expect(index.entries.map((e) => e.id)).toContain(good.id);
      expect(index.warnings?.some((w) => w.file.includes("BAD-anomalies.json"))).toBe(true);
    });

    it("saves and loads multiple anomalies for a session", async () => {
      const anomaly1 = createTestAnomaly("RS20251230", 1);
      const anomaly2 = createTestAnomaly("RS20251230", 2);
      const anomaly3 = createTestAnomaly("RS20251230", 3);

      await storage.saveSessionAnomalies("RS20251230", [anomaly1, anomaly2, anomaly3]);

      const loaded = await storage.loadSessionAnomalies("RS20251230");
      expect(loaded).toHaveLength(3);
      expect(loaded.map((a) => a.id)).toContain(anomaly1.id);
      expect(loaded.map((a) => a.id)).toContain(anomaly2.id);
      expect(loaded.map((a) => a.id)).toContain(anomaly3.id);
    });

    it("preserves createdAt when updating session file", async () => {
      const anomaly = createTestAnomaly("RS20251230", 1);
      await storage.saveSessionAnomalies("RS20251230", [anomaly]);

      // Read the file to get createdAt
      const filePath = join(tempDir, ".research", "anomalies", "RS20251230-anomalies.json");
      const content1 = JSON.parse(await fs.readFile(filePath, "utf-8")) as SessionAnomalyFile;
      const originalCreatedAt = content1.createdAt;

      // Wait a bit and update
      await new Promise((r) => setTimeout(r, 10));
      const anomaly2 = createTestAnomaly("RS20251230", 2);
      await storage.saveSessionAnomalies("RS20251230", [anomaly, anomaly2]);

      const content2 = JSON.parse(await fs.readFile(filePath, "utf-8")) as SessionAnomalyFile;
      expect(content2.createdAt).toBe(originalCreatedAt);
      expect(new Date(content2.updatedAt).getTime()).toBeGreaterThan(
        new Date(originalCreatedAt).getTime(),
      );
    });
  });

  // ============================================================================
  // Index Tests
  // ============================================================================

  describe("rebuildIndex / loadIndex", () => {
    it("builds index from session files", async () => {
      const anomaly1 = createTestAnomaly("RS20251230", 1);
      const anomaly2 = createTestAnomaly("RS20251231", 1);

      await storage.saveAnomaly(anomaly1);
      await storage.saveAnomaly(anomaly2);

      const index = await storage.loadIndex();
      expect(index.entries).toHaveLength(2);
      expect(index.entries.map((e) => e.id)).toContain(anomaly1.id);
      expect(index.entries.map((e) => e.id)).toContain(anomaly2.id);
    });

    it("rebuilds index when file is missing", async () => {
      const storageNoAuto = new AnomalyStorage({ baseDir: tempDir, autoRebuildIndex: false });
      const anomaly = createTestAnomaly("RS20251230", 1);
      await storageNoAuto.saveAnomaly(anomaly);

      // Should rebuild on load
      const index = await storageNoAuto.loadIndex();
      expect(index.entries).toHaveLength(1);
    });

    it("rebuilds index when index file is corrupted", async () => {
      const storageNoAuto = new AnomalyStorage({ baseDir: tempDir, autoRebuildIndex: false });
      await storageNoAuto.saveAnomaly(createTestAnomaly("RS20251230", 1));

      const indexPath = join(tempDir, ".research", "anomaly-index.json");
      await fs.writeFile(indexPath, "not-json");

      const index = await storageNoAuto.loadIndex();
      expect(index.entries).toHaveLength(1);
    });

    it("includes conflict information in index", async () => {
      const anomaly = createAnomaly({
        id: "X-RS20251230-001",
        observation: "Test observation with conflicts",
        source: { type: "experiment" },
        conflictsWith: {
          hypotheses: ["H-RS20251230-001", "H-RS20251230-002"],
          assumptions: ["A-RS20251230-001"],
          description: "Conflicts with multiple items",
        },
        sessionId: "RS20251230",
      });

      await storage.saveAnomaly(anomaly);
      const index = await storage.loadIndex();

      const entry = index.entries.find((e) => e.id === anomaly.id);
      expect(entry?.conflictsWithHypotheses).toHaveLength(2);
      expect(entry?.conflictsWithAssumptions).toHaveLength(1);
    });
  });

  // ============================================================================
  // Query Tests
  // ============================================================================

  describe("getAnomaliesByStatus", () => {
    it("filters by quarantine status", async () => {
      const active = createTestAnomaly("RS20251230", 1);
      const resolved = {
        ...createTestAnomaly("RS20251230", 2),
        quarantineStatus: "resolved" as const,
      };
      const deferred = {
        ...createTestAnomaly("RS20251230", 3),
        quarantineStatus: "deferred" as const,
      };

      await storage.saveAnomaly(active);
      await storage.saveAnomaly(resolved);
      await storage.saveAnomaly(deferred);

      const activeAnomalies = await storage.getAnomaliesByStatus("active");
      expect(activeAnomalies).toHaveLength(1);
      expect(activeAnomalies[0].id).toBe(active.id);

      const resolvedAnomalies = await storage.getAnomaliesByStatus("resolved");
      expect(resolvedAnomalies).toHaveLength(1);
      expect(resolvedAnomalies[0].id).toBe(resolved.id);
    });
  });

  describe("getActiveAnomalies", () => {
    it("returns only active anomalies", async () => {
      const active1 = createTestAnomaly("RS20251230", 1);
      const active2 = createTestAnomaly("RS20251231", 1);
      const resolved = {
        ...createTestAnomaly("RS20251230", 2),
        quarantineStatus: "resolved" as const,
      };

      await storage.saveAnomaly(active1);
      await storage.saveAnomaly(active2);
      await storage.saveAnomaly(resolved);

      const active = await storage.getActiveAnomalies();
      expect(active).toHaveLength(2);
    });
  });

  describe("getAnomaliesForHypothesis", () => {
    it("finds anomalies conflicting with a hypothesis", async () => {
      const anomaly1 = createAnomaly({
        id: "X-RS20251230-001",
        observation: "First anomaly observation text",
        source: { type: "experiment" },
        conflictsWith: {
          hypotheses: ["H-RS20251230-001"],
          assumptions: [],
          description: "Conflicts with H1",
        },
        sessionId: "RS20251230",
      });

      const anomaly2 = createAnomaly({
        id: "X-RS20251230-002",
        observation: "Second anomaly observation text",
        source: { type: "experiment" },
        conflictsWith: {
          hypotheses: ["H-RS20251230-002"],
          assumptions: [],
          description: "Conflicts with H2",
        },
        sessionId: "RS20251230",
      });

      await storage.saveAnomaly(anomaly1);
      await storage.saveAnomaly(anomaly2);

      const forH1 = await storage.getAnomaliesForHypothesis("H-RS20251230-001");
      expect(forH1).toHaveLength(1);
      expect(forH1[0].id).toBe(anomaly1.id);

      const forH2 = await storage.getAnomaliesForHypothesis("H-RS20251230-002");
      expect(forH2).toHaveLength(1);
      expect(forH2[0].id).toBe(anomaly2.id);
    });
  });

  describe("getAnomaliesForAssumption", () => {
    it("finds anomalies conflicting with an assumption", async () => {
      const anomaly = createAnomaly({
        id: "X-RS20251230-001",
        observation: "This observation conflicts with assumption",
        source: { type: "experiment" },
        conflictsWith: {
          hypotheses: [],
          assumptions: ["A-RS20251230-001"],
          description: "Conflicts with scale assumption",
        },
        sessionId: "RS20251230",
      });

      await storage.saveAnomaly(anomaly);

      const forA1 = await storage.getAnomaliesForAssumption("A-RS20251230-001");
      expect(forA1).toHaveLength(1);
      expect(forA1[0].id).toBe(anomaly.id);

      const forA2 = await storage.getAnomaliesForAssumption("A-RS20251230-002");
      expect(forA2).toHaveLength(0);
    });
  });

  describe("getAnomaliesWithSpawnedHypotheses", () => {
    it("finds anomalies that spawned hypotheses", async () => {
      const withSpawned = {
        ...createTestAnomaly("RS20251230", 1),
        spawnedHypotheses: ["H-RS20251230-003"],
      };
      const withoutSpawned = createTestAnomaly("RS20251230", 2);

      await storage.saveAnomaly(withSpawned);
      await storage.saveAnomaly(withoutSpawned);

      const spawned = await storage.getAnomaliesWithSpawnedHypotheses();
      expect(spawned).toHaveLength(1);
      expect(spawned[0].id).toBe(withSpawned.id);
    });
  });

  describe("getAnomalyThatSpawned", () => {
    it("finds anomaly that spawned a specific hypothesis", async () => {
      const anomaly = {
        ...createTestAnomaly("RS20251230", 1),
        spawnedHypotheses: ["H-RS20251230-003", "H-RS20251230-004"],
      };

      await storage.saveAnomaly(anomaly);

      const found = await storage.getAnomalyThatSpawned("H-RS20251230-003");
      expect(found).not.toBeNull();
      expect(found?.id).toBe(anomaly.id);

      const notFound = await storage.getAnomalyThatSpawned("H-RS20251230-999");
      expect(notFound).toBeNull();
    });
  });

  // ============================================================================
  // Statistics Tests
  // ============================================================================

  describe("getStatistics", () => {
    it("returns correct statistics", async () => {
      await storage.saveAnomaly(createTestAnomaly("RS20251230", 1));
      await storage.saveAnomaly({
        ...createTestAnomaly("RS20251230", 2),
        quarantineStatus: "resolved" as const,
      });
      await storage.saveAnomaly({
        ...createTestAnomaly("RS20251231", 1),
        spawnedHypotheses: ["H-RS20251231-003"],
      });

      const stats = await storage.getStatistics();

      expect(stats.total).toBe(3);
      expect(stats.byStatus.active).toBe(2);
      expect(stats.byStatus.resolved).toBe(1);
      expect(stats.withSpawnedHypotheses).toBe(1);
      expect(stats.sessionsWithAnomalies).toBe(2);
    });
  });

  // ============================================================================
  // Bulk Operations Tests
  // ============================================================================

  describe("getAllAnomalies", () => {
    it("returns all anomalies across sessions", async () => {
      await storage.saveAnomaly(createTestAnomaly("RS20251230", 1));
      await storage.saveAnomaly(createTestAnomaly("RS20251230", 2));
      await storage.saveAnomaly(createTestAnomaly("RS20251231", 1));

      const all = await storage.getAllAnomalies();
      expect(all).toHaveLength(3);
    });

    it("returns empty array when no anomalies exist", async () => {
      const all = await storage.getAllAnomalies();
      expect(all).toEqual([]);
    });
  });

  describe("listSessions", () => {
    it("lists all sessions with anomalies", async () => {
      await storage.saveAnomaly(createTestAnomaly("RS20251230", 1));
      await storage.saveAnomaly(createTestAnomaly("RS20251231", 1));
      await storage.saveAnomaly(createTestAnomaly("CELL-FATE-001", 1));

      const sessions = await storage.listSessions();
      expect(sessions).toHaveLength(3);
      expect(sessions).toContain("RS20251230");
      expect(sessions).toContain("RS20251231");
      expect(sessions).toContain("CELL-FATE-001");
    });
  });

  // ============================================================================
  // Concurrency Tests
  // ============================================================================

  describe("Concurrency", () => {
    it("concurrent saveAnomaly calls do not drop writes", async () => {
      const sessionId = "CONCURRENT";
      const anomalies = Array.from({ length: 10 }, (_, i) => createTestAnomaly(sessionId, i + 1));

      const concurrencyStorage = new AnomalyStorage({ baseDir: tempDir, autoRebuildIndex: false });
      await Promise.all(anomalies.map((a) => concurrencyStorage.saveAnomaly(a)));

      const loaded = await concurrencyStorage.loadSessionAnomalies(sessionId);
      expect(loaded).toHaveLength(anomalies.length);

      const loadedIds = loaded.map((a) => a.id).sort();
      const expectedIds = anomalies.map((a) => a.id).sort();
      expect(loadedIds).toEqual(expectedIds);
    });
  });
});
