import { randomUUID } from "node:crypto";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  type Assumption,
  type AssumptionLoad,
  createAssumption,
  createScaleAssumption,
  type ScaleCalculation,
} from "../schemas/assumption";
import { AssumptionStorage, type SessionAssumptionFile } from "./assumption-storage";

/**
 * Tests for AssumptionStorage
 *
 * @see brenner_bot-5kr7.2 (bead)
 */

// ============================================================================
// Test Helpers
// ============================================================================

let testDir: string;

async function createTestDir(): Promise<string> {
  const dir = join(tmpdir(), `assumption-storage-test-${randomUUID()}`);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function createTestLoad(): AssumptionLoad {
  return {
    affectedHypotheses: ["H-TEST-001", "H-TEST-002"],
    affectedTests: ["T-TEST-001"],
    description: "Test load description",
  };
}

function createTestCalculation(): ScaleCalculation {
  return {
    quantities: "D ≈ 10 μm²/s, L ≈ 100 μm",
    result: "τ ≈ L²/D ≈ 1000s ≈ 17 min",
    units: "seconds, micrometers",
    implication: "Gradient-based signaling is physically plausible",
    whatItRulesOut: "Rules out H3 if τ > cell cycle",
  };
}

function createTestAssumption(
  overrides: Partial<{
    id: string;
    statement: string;
    type: "background" | "methodological" | "boundary" | "scale_physics";
    status: "unchecked" | "challenged" | "verified" | "falsified";
    sessionId: string;
    load: AssumptionLoad;
    calculation?: ScaleCalculation;
  }> = {},
): Assumption {
  const defaults = {
    id: "A-TEST-001",
    statement: "This is a test assumption statement",
    type: "background" as const,
    status: "unchecked" as const,
    sessionId: "TEST",
    load: createTestLoad(),
  };

  const merged = { ...defaults, ...overrides };

  if (merged.type === "scale_physics" && overrides.calculation) {
    return createScaleAssumption({
      id: merged.id,
      statement: merged.statement,
      sessionId: merged.sessionId,
      load: merged.load,
      calculation: overrides.calculation,
    });
  }

  return createAssumption(merged);
}

// ============================================================================
// Setup and Teardown
// ============================================================================

beforeEach(async () => {
  testDir = await createTestDir();
});

afterEach(async () => {
  // Clean up temp directory to avoid inode exhaustion
  if (testDir) {
    await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
  }
});

// ============================================================================
// Tests
// ============================================================================

describe("AssumptionStorage", () => {
  describe("constructor", () => {
    test("creates with default config", () => {
      const storage = new AssumptionStorage();
      expect(storage).toBeDefined();
    });

    test("creates with custom baseDir", () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      expect(storage).toBeDefined();
    });

    test("creates with autoRebuildIndex disabled", () => {
      const storage = new AssumptionStorage({ autoRebuildIndex: false });
      expect(storage).toBeDefined();
    });
  });

  describe("session operations", () => {
    test("loadSessionAssumptions returns empty array for non-existent session", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const assumptions = await storage.loadSessionAssumptions("nonexistent");
      expect(assumptions).toEqual([]);
    });

    test("saveSessionAssumptions creates directory structure", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const assumption = createTestAssumption();

      await storage.saveSessionAssumptions("TEST", [assumption]);

      const exists = await fs
        .access(join(testDir, ".research", "assumptions", "TEST-assumptions.json"))
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    test("saveSessionAssumptions saves and loads assumptions correctly", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const assumption = createTestAssumption();

      await storage.saveSessionAssumptions("TEST", [assumption]);
      const loaded = await storage.loadSessionAssumptions("TEST");

      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe("A-TEST-001");
      expect(loaded[0].statement).toBe("This is a test assumption statement");
    });

    test("saveSessionAssumptions preserves createdAt on update", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir, autoRebuildIndex: false });
      const assumption = createTestAssumption();

      await storage.saveSessionAssumptions("TEST", [assumption]);

      // Read the file to get createdAt
      const filePath = join(testDir, ".research", "assumptions", "TEST-assumptions.json");
      const content1 = await fs.readFile(filePath, "utf-8");
      const data1 = JSON.parse(content1) as SessionAssumptionFile;
      const originalCreatedAt = data1.createdAt;

      // Wait a bit and update
      await new Promise((resolve) => setTimeout(resolve, 10));
      const updated = createTestAssumption({ statement: "Updated statement" });
      await storage.saveSessionAssumptions("TEST", [updated]);

      // Read again
      const content2 = await fs.readFile(filePath, "utf-8");
      const data2 = JSON.parse(content2) as SessionAssumptionFile;

      expect(data2.createdAt).toBe(originalCreatedAt);
      expect(data2.updatedAt).not.toBe(originalCreatedAt);
    });
  });

  describe("individual assumption operations", () => {
    test("getAssumptionById returns null for invalid ID format", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const result = await storage.getAssumptionById("invalid-id");
      expect(result).toBeNull();
    });

    test("getAssumptionById returns null for non-existent assumption", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const result = await storage.getAssumptionById("A-NONEXISTENT-001");
      expect(result).toBeNull();
    });

    test("getAssumptionById returns correct assumption", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const assumption = createTestAssumption();
      await storage.saveSessionAssumptions("TEST", [assumption]);

      const result = await storage.getAssumptionById("A-TEST-001");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("A-TEST-001");
    });

    test("saveAssumption creates new assumption", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const assumption = createTestAssumption();

      await storage.saveAssumption(assumption);

      const loaded = await storage.loadSessionAssumptions("TEST");
      expect(loaded).toHaveLength(1);
    });

    test("saveAssumption updates existing assumption", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const assumption = createTestAssumption();
      await storage.saveAssumption(assumption);

      const updated = createTestAssumption({ statement: "Updated statement here" });
      await storage.saveAssumption(updated);

      const loaded = await storage.loadSessionAssumptions("TEST");
      expect(loaded).toHaveLength(1);
      expect(loaded[0].statement).toBe("Updated statement here");
    });

    test("deleteAssumption returns false for non-existent assumption", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const result = await storage.deleteAssumption("A-NONEXISTENT-001");
      expect(result).toBe(false);
    });

    test("deleteAssumption removes assumption", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const assumption = createTestAssumption();
      await storage.saveAssumption(assumption);

      const result = await storage.deleteAssumption("A-TEST-001");

      expect(result).toBe(true);
      const loaded = await storage.loadSessionAssumptions("TEST");
      expect(loaded).toHaveLength(0);
    });
  });

  describe("index operations", () => {
    test("rebuildIndex creates index file", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      await storage.rebuildIndex();

      const indexPath = join(testDir, ".research", "assumption-index.json");
      const exists = await fs
        .access(indexPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    test("rebuildIndex indexes assumptions correctly", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir, autoRebuildIndex: false });
      const assumption = createTestAssumption();
      await storage.saveSessionAssumptions("TEST", [assumption]);

      const index = await storage.rebuildIndex();

      expect(index.entries).toHaveLength(1);
      expect(index.entries[0].id).toBe("A-TEST-001");
      expect(index.entries[0].type).toBe("background");
      expect(index.entries[0].status).toBe("unchecked");
      expect(index.entries[0].affectedHypotheses).toEqual(["H-TEST-001", "H-TEST-002"]);
    });

    test("loadIndex returns cached index if exists", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const assumption = createTestAssumption();
      await storage.saveAssumption(assumption);

      const index = await storage.loadIndex();

      expect(index.entries).toHaveLength(1);
    });

    test("loadIndex rebuilds if index missing", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir, autoRebuildIndex: false });
      const assumption = createTestAssumption();
      await storage.saveSessionAssumptions("TEST", [assumption]);

      const index = await storage.loadIndex();

      expect(index.entries).toHaveLength(1);
    });

    test("loadIndex rebuilds if index file is malformed", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir, autoRebuildIndex: false });
      const assumption = createTestAssumption();
      await storage.saveSessionAssumptions("TEST", [assumption]);

      const indexPath = join(testDir, ".research", "assumption-index.json");
      await fs.writeFile(indexPath, "not-json");

      const index = await storage.loadIndex();
      expect(index.entries).toHaveLength(1);
    });
  });

  describe("query operations", () => {
    test("getAssumptionsByStatus returns correct assumptions", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const unchecked = createTestAssumption({ id: "A-TEST-001", status: "unchecked" });
      const verified = createTestAssumption({ id: "A-TEST-002", status: "verified" });
      await storage.saveSessionAssumptions("TEST", [unchecked, verified]);

      const result = await storage.getAssumptionsByStatus("verified");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("A-TEST-002");
    });

    test("getAssumptionsByType returns correct assumptions", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const background = createTestAssumption({ id: "A-TEST-001", type: "background" });
      const methodological = createTestAssumption({ id: "A-TEST-002", type: "methodological" });
      await storage.saveSessionAssumptions("TEST", [background, methodological]);

      const result = await storage.getAssumptionsByType("methodological");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("A-TEST-002");
    });

    test("getUncheckedAssumptions returns unchecked assumptions", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const assumption = createTestAssumption({ status: "unchecked" });
      await storage.saveAssumption(assumption);

      const result = await storage.getUncheckedAssumptions();

      expect(result).toHaveLength(1);
    });

    test("getChallengedAssumptions returns challenged assumptions", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const assumption = createTestAssumption({ status: "challenged" });
      await storage.saveAssumption(assumption);

      const result = await storage.getChallengedAssumptions();

      expect(result).toHaveLength(1);
    });

    test("getVerifiedAssumptions returns verified assumptions", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const assumption = createTestAssumption({ status: "verified" });
      await storage.saveAssumption(assumption);

      const result = await storage.getVerifiedAssumptions();

      expect(result).toHaveLength(1);
    });

    test("getFalsifiedAssumptions returns falsified assumptions", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const assumption = createTestAssumption({ status: "falsified" });
      await storage.saveAssumption(assumption);

      const result = await storage.getFalsifiedAssumptions();

      expect(result).toHaveLength(1);
    });

    test("getScalePhysicsAssumptions returns scale_physics assumptions", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const scaleAssumption = createTestAssumption({
        id: "A-TEST-001",
        type: "scale_physics",
        calculation: createTestCalculation(),
      });
      await storage.saveAssumption(scaleAssumption);

      const result = await storage.getScalePhysicsAssumptions();

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("scale_physics");
    });

    test("getAssumptionsForHypothesis returns linked assumptions", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const assumption = createTestAssumption();
      await storage.saveAssumption(assumption);

      const result = await storage.getAssumptionsForHypothesis("H-TEST-001");

      expect(result).toHaveLength(1);
    });

    test("getAssumptionsForHypothesis returns empty for unlinked hypothesis", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const assumption = createTestAssumption();
      await storage.saveAssumption(assumption);

      const result = await storage.getAssumptionsForHypothesis("H-OTHER-001");

      expect(result).toHaveLength(0);
    });

    test("getAssumptionsForTest returns linked assumptions", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const assumption = createTestAssumption();
      await storage.saveAssumption(assumption);

      const result = await storage.getAssumptionsForTest("T-TEST-001");

      expect(result).toHaveLength(1);
    });

    test("getScaleAssumptionsWithCalculations returns assumptions with calculations", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const withCalc = createTestAssumption({
        id: "A-TEST-001",
        type: "scale_physics",
        calculation: createTestCalculation(),
      });
      await storage.saveAssumption(withCalc);

      const result = await storage.getScaleAssumptionsWithCalculations();

      expect(result).toHaveLength(1);
      expect(result[0].calculation).toBeDefined();
    });
  });

  describe("propagation operations", () => {
    test("getAffectedByFalsification returns linked entities", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const assumption = createTestAssumption();
      await storage.saveAssumption(assumption);

      const affected = await storage.getAffectedByFalsification("A-TEST-001");

      expect(affected.hypotheses).toEqual(["H-TEST-001", "H-TEST-002"]);
      expect(affected.tests).toEqual(["T-TEST-001"]);
    });

    test("getAffectedByFalsification returns empty for non-existent assumption", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });

      const affected = await storage.getAffectedByFalsification("A-NONEXISTENT-001");

      expect(affected.hypotheses).toEqual([]);
      expect(affected.tests).toEqual([]);
    });
  });

  describe("statistics", () => {
    test("getStatistics returns correct counts", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const assumptions = [
        createTestAssumption({ id: "A-TEST-001", type: "background", status: "unchecked" }),
        createTestAssumption({ id: "A-TEST-002", type: "methodological", status: "verified" }),
        createTestAssumption({
          id: "A-TEST-003",
          type: "scale_physics",
          status: "unchecked",
          calculation: createTestCalculation(),
        }),
      ];
      await storage.saveSessionAssumptions("TEST", assumptions);

      const stats = await storage.getStatistics();

      expect(stats.total).toBe(3);
      expect(stats.byStatus.unchecked).toBe(2);
      expect(stats.byStatus.verified).toBe(1);
      expect(stats.byType.background).toBe(1);
      expect(stats.byType.methodological).toBe(1);
      expect(stats.byType.scale_physics).toBe(1);
      expect(stats.withCalculations).toBe(1);
      expect(stats.sessionsWithAssumptions).toBe(1);
    });

    test("validateScaleAssumptionPresence returns false when no scale assumptions", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const assumption = createTestAssumption({ type: "background" });
      await storage.saveAssumption(assumption);

      const result = await storage.validateScaleAssumptionPresence("TEST");

      expect(result.present).toBe(false);
      expect(result.count).toBe(0);
      expect(result.message).toContain("No scale_physics assumption found");
    });

    test("validateScaleAssumptionPresence returns true when scale assumptions exist", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const assumption = createTestAssumption({
        type: "scale_physics",
        calculation: createTestCalculation(),
      });
      await storage.saveAssumption(assumption);

      const result = await storage.validateScaleAssumptionPresence("TEST");

      expect(result.present).toBe(true);
      expect(result.count).toBe(1);
    });
  });

  describe("bulk operations", () => {
    test("getAllAssumptions returns all assumptions across sessions", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir, autoRebuildIndex: false });
      const session1 = [createTestAssumption({ id: "A-SESSION1-001", sessionId: "SESSION1" })];
      const session2 = [
        createTestAssumption({ id: "A-SESSION2-001", sessionId: "SESSION2" }),
        createTestAssumption({ id: "A-SESSION2-002", sessionId: "SESSION2" }),
      ];
      await storage.saveSessionAssumptions("SESSION1", session1);
      await storage.saveSessionAssumptions("SESSION2", session2);

      const all = await storage.getAllAssumptions();

      expect(all).toHaveLength(3);
    });

    test("listSessions returns all session IDs", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir, autoRebuildIndex: false });
      await storage.saveSessionAssumptions("SESSION1", [
        createTestAssumption({ id: "A-SESSION1-001", sessionId: "SESSION1" }),
      ]);
      await storage.saveSessionAssumptions("SESSION2", [
        createTestAssumption({ id: "A-SESSION2-001", sessionId: "SESSION2" }),
      ]);

      const sessions = await storage.listSessions();

      expect(sessions).toHaveLength(2);
      expect(sessions).toContain("SESSION1");
      expect(sessions).toContain("SESSION2");
    });

    test("listSessions returns empty array when no sessions", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });

      const sessions = await storage.listSessions();

      expect(sessions).toEqual([]);
    });
  });

  describe("simple ID format (A1, A42) lookups", () => {
    test("getAssumptionById finds simple format ID A1", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      // Create assumption with simple ID format
      const assumption = createTestAssumption({ id: "A1", sessionId: "TEST" });
      await storage.saveSessionAssumptions("TEST", [assumption]);

      const result = await storage.getAssumptionById("A1");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("A1");
    });

    test("getAssumptionById finds simple format ID A42", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const assumption = createTestAssumption({ id: "A42", sessionId: "SESSION42" });
      await storage.saveSessionAssumptions("SESSION42", [assumption]);

      const result = await storage.getAssumptionById("A42");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("A42");
    });

    test("getAssumptionById finds simple ID across multiple sessions", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir, autoRebuildIndex: false });
      const session1Assumptions = [createTestAssumption({ id: "A1", sessionId: "SESSION1" })];
      const session2Assumptions = [
        createTestAssumption({ id: "A2", sessionId: "SESSION2" }),
        createTestAssumption({ id: "A3", sessionId: "SESSION2" }),
      ];
      await storage.saveSessionAssumptions("SESSION1", session1Assumptions);
      await storage.saveSessionAssumptions("SESSION2", session2Assumptions);

      const resultA1 = await storage.getAssumptionById("A1");
      const resultA2 = await storage.getAssumptionById("A2");
      const resultA3 = await storage.getAssumptionById("A3");

      expect(resultA1?.id).toBe("A1");
      expect(resultA2?.id).toBe("A2");
      expect(resultA3?.id).toBe("A3");
    });

    test("getAssumptionById returns null for non-existent simple ID", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const assumption = createTestAssumption({ id: "A1", sessionId: "TEST" });
      await storage.saveSessionAssumptions("TEST", [assumption]);

      const result = await storage.getAssumptionById("A999");

      expect(result).toBeNull();
    });

    test("deleteAssumption works with simple format IDs", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const assumption = createTestAssumption({ id: "A1", sessionId: "TEST" });
      await storage.saveSessionAssumptions("TEST", [assumption]);

      const deleted = await storage.deleteAssumption("A1");

      expect(deleted).toBe(true);
      const result = await storage.getAssumptionById("A1");
      expect(result).toBeNull();
    });

    test("saveAssumption updates simple format ID", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const assumption = createTestAssumption({ id: "A1", sessionId: "TEST" });
      await storage.saveAssumption(assumption);

      const updated = createTestAssumption({
        id: "A1",
        sessionId: "TEST",
        statement: "Updated simple format assumption.",
      });
      await storage.saveAssumption(updated);

      const result = await storage.getAssumptionById("A1");
      expect(result?.statement).toBe("Updated simple format assumption.");
    });

    test("getAffectedByFalsification works with simple format IDs", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const assumption = createTestAssumption({
        id: "A1",
        sessionId: "TEST",
        load: {
          affectedHypotheses: ["H-TEST-001"],
          affectedTests: ["T1", "T2"],
          description: "Dependencies with simple test IDs",
        },
      });
      await storage.saveAssumption(assumption);

      const affected = await storage.getAffectedByFalsification("A1");

      expect(affected.hypotheses).toEqual(["H-TEST-001"]);
      expect(affected.tests).toEqual(["T1", "T2"]);
    });
  });

  describe("error handling and edge cases", () => {
    test("loadSessionAssumptions returns empty array for malformed JSON", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir, autoRebuildIndex: false });
      const good = createTestAssumption({ sessionId: "GOOD", id: "A-GOOD-001" });
      await storage.saveSessionAssumptions("GOOD", [good]);

      // Create the directory structure
      const assumptionsDir = join(testDir, ".research", "assumptions");
      await fs.mkdir(assumptionsDir, { recursive: true });

      // Write invalid JSON
      const filePath = join(assumptionsDir, "MALFORMED-assumptions.json");
      await fs.writeFile(filePath, "{ invalid json }");

      const loaded = await storage.loadSessionAssumptions("MALFORMED");
      expect(loaded).toEqual([]);

      const index = await storage.rebuildIndex();
      expect(index.entries.map((e) => e.id)).toContain(good.id);
      expect(index.warnings?.some((w) => w.file.includes("MALFORMED-assumptions.json"))).toBe(true);
    });

    test("saveSessionAssumptions handles special characters in session ID", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const sessionId = "TEST/WITH\\SLASHES";
      const assumption = createTestAssumption({ sessionId });

      await storage.saveSessionAssumptions(sessionId, [assumption]);

      // Session ID should be sanitized in filename
      const sanitizedId = sessionId.replace(/[^a-zA-Z0-9_.-]/g, "_");
      const filePath = join(testDir, ".research", "assumptions", `${sanitizedId}-assumptions.json`);
      const exists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    test("saveSessionAssumptions preserves dots in session ID filenames", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const sessionId = "brenner_bot-5so.10.2.2";
      const assumption = createTestAssumption({ sessionId });

      await storage.saveSessionAssumptions(sessionId, [assumption]);

      const filePath = join(testDir, ".research", "assumptions", `${sessionId}-assumptions.json`);
      const exists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    test("rebuildIndex handles empty assumptions directory", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });

      const index = await storage.rebuildIndex();

      expect(index.entries).toEqual([]);
      expect(index.version).toBe("1.0.0");
    });

    test("rebuildIndex skips non-assumption files", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const assumptionsDir = join(testDir, ".research", "assumptions");
      await fs.mkdir(assumptionsDir, { recursive: true });

      // Create a non-assumption file
      await fs.writeFile(join(assumptionsDir, "other-file.json"), "{}");

      // Create a valid assumption file
      const assumption = createTestAssumption();
      await storage.saveSessionAssumptions("TEST", [assumption]);

      const index = await storage.rebuildIndex();

      expect(index.entries).toHaveLength(1);
    });

    test("getStatistics handles empty storage", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });

      const stats = await storage.getStatistics();

      expect(stats.total).toBe(0);
      expect(stats.sessionsWithAssumptions).toBe(0);
    });
  });

  describe("index consistency", () => {
    test("index reflects hasCalculation correctly", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const withCalc = createTestAssumption({
        id: "A-TEST-001",
        type: "scale_physics",
        calculation: createTestCalculation(),
      });
      const withoutCalc = createTestAssumption({
        id: "A-TEST-002",
        type: "scale_physics",
      });
      await storage.saveSessionAssumptions("TEST", [withCalc, withoutCalc]);

      const index = await storage.loadIndex();

      const entry1 = index.entries.find((e) => e.id === "A-TEST-001");
      const entry2 = index.entries.find((e) => e.id === "A-TEST-002");
      expect(entry1?.hasCalculation).toBe(true);
      expect(entry2?.hasCalculation).toBe(false);
    });

    test("index updates after delete", async () => {
      const storage = new AssumptionStorage({ baseDir: testDir });
      const assumptions = [
        createTestAssumption({ id: "A-TEST-001" }),
        createTestAssumption({ id: "A-TEST-002" }),
      ];
      await storage.saveSessionAssumptions("TEST", assumptions);

      await storage.deleteAssumption("A-TEST-001");
      const index = await storage.loadIndex();

      expect(index.entries).toHaveLength(1);
      expect(index.entries[0].id).toBe("A-TEST-002");
    });
  });

  // ============================================================================
  // Concurrency Tests
  // ============================================================================

  describe("Concurrency", () => {
    test("concurrent saveAssumption calls do not drop writes", async () => {
      const sessionId = "CONCURRENT";
      const assumptions = Array.from({ length: 10 }, (_, i) =>
        createTestAssumption({
          sessionId,
          id: `A-${sessionId}-${String(i + 1).padStart(3, "0")}`,
          statement: `Assumption ${i + 1}`,
        }),
      );

      const storage = new AssumptionStorage({ baseDir: testDir, autoRebuildIndex: false });
      await Promise.all(assumptions.map((a) => storage.saveAssumption(a)));

      const loaded = await storage.loadSessionAssumptions(sessionId);
      expect(loaded).toHaveLength(assumptions.length);

      const loadedIds = loaded.map((a) => a.id).sort();
      const expectedIds = assumptions.map((a) => a.id).sort();
      expect(loadedIds).toEqual(expectedIds);
    });
  });
});
