/**
 * Tests for Operator Intervention Storage Layer
 *
 * @see intervention-storage.ts
 * @see brenner_bot-mqg7 (bead)
 */

import { randomUUID } from "node:crypto";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { OperatorIntervention } from "../schemas/operator-intervention";
import { InterventionStorage } from "./intervention-storage";

// ============================================================================
// Test Helpers
// ============================================================================

function makeIntervention(overrides: Partial<OperatorIntervention> = {}): OperatorIntervention {
  return {
    id: "INT-TEST-001",
    session_id: "TEST",
    timestamp: "2025-12-30T10:00:00+00:00",
    operator_id: "human",
    type: "artifact_edit",
    severity: "minor",
    target: {},
    rationale: "Test intervention for unit testing",
    reversible: true,
    tags: [],
    ...overrides,
  };
}

async function createTempDir(): Promise<string> {
  const tempDir = join(tmpdir(), `intervention-test-${randomUUID()}`);
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
}

// ============================================================================
// Tests: Basic Operations
// ============================================================================

describe("InterventionStorage", () => {
  let tempDir: string;
  let storage: InterventionStorage;

  beforeEach(async () => {
    tempDir = await createTempDir();
    storage = new InterventionStorage({ baseDir: tempDir });
  });

  afterEach(async () => {
    // Clean up temp directory to avoid inode exhaustion
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  describe("Session File Operations", () => {
    it("returns empty array for non-existent session", async () => {
      const interventions = await storage.loadSessionInterventions("NONEXISTENT");
      expect(interventions).toEqual([]);
    });

    it("returns empty array for malformed session file JSON", async () => {
      const good = makeIntervention({ session_id: "GOOD", id: "INT-GOOD-001" });
      await storage.saveIntervention(good);

      await fs.mkdir(join(tempDir, ".research", "interventions"), { recursive: true });
      await fs.writeFile(
        join(tempDir, ".research", "interventions", "BAD-interventions.json"),
        "not-json",
      );

      const loaded = await storage.loadSessionInterventions("BAD");
      expect(loaded).toEqual([]);

      const index = await storage.rebuildIndex();
      expect(index.entries.map((e) => e.id)).toContain(good.id);
      expect(index.warnings?.some((w) => w.file.includes("BAD-interventions.json"))).toBe(true);
    });

    it("throws for non-ENOENT errors when baseDir is not a directory", async () => {
      const baseDirFile = join(tempDir, "not-a-dir");
      await fs.writeFile(baseDirFile, "x");

      const badStorage = new InterventionStorage({ baseDir: baseDirFile });

      await expect(badStorage.loadSessionInterventions("ANY")).rejects.toMatchObject({
        code: expect.any(String),
      });
    });

    it("saves and loads session interventions", async () => {
      const intervention = makeIntervention();
      await storage.saveSessionInterventions("TEST", [intervention]);

      const loaded = await storage.loadSessionInterventions("TEST");
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe("INT-TEST-001");
    });

    it("preserves createdAt on update", async () => {
      const intervention = makeIntervention();
      await storage.saveSessionInterventions("TEST", [intervention]);

      // Wait a bit and save again
      await new Promise((r) => setTimeout(r, 10));
      const intervention2 = makeIntervention({ id: "INT-TEST-002" });
      await storage.saveSessionInterventions("TEST", [intervention, intervention2]);

      // Read raw file to check timestamps
      const filePath = join(tempDir, ".research", "interventions", "TEST-interventions.json");
      const content = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(content);

      expect(data.createdAt).not.toBe(data.updatedAt);
      expect(new Date(data.updatedAt).getTime()).toBeGreaterThan(
        new Date(data.createdAt).getTime(),
      );
    });

    it("does not rebuild index when autoRebuildIndex is disabled", async () => {
      const noIndexStorage = new InterventionStorage({ baseDir: tempDir, autoRebuildIndex: false });
      await noIndexStorage.saveSessionInterventions("TEST", [makeIntervention()]);

      const indexPath = join(tempDir, ".research", "intervention-index.json");
      await expect(fs.readFile(indexPath, "utf-8")).rejects.toMatchObject({ code: "ENOENT" });
    });
  });

  describe("Individual Operations", () => {
    it("gets intervention by ID", async () => {
      const intervention = makeIntervention();
      await storage.saveIntervention(intervention);

      const found = await storage.getInterventionById("INT-TEST-001");
      expect(found).not.toBeNull();
      expect(found?.id).toBe("INT-TEST-001");
    });

    it("returns null for non-existent ID", async () => {
      const found = await storage.getInterventionById("INT-FAKE-999");
      expect(found).toBeNull();
    });

    it("returns null for invalid ID format", async () => {
      const found = await storage.getInterventionById("NOT-AN-ID");
      expect(found).toBeNull();
    });

    it("updates existing intervention", async () => {
      const intervention = makeIntervention();
      await storage.saveIntervention(intervention);

      const updated = {
        ...intervention,
        rationale: "Updated rationale for testing",
      };
      await storage.saveIntervention(updated);

      const loaded = await storage.loadSessionInterventions("TEST");
      expect(loaded).toHaveLength(1);
      expect(loaded[0].rationale).toBe("Updated rationale for testing");
    });

    it("deletes intervention by ID", async () => {
      const intervention = makeIntervention();
      await storage.saveIntervention(intervention);

      const deleted = await storage.deleteIntervention("INT-TEST-001");
      expect(deleted).toBe(true);

      const loaded = await storage.loadSessionInterventions("TEST");
      expect(loaded).toHaveLength(0);
    });

    it("returns false when deleting non-existent intervention", async () => {
      const deleted = await storage.deleteIntervention("INT-FAKE-999");
      expect(deleted).toBe(false);
    });

    it("deletes intervention using session ID extracted from intervention ID, not from session_id field", async () => {
      // The implementation extracts session ID from the intervention ID pattern INT-{sessionId}-{num}
      // regardless of what the intervention's session_id field contains.
      await storage.saveSessionInterventions("TEST", [makeIntervention({ session_id: "S2" })]);

      const deleted = await storage.deleteIntervention("INT-TEST-001");
      // Returns true because the intervention was found in session "TEST" (from ID) and deleted
      expect(deleted).toBe(true);
    });

    it("gets next sequence number", async () => {
      const seq1 = await storage.getNextSequence("TEST");
      expect(seq1).toBe(1);

      await storage.saveIntervention(makeIntervention());
      const seq2 = await storage.getNextSequence("TEST");
      expect(seq2).toBe(2);
    });
  });

  describe("Index Operations", () => {
    it("rebuilds index when interventions directory is missing", async () => {
      const index = await storage.rebuildIndex();
      expect(index.entries).toEqual([]);

      const indexPath = join(tempDir, ".research", "intervention-index.json");
      const content = await fs.readFile(indexPath, "utf-8");
      const parsed = JSON.parse(content);
      expect(parsed).toHaveProperty("entries");
    });

    it("rebuildIndex ignores unrelated files in interventions directory", async () => {
      const interventionsDir = join(tempDir, ".research", "interventions");
      await fs.mkdir(interventionsDir, { recursive: true });
      await fs.writeFile(join(interventionsDir, "notes.txt"), "ignore me");

      await storage.saveIntervention(makeIntervention());
      const index = await storage.rebuildIndex();
      expect(index.entries).toHaveLength(1);
    });

    it("throws when rebuildIndex cannot read interventions directory", async () => {
      const baseDirFile = join(tempDir, "not-a-dir");
      await fs.writeFile(baseDirFile, "x");

      const badStorage = new InterventionStorage({ baseDir: baseDirFile });
      await expect(badStorage.rebuildIndex()).rejects.toBeTruthy();
    });

    it("rebuilds index with entries", async () => {
      await storage.saveIntervention(makeIntervention());
      await storage.saveIntervention(
        makeIntervention({
          id: "INT-TEST-002",
          severity: "major",
          type: "decision_override",
        }),
      );

      const index = await storage.loadIndex();
      expect(index.entries).toHaveLength(2);
      expect(index.entries.map((e) => e.id)).toContain("INT-TEST-001");
      expect(index.entries.map((e) => e.id)).toContain("INT-TEST-002");
    });

    it("loadIndex rebuilds if index file is malformed", async () => {
      const storageNoAuto = new InterventionStorage({ baseDir: tempDir, autoRebuildIndex: false });
      await storageNoAuto.saveIntervention(makeIntervention());

      const indexPath = join(tempDir, ".research", "intervention-index.json");
      await fs.writeFile(indexPath, "not-json");

      const index = await storageNoAuto.loadIndex();
      expect(index.entries).toHaveLength(1);
    });

    it("index includes correct metadata", async () => {
      await storage.saveIntervention(
        makeIntervention({
          severity: "critical",
          type: "session_control",
          operator_id: "admin",
        }),
      );

      const index = await storage.loadIndex();
      const entry = index.entries[0];

      expect(entry.severity).toBe("critical");
      expect(entry.type).toBe("session_control");
      expect(entry.operatorId).toBe("admin");
      expect(entry.reversed).toBe(false);
    });

    it("marks reversed interventions in index", async () => {
      await storage.saveIntervention(
        makeIntervention({
          reversed_at: "2025-12-30T11:00:00+00:00",
          reversed_by: "admin",
        }),
      );

      const index = await storage.loadIndex();
      expect(index.entries[0].reversed).toBe(true);
    });

    it("returns empty array when reading all interventions and directory is missing", async () => {
      const freshDir = await createTempDir();
      const freshStorage = new InterventionStorage({ baseDir: freshDir });

      const all = await freshStorage.getAllInterventions();
      expect(all).toEqual([]);
    });

    it("ignores unrelated files when reading all interventions", async () => {
      const interventionsDir = join(tempDir, ".research", "interventions");
      await fs.mkdir(interventionsDir, { recursive: true });
      await fs.writeFile(join(interventionsDir, "notes.txt"), "ignore me");

      await storage.saveIntervention(makeIntervention());
      const all = await storage.getAllInterventions();
      expect(all).toHaveLength(1);
    });

    it("throws when reading all interventions from an invalid baseDir", async () => {
      const baseDirFile = join(tempDir, "not-a-dir");
      await fs.writeFile(baseDirFile, "x");

      const badStorage = new InterventionStorage({ baseDir: baseDirFile });
      await expect(badStorage.getAllInterventions()).rejects.toBeTruthy();
    });

    it("listSessions filters out invalid intervention filenames", async () => {
      const interventionsDir = join(tempDir, ".research", "interventions");
      await fs.mkdir(interventionsDir, { recursive: true });
      await fs.writeFile(join(interventionsDir, "-interventions.json"), "{}");

      const sessions = await storage.listSessions();
      expect(sessions).toEqual([]);
    });
  });

  // ============================================================================
  // Concurrency Tests
  // ============================================================================

  describe("Concurrency", () => {
    it("concurrent saveIntervention calls do not drop writes", async () => {
      const sessionId = "CONCURRENT";
      const interventions = Array.from({ length: 10 }, (_, i) =>
        makeIntervention({
          session_id: sessionId,
          id: `INT-${sessionId}-${String(i + 1).padStart(3, "0")}`,
          rationale: `Concurrent intervention ${i + 1}`,
        }),
      );

      const concurrencyStorage = new InterventionStorage({
        baseDir: tempDir,
        autoRebuildIndex: false,
      });
      await Promise.all(interventions.map((iv) => concurrencyStorage.saveIntervention(iv)));

      const loaded = await concurrencyStorage.loadSessionInterventions(sessionId);
      expect(loaded).toHaveLength(interventions.length);

      const loadedIds = loaded.map((iv) => iv.id).sort();
      const expectedIds = interventions.map((iv) => iv.id).sort();
      expect(loadedIds).toEqual(expectedIds);
    });
  });

  describe("Query Operations", () => {
    beforeEach(async () => {
      // Set up test data
      await storage.saveIntervention(
        makeIntervention({
          id: "INT-TEST-001",
          severity: "minor",
          type: "artifact_edit",
          operator_id: "alice",
        }),
      );
      await storage.saveIntervention(
        makeIntervention({
          id: "INT-TEST-002",
          severity: "major",
          type: "decision_override",
          operator_id: "bob",
        }),
      );
      await storage.saveIntervention(
        makeIntervention({
          id: "INT-TEST-003",
          severity: "critical",
          type: "session_control",
          operator_id: "alice",
        }),
      );
    });

    it("gets interventions by severity", async () => {
      const minor = await storage.getInterventionsBySeverity("minor");
      expect(minor).toHaveLength(1);
      expect(minor[0].id).toBe("INT-TEST-001");

      const major = await storage.getInterventionsBySeverity("major");
      expect(major).toHaveLength(1);
      expect(major[0].id).toBe("INT-TEST-002");
    });

    it("gets interventions by type", async () => {
      const edits = await storage.getInterventionsByType("artifact_edit");
      expect(edits).toHaveLength(1);

      const control = await storage.getInterventionsByType("session_control");
      expect(control).toHaveLength(1);
    });

    it("gets interventions by operator", async () => {
      const alice = await storage.getInterventionsByOperator("alice");
      expect(alice).toHaveLength(2);

      const bob = await storage.getInterventionsByOperator("bob");
      expect(bob).toHaveLength(1);
    });

    it("gets major interventions", async () => {
      const major = await storage.getMajorInterventions();
      expect(major).toHaveLength(2); // major + critical
      expect(major.map((i) => i.severity).sort()).toEqual(["critical", "major"]);
    });
  });

  describe("Aggregation Operations", () => {
    it("returns empty summary for session with no interventions", async () => {
      const summary = await storage.getSessionSummary("EMPTY");
      expect(summary.total_count).toBe(0);
      expect(summary.has_major_interventions).toBe(false);
    });

    it("returns correct session summary", async () => {
      await storage.saveIntervention(makeIntervention({ id: "INT-TEST-001", severity: "minor" }));
      await storage.saveIntervention(makeIntervention({ id: "INT-TEST-002", severity: "major" }));

      const summary = await storage.getSessionSummary("TEST");
      expect(summary.total_count).toBe(2);
      expect(summary.by_severity.minor).toBe(1);
      expect(summary.by_severity.major).toBe(1);
      expect(summary.has_major_interventions).toBe(true);
    });

    it("identifies clean sessions", async () => {
      await storage.saveIntervention(makeIntervention({ severity: "minor" }));
      await storage.saveIntervention(
        makeIntervention({ id: "INT-TEST-002", severity: "moderate" }),
      );

      const isClean = await storage.isCleanSession("TEST");
      expect(isClean).toBe(true);
    });

    it("identifies non-clean sessions", async () => {
      await storage.saveIntervention(makeIntervention({ severity: "critical" }));

      const isClean = await storage.isCleanSession("TEST");
      expect(isClean).toBe(false);
    });
  });

  describe("Statistics", () => {
    it("computes correct statistics", async () => {
      await storage.saveIntervention(
        makeIntervention({
          id: "INT-TEST-001",
          severity: "minor",
          type: "artifact_edit",
          operator_id: "alice",
        }),
      );
      await storage.saveIntervention(
        makeIntervention({
          id: "INT-TEST-002",
          severity: "major",
          type: "decision_override",
          operator_id: "bob",
          reversed_at: "2025-12-30T12:00:00+00:00",
        }),
      );

      const stats = await storage.getStatistics();

      expect(stats.total).toBe(2);
      expect(stats.bySeverity.minor).toBe(1);
      expect(stats.bySeverity.major).toBe(1);
      expect(stats.byType.artifact_edit).toBe(1);
      expect(stats.byType.decision_override).toBe(1);
      expect(stats.reversed).toBe(1);
      expect(stats.sessionsWithInterventions).toBe(1);
      expect(stats.operators).toEqual(["alice", "bob"]);
    });
  });

  describe("Bulk Operations", () => {
    it("gets all interventions across sessions", async () => {
      await storage.saveIntervention(makeIntervention({ id: "INT-S1-001", session_id: "S1" }));
      await storage.saveIntervention(makeIntervention({ id: "INT-S2-001", session_id: "S2" }));

      const all = await storage.getAllInterventions();
      expect(all).toHaveLength(2);
    });

    it("lists all session IDs with interventions", async () => {
      await storage.saveIntervention(makeIntervention({ id: "INT-S1-001", session_id: "S1" }));
      await storage.saveIntervention(makeIntervention({ id: "INT-S2-001", session_id: "S2" }));

      const sessions = await storage.listSessions();
      expect(sessions.sort()).toEqual(["S1", "S2"]);
    });

    it("gets interventions in time range", async () => {
      await storage.saveIntervention(
        makeIntervention({
          id: "INT-TEST-001",
          timestamp: "2025-12-30T08:00:00+00:00",
        }),
      );
      await storage.saveIntervention(
        makeIntervention({
          id: "INT-TEST-002",
          timestamp: "2025-12-30T10:00:00+00:00",
        }),
      );
      await storage.saveIntervention(
        makeIntervention({
          id: "INT-TEST-003",
          timestamp: "2025-12-30T12:00:00+00:00",
        }),
      );

      const inRange = await storage.getInterventionsInRange(
        "2025-12-30T09:00:00+00:00",
        "2025-12-30T11:00:00+00:00",
      );

      expect(inRange).toHaveLength(1);
      expect(inRange[0].id).toBe("INT-TEST-002");
    });
  });

  describe("Edge Cases", () => {
    it("handles session IDs with special characters", async () => {
      const sessionId = "RS-2025/12/30";
      await storage.saveIntervention(
        makeIntervention({ id: "INT-RS-2025_12_30-001", session_id: sessionId }),
      );

      const loaded = await storage.loadSessionInterventions(sessionId);
      expect(loaded).toHaveLength(1);
    });

    it("validates interventions on load", async () => {
      const intervention = makeIntervention();
      await storage.saveIntervention(intervention);

      const loaded = await storage.loadSessionInterventions("TEST");
      expect(loaded[0]).toMatchObject({
        id: intervention.id,
        session_id: intervention.session_id,
        type: intervention.type,
        severity: intervention.severity,
      });
    });
  });
});
