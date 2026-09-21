import { randomUUID } from "node:crypto";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestRecord, type TestRecord } from "../schemas/test-record";
import { type SessionTestFile, TestStorage } from "./test-storage";

// ============================================================================
// Test Helpers
// ============================================================================

async function createTempDir(): Promise<string> {
  const dir = join(tmpdir(), `test-storage-test-${randomUUID()}`);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function createTestTestRecord(sessionId: string, seq: number): TestRecord {
  return createTestRecord({
    id: `T-${sessionId}-${seq.toString().padStart(3, "0")}`,
    name: `Test ${seq} for session ${sessionId}`,
    procedure: `This is the detailed procedure for test ${seq} in session ${sessionId}. It involves multiple steps.`,
    discriminates: [`H-${sessionId}-001`, `H-${sessionId}-002`],
    expectedOutcomes: [
      {
        hypothesisId: `H-${sessionId}-001`,
        outcome: "Positive result if hypothesis 1 is true",
        resultType: "positive",
      },
      {
        hypothesisId: `H-${sessionId}-002`,
        outcome: "Negative result if hypothesis 2 is true",
        resultType: "negative",
      },
    ],
    potencyCheck: {
      positiveControl: "Include known activator as positive control to verify assay is working",
      sensitivityVerification: "Titration series to confirm detection threshold",
      timingValidation: "Time course to confirm optimal measurement window",
    },
    evidencePerWeekScore: {
      likelihoodRatio: 2,
      cost: 2,
      speed: 2,
      ambiguity: 2,
    },
    feasibility: {
      requirements: "Standard lab equipment and reagents",
      difficulty: "moderate",
    },
    designedInSession: sessionId,
  });
}

// ============================================================================
// Tests
// ============================================================================

describe("TestStorage", () => {
  let tempDir: string;
  let storage: TestStorage;

  beforeEach(async () => {
    tempDir = await createTempDir();
    storage = new TestStorage({ baseDir: tempDir });
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

  describe("saveTest / getTestById", () => {
    it("saves and retrieves a test", async () => {
      const test = createTestTestRecord("RS20251230", 1);
      await storage.saveTest(test);

      const retrieved = await storage.getTestById(test.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(test.id);
      expect(retrieved?.name).toBe(test.name);
    });

    it("updates existing test", async () => {
      const test = createTestTestRecord("RS20251230", 1);
      await storage.saveTest(test);

      const updated = { ...test, name: "Updated test name for this test" };
      await storage.saveTest(updated);

      const retrieved = await storage.getTestById(test.id);
      expect(retrieved?.name).toBe("Updated test name for this test");

      // Should still have only one test
      const all = await storage.loadSessionTests("RS20251230");
      expect(all).toHaveLength(1);
    });

    it("returns null for non-existent test", async () => {
      const retrieved = await storage.getTestById("T-NONEXISTENT-001");
      expect(retrieved).toBeNull();
    });

    it("returns null for invalid ID format", async () => {
      const retrieved = await storage.getTestById("invalid-id");
      expect(retrieved).toBeNull();
    });
  });

  describe("deleteTest", () => {
    it("deletes an existing test", async () => {
      const test = createTestTestRecord("RS20251230", 1);
      await storage.saveTest(test);

      const deleted = await storage.deleteTest(test.id);
      expect(deleted).toBe(true);

      const retrieved = await storage.getTestById(test.id);
      expect(retrieved).toBeNull();
    });

    it("returns false for non-existent test", async () => {
      const deleted = await storage.deleteTest("T-NONEXISTENT-001");
      expect(deleted).toBe(false);
    });

    it("returns true when test is found and filtered out in initial lookup", async () => {
      // This test verifies that deleteTest returns true when the test is found
      // in the initial lookup and successfully filtered out, even if subsequent
      // storage calls would return different results.
      const test = createTestTestRecord("RS20251230", 1);

      class FlakyStorage extends TestStorage {
        private calls = 0;

        // First call finds test, subsequent calls return empty
        override async loadSessionTests(sessionId: string) {
          void sessionId;
          this.calls++;
          return this.calls === 1 ? [test] : [];
        }
      }

      const flaky = new FlakyStorage({ baseDir: tempDir, autoRebuildIndex: false });
      const deleted = await flaky.deleteTest(test.id);
      // Returns true because the test was found and filtered in the first lookup
      expect(deleted).toBe(true);
    });
  });

  // ============================================================================
  // Session Operations Tests
  // ============================================================================

  describe("loadSessionTests / saveSessionTests", () => {
    it("returns empty array for non-existent session", async () => {
      const tests = await storage.loadSessionTests("NONEXISTENT");
      expect(tests).toEqual([]);
    });

    it("saves and loads multiple tests for a session", async () => {
      const test1 = createTestTestRecord("RS20251230", 1);
      const test2 = createTestTestRecord("RS20251230", 2);
      const test3 = createTestTestRecord("RS20251230", 3);

      await storage.saveSessionTests("RS20251230", [test1, test2, test3]);

      const loaded = await storage.loadSessionTests("RS20251230");
      expect(loaded).toHaveLength(3);
      expect(loaded.map((t) => t.id)).toContain(test1.id);
      expect(loaded.map((t) => t.id)).toContain(test2.id);
      expect(loaded.map((t) => t.id)).toContain(test3.id);
    });

    it("preserves createdAt when updating session file", async () => {
      const test = createTestTestRecord("RS20251230", 1);
      await storage.saveSessionTests("RS20251230", [test]);

      // Read the file to get createdAt
      const filePath = join(tempDir, ".research", "tests", "RS20251230-tests.json");
      const content1 = JSON.parse(await fs.readFile(filePath, "utf-8")) as SessionTestFile;
      const originalCreatedAt = content1.createdAt;

      // Wait a bit and update
      await new Promise((r) => setTimeout(r, 10));
      const test2 = createTestTestRecord("RS20251230", 2);
      await storage.saveSessionTests("RS20251230", [test, test2]);

      const content2 = JSON.parse(await fs.readFile(filePath, "utf-8")) as SessionTestFile;
      expect(content2.createdAt).toBe(originalCreatedAt);
      expect(new Date(content2.updatedAt).getTime()).toBeGreaterThan(
        new Date(originalCreatedAt).getTime(),
      );
    });

    it("returns empty array for malformed session file JSON", async () => {
      const good = createTestTestRecord("GOOD", 1);
      await storage.saveTest(good);

      await fs.mkdir(join(tempDir, ".research", "tests"), { recursive: true });
      await fs.writeFile(join(tempDir, ".research", "tests", "BAD-tests.json"), "not-json");

      const loaded = await storage.loadSessionTests("BAD");
      expect(loaded).toEqual([]);

      const index = await storage.rebuildIndex();
      expect(index.entries.map((e) => e.id)).toContain(good.id);
      expect(index.warnings?.some((w) => w.file.includes("BAD-tests.json"))).toBe(true);
    });

    it("returns empty array when tests field is not an array", async () => {
      await fs.mkdir(join(tempDir, ".research", "tests"), { recursive: true });
      await fs.writeFile(
        join(tempDir, ".research", "tests", "MALFORMED-tests.json"),
        JSON.stringify({ sessionId: "MALFORMED", createdAt: "2025-01-01", tests: "not-an-array" }),
      );

      const loaded = await storage.loadSessionTests("MALFORMED");
      expect(loaded).toEqual([]);
    });

    it("skips individual invalid test entries during load", async () => {
      const validTest = createTestTestRecord("MIXED", 1);
      await fs.mkdir(join(tempDir, ".research", "tests"), { recursive: true });
      await fs.writeFile(
        join(tempDir, ".research", "tests", "MIXED-tests.json"),
        JSON.stringify({
          sessionId: "MIXED",
          createdAt: "2025-01-01",
          updatedAt: "2025-01-01",
          tests: [
            validTest,
            { invalid: "entry", missing: "required fields" },
            { id: "also-invalid" },
          ],
        }),
      );

      const loaded = await storage.loadSessionTests("MIXED");
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe(validTest.id);
    });
  });

  // ============================================================================
  // Index Tests
  // ============================================================================

  describe("rebuildIndex / loadIndex", () => {
    it("builds index from session files", async () => {
      const test1 = createTestTestRecord("RS20251230", 1);
      const test2 = createTestTestRecord("RS20251231", 1);

      await storage.saveTest(test1);
      await storage.saveTest(test2);

      const index = await storage.loadIndex();
      expect(index.entries).toHaveLength(2);
      expect(index.entries.map((e) => e.id)).toContain(test1.id);
      expect(index.entries.map((e) => e.id)).toContain(test2.id);
    });

    it("rebuilds index when file is missing", async () => {
      const storageNoAuto = new TestStorage({ baseDir: tempDir, autoRebuildIndex: false });
      const test = createTestTestRecord("RS20251230", 1);
      await storageNoAuto.saveTest(test);

      // Should rebuild on load
      const index = await storageNoAuto.loadIndex();
      expect(index.entries).toHaveLength(1);
    });

    it("rebuilds index when index file is corrupted", async () => {
      const storageNoAuto = new TestStorage({ baseDir: tempDir, autoRebuildIndex: false });
      await storageNoAuto.saveTest(createTestTestRecord("RS20251230", 1));

      const indexPath = join(tempDir, ".research", "test-index.json");
      await fs.writeFile(indexPath, "not-json");

      const index = await storageNoAuto.loadIndex();
      expect(index.entries).toHaveLength(1);
    });

    it("rebuilds index when entries field is not an array", async () => {
      const storageNoAuto = new TestStorage({ baseDir: tempDir, autoRebuildIndex: false });
      await storageNoAuto.saveTest(createTestTestRecord("RS20251230", 1));

      const indexPath = join(tempDir, ".research", "test-index.json");
      await fs.writeFile(indexPath, JSON.stringify({ version: "1.0.0", entries: "not-array" }));

      const index = await storageNoAuto.loadIndex();
      expect(index.entries).toHaveLength(1);
      expect(Array.isArray(index.entries)).toBe(true);
    });

    it("records warning for session files with non-array tests field", async () => {
      await fs.mkdir(join(tempDir, ".research", "tests"), { recursive: true });
      await fs.writeFile(
        join(tempDir, ".research", "tests", "NOARRAY-tests.json"),
        JSON.stringify({ sessionId: "NOARRAY", tests: { not: "an-array" } }),
      );

      const index = await storage.rebuildIndex();
      expect(index.warnings?.some((w) => w.message.includes("missing tests[]"))).toBe(true);
    });

    it("records warning for session files with invalid test entries", async () => {
      await fs.mkdir(join(tempDir, ".research", "tests"), { recursive: true });
      await fs.writeFile(
        join(tempDir, ".research", "tests", "HASINVALID-tests.json"),
        JSON.stringify({
          sessionId: "HASINVALID",
          createdAt: "2025-01-01",
          updatedAt: "2025-01-01",
          tests: [{ invalid: "test1" }, { invalid: "test2" }],
        }),
      );

      const index = await storage.rebuildIndex();
      expect(index.warnings?.some((w) => w.message.includes("Skipped 2 invalid tests"))).toBe(true);
    });

    it("includes discriminates information in index", async () => {
      const test = createTestTestRecord("RS20251230", 1);
      await storage.saveTest(test);

      const index = await storage.loadIndex();
      const entry = index.entries.find((e) => e.id === test.id);
      expect(entry?.discriminates).toHaveLength(2);
      expect(entry?.discriminates).toContain("H-RS20251230-001");
      expect(entry?.discriminates).toContain("H-RS20251230-002");
    });

    it("calculates evidence-per-week total in index", async () => {
      const test = createTestTestRecord("RS20251230", 1);
      await storage.saveTest(test);

      const index = await storage.loadIndex();
      const entry = index.entries.find((e) => e.id === test.id);
      expect(entry?.evidencePerWeekTotal).toBe(8); // 2+2+2+2
    });
  });

  // ============================================================================
  // Query by Status Tests
  // ============================================================================

  describe("getTestsByStatus", () => {
    it("filters by status", async () => {
      const designed = createTestTestRecord("RS20251230", 1);
      const completed = { ...createTestTestRecord("RS20251230", 2), status: "completed" as const };
      const blocked = { ...createTestTestRecord("RS20251230", 3), status: "blocked" as const };

      await storage.saveTest(designed);
      await storage.saveTest(completed);
      await storage.saveTest(blocked);

      const designedTests = await storage.getTestsByStatus("designed");
      expect(designedTests).toHaveLength(1);
      expect(designedTests[0].id).toBe(designed.id);

      const completedTests = await storage.getTestsByStatus("completed");
      expect(completedTests).toHaveLength(1);
      expect(completedTests[0].id).toBe(completed.id);

      const blockedTests = await storage.getTestsByStatus("blocked");
      expect(blockedTests).toHaveLength(1);
      expect(blockedTests[0].id).toBe(blocked.id);
    });
  });

  describe("getDesignedTests", () => {
    it("returns only designed tests", async () => {
      const designed1 = createTestTestRecord("RS20251230", 1);
      const designed2 = createTestTestRecord("RS20251231", 1);
      const completed = { ...createTestTestRecord("RS20251230", 2), status: "completed" as const };

      await storage.saveTest(designed1);
      await storage.saveTest(designed2);
      await storage.saveTest(completed);

      const designed = await storage.getDesignedTests();
      expect(designed).toHaveLength(2);
    });
  });

  describe("getBlockedTests", () => {
    it("returns only blocked tests", async () => {
      const blocked = { ...createTestTestRecord("RS20251230", 1), status: "blocked" as const };
      const designed = createTestTestRecord("RS20251230", 2);

      await storage.saveTest(blocked);
      await storage.saveTest(designed);

      const blockedTests = await storage.getBlockedTests();
      expect(blockedTests).toHaveLength(1);
      expect(blockedTests[0].id).toBe(blocked.id);
    });
  });

  describe("getDesignedButNotExecutedTests", () => {
    it("returns tests without execution records", async () => {
      const notExecuted = createTestTestRecord("RS20251230", 1);
      const executed = {
        ...createTestTestRecord("RS20251230", 2),
        status: "completed" as const,
        execution: {
          startedAt: "2025-12-30T10:00:00Z",
          completedAt: "2025-12-30T12:00:00Z",
          observedOutcome: "Positive result observed",
          potencyCheckPassed: true,
        },
      };

      await storage.saveTest(notExecuted);
      await storage.saveTest(executed);

      const notExecutedTests = await storage.getDesignedButNotExecutedTests();
      expect(notExecutedTests).toHaveLength(1);
      expect(notExecutedTests[0].id).toBe(notExecuted.id);
    });
  });

  // ============================================================================
  // Query by Hypothesis Tests
  // ============================================================================

  describe("getTestsForHypothesis", () => {
    it("finds tests discriminating a hypothesis", async () => {
      const test1 = createTestTestRecord("RS20251230", 1); // discriminates H-RS20251230-001, H-RS20251230-002
      const test2 = createTestRecord({
        id: "T-RS20251230-002",
        name: "Test targeting different hypotheses",
        procedure: "Detailed procedure for this alternative test design",
        discriminates: ["H-RS20251230-003", "H-RS20251230-004"],
        expectedOutcomes: [
          { hypothesisId: "H-RS20251230-003", outcome: "Outcome A" },
          { hypothesisId: "H-RS20251230-004", outcome: "Outcome B" },
        ],
        potencyCheck: {
          positiveControl: "Standard positive control for verification",
        },
        evidencePerWeekScore: { likelihoodRatio: 2, cost: 2, speed: 2, ambiguity: 2 },
        feasibility: { requirements: "Lab equipment", difficulty: "moderate" },
        designedInSession: "RS20251230",
      });

      await storage.saveTest(test1);
      await storage.saveTest(test2);

      const forH001 = await storage.getTestsForHypothesis("H-RS20251230-001");
      expect(forH001).toHaveLength(1);
      expect(forH001[0].id).toBe(test1.id);

      const forH003 = await storage.getTestsForHypothesis("H-RS20251230-003");
      expect(forH003).toHaveLength(1);
      expect(forH003[0].id).toBe(test2.id);

      const forNonexistent = await storage.getTestsForHypothesis("H-NONEXISTENT-001");
      expect(forNonexistent).toHaveLength(0);
    });
  });

  describe("getTestsForPrediction", () => {
    it("finds tests addressing a prediction", async () => {
      const test = {
        ...createTestTestRecord("RS20251230", 1),
        addressesPredictions: ["P-RS20251230-001", "P-RS20251230-002"],
      };

      await storage.saveTest(test);

      const forP001 = await storage.getTestsForPrediction("P-RS20251230-001");
      expect(forP001).toHaveLength(1);
      expect(forP001[0].id).toBe(test.id);
    });
  });

  // ============================================================================
  // Query by Quality Tests
  // ============================================================================

  describe("getTestsMissingPotencyCheck", () => {
    it("finds tests with weak potency checks", async () => {
      const withPotency = createTestTestRecord("RS20251230", 1);
      const weakPotency = createTestRecord({
        id: "T-RS20251230-002",
        name: "Test with weak potency check",
        procedure: "This procedure is valid, but the potency check is too short to be useful.",
        discriminates: ["H-RS20251230-001", "H-RS20251230-002"],
        expectedOutcomes: [
          { hypothesisId: "H-RS20251230-001", outcome: "Outcome A" },
          { hypothesisId: "H-RS20251230-002", outcome: "Outcome B" },
        ],
        potencyCheck: {
          positiveControl: "Control",
        },
        evidencePerWeekScore: { likelihoodRatio: 2, cost: 2, speed: 2, ambiguity: 2 },
        feasibility: { requirements: "Lab equipment", difficulty: "moderate" },
        designedInSession: "RS20251230",
      });

      await storage.saveTest(withPotency);
      await storage.saveTest(weakPotency);

      const missing = await storage.getTestsMissingPotencyCheck();
      expect(missing).toHaveLength(1);
      expect(missing[0].id).toBe(weakPotency.id);
    });
  });

  describe("getHighQualityTests", () => {
    it("finds tests with high evidence-per-week scores", async () => {
      const highQuality = createTestRecord({
        id: "T-RS20251230-001",
        name: "High quality test with excellent scores",
        procedure: "This is a high quality test procedure with all components",
        discriminates: ["H-RS20251230-001", "H-RS20251230-002"],
        expectedOutcomes: [
          { hypothesisId: "H-RS20251230-001", outcome: "Clear positive result" },
          { hypothesisId: "H-RS20251230-002", outcome: "Clear negative result" },
        ],
        potencyCheck: {
          positiveControl: "Well-characterized positive control for validation",
        },
        evidencePerWeekScore: { likelihoodRatio: 3, cost: 3, speed: 3, ambiguity: 2 }, // Total: 11
        feasibility: { requirements: "Standard equipment", difficulty: "easy" },
        designedInSession: "RS20251230",
      });
      const lowQuality = createTestTestRecord("RS20251230", 2); // Total: 8

      await storage.saveTest(highQuality);
      await storage.saveTest(lowQuality);

      const highTests = await storage.getHighQualityTests();
      expect(highTests).toHaveLength(1);
      expect(highTests[0].id).toBe(highQuality.id);
    });
  });

  describe("getLowQualityTests", () => {
    it("finds tests with low evidence-per-week scores", async () => {
      const lowQuality = createTestRecord({
        id: "T-RS20251230-001",
        name: "Low quality test with poor scores",
        procedure: "This is a low quality test with many issues and problems",
        discriminates: ["H-RS20251230-001", "H-RS20251230-002"],
        expectedOutcomes: [
          { hypothesisId: "H-RS20251230-001", outcome: "Ambiguous result" },
          { hypothesisId: "H-RS20251230-002", outcome: "Another ambiguous result" },
        ],
        potencyCheck: {
          positiveControl: "Basic positive control but not comprehensive",
        },
        evidencePerWeekScore: { likelihoodRatio: 1, cost: 1, speed: 1, ambiguity: 1 }, // Total: 4
        feasibility: { requirements: "Specialized equipment", difficulty: "very_hard" },
        designedInSession: "RS20251230",
      });
      const mediumQuality = createTestTestRecord("RS20251230", 2); // Total: 8

      await storage.saveTest(lowQuality);
      await storage.saveTest(mediumQuality);

      const lowTests = await storage.getLowQualityTests();
      expect(lowTests).toHaveLength(1);
      expect(lowTests[0].id).toBe(lowQuality.id);
    });
  });

  // ============================================================================
  // Execution Query Tests
  // ============================================================================

  describe("getExecutedTests", () => {
    it("returns tests with execution records", async () => {
      const executed = {
        ...createTestTestRecord("RS20251230", 1),
        status: "completed" as const,
        execution: {
          startedAt: "2025-12-30T10:00:00Z",
          observedOutcome: "Positive result observed in the experiment",
          potencyCheckPassed: true,
        },
      };
      const notExecuted = createTestTestRecord("RS20251230", 2);

      await storage.saveTest(executed);
      await storage.saveTest(notExecuted);

      const executedTests = await storage.getExecutedTests();
      expect(executedTests).toHaveLength(1);
      expect(executedTests[0].id).toBe(executed.id);
    });
  });

  describe("getTestsMatchingHypothesis", () => {
    it("finds tests whose execution matched a hypothesis", async () => {
      const matchedH001 = {
        ...createTestTestRecord("RS20251230", 1),
        status: "completed" as const,
        execution: {
          startedAt: "2025-12-30T10:00:00Z",
          observedOutcome: "Result matches hypothesis 1",
          potencyCheckPassed: true,
          matchedHypothesisId: "H-RS20251230-001",
        },
      };
      const matchedH002 = {
        ...createTestTestRecord("RS20251230", 2),
        status: "completed" as const,
        execution: {
          startedAt: "2025-12-30T11:00:00Z",
          observedOutcome: "Result matches hypothesis 2",
          potencyCheckPassed: true,
          matchedHypothesisId: "H-RS20251230-002",
        },
      };

      await storage.saveTest(matchedH001);
      await storage.saveTest(matchedH002);

      const forH001 = await storage.getTestsMatchingHypothesis("H-RS20251230-001");
      expect(forH001).toHaveLength(1);
      expect(forH001[0].id).toBe(matchedH001.id);
    });
  });

  describe("getTestsWithFailedPotency", () => {
    it("finds tests where potency check failed", async () => {
      const failed = {
        ...createTestTestRecord("RS20251230", 1),
        status: "completed" as const,
        execution: {
          startedAt: "2025-12-30T10:00:00Z",
          observedOutcome: "No signal - potency check failed",
          potencyCheckPassed: false,
          potencyCheckNotes: "Positive control showed no signal",
        },
      };
      const passed = {
        ...createTestTestRecord("RS20251230", 2),
        status: "completed" as const,
        execution: {
          startedAt: "2025-12-30T11:00:00Z",
          observedOutcome: "Clear result observed",
          potencyCheckPassed: true,
        },
      };

      await storage.saveTest(failed);
      await storage.saveTest(passed);

      const failedTests = await storage.getTestsWithFailedPotency();
      expect(failedTests).toHaveLength(1);
      expect(failedTests[0].id).toBe(failed.id);
    });
  });

  // ============================================================================
  // Designer Query Tests
  // ============================================================================

  describe("getTestsByDesigner", () => {
    it("finds tests by designer", async () => {
      const byAlice = { ...createTestTestRecord("RS20251230", 1), designedBy: "Alice" };
      const byBob = { ...createTestTestRecord("RS20251230", 2), designedBy: "Bob" };

      await storage.saveTest(byAlice);
      await storage.saveTest(byBob);

      const aliceTests = await storage.getTestsByDesigner("Alice");
      expect(aliceTests).toHaveLength(1);
      expect(aliceTests[0].id).toBe(byAlice.id);

      const bobTests = await storage.getTestsByDesigner("Bob");
      expect(bobTests).toHaveLength(1);
      expect(bobTests[0].id).toBe(byBob.id);
    });
  });

  // ============================================================================
  // Statistics Tests
  // ============================================================================

  describe("getStatistics", () => {
    it("returns correct statistics", async () => {
      await storage.saveTest(createTestTestRecord("RS20251230", 1));
      await storage.saveTest({
        ...createTestTestRecord("RS20251230", 2),
        status: "completed" as const,
        execution: {
          startedAt: "2025-12-30T10:00:00Z",
          observedOutcome: "Result observed",
          potencyCheckPassed: true,
        },
      });
      await storage.saveTest({
        ...createTestTestRecord("RS20251231", 1),
        status: "blocked" as const,
      });

      const stats = await storage.getStatistics();

      expect(stats.total).toBe(3);
      expect(stats.byStatus.designed).toBe(1);
      expect(stats.byStatus.completed).toBe(1);
      expect(stats.byStatus.blocked).toBe(1);
      expect(stats.executed).toBe(1);
      expect(stats.potencyCheckCoverage).toBe(1); // All have potency checks
      expect(stats.avgEvidencePerWeekScore).toBe(8); // All tests have 2+2+2+2=8
      expect(stats.sessionsWithTests).toBe(2);
    });
  });

  describe("getHypothesisCoverage", () => {
    it("counts tests per hypothesis", async () => {
      const test1 = createTestTestRecord("RS20251230", 1); // H-RS20251230-001, H-RS20251230-002
      const test2 = createTestRecord({
        id: "T-RS20251230-002",
        name: "Another test",
        procedure: "Test procedure for additional hypothesis coverage",
        discriminates: ["H-RS20251230-001", "H-RS20251230-003"],
        expectedOutcomes: [
          { hypothesisId: "H-RS20251230-001", outcome: "Outcome A" },
          { hypothesisId: "H-RS20251230-003", outcome: "Outcome B" },
        ],
        potencyCheck: { positiveControl: "Standard positive control verification" },
        evidencePerWeekScore: { likelihoodRatio: 2, cost: 2, speed: 2, ambiguity: 2 },
        feasibility: { requirements: "Lab equipment", difficulty: "moderate" },
        designedInSession: "RS20251230",
      });

      await storage.saveTest(test1);
      await storage.saveTest(test2);

      const coverage = await storage.getHypothesisCoverage();
      expect(coverage.get("H-RS20251230-001")).toBe(2); // Covered by both tests
      expect(coverage.get("H-RS20251230-002")).toBe(1); // Only test1
      expect(coverage.get("H-RS20251230-003")).toBe(1); // Only test2
    });
  });

  describe("getUncoveredHypotheses", () => {
    it("finds hypotheses without tests", async () => {
      const test = createTestTestRecord("RS20251230", 1); // H-RS20251230-001, H-RS20251230-002
      await storage.saveTest(test);

      const allHypotheses = [
        "H-RS20251230-001",
        "H-RS20251230-002",
        "H-RS20251230-003",
        "H-RS20251230-004",
      ];

      const uncovered = await storage.getUncoveredHypotheses(allHypotheses);
      expect(uncovered).toHaveLength(2);
      expect(uncovered).toContain("H-RS20251230-003");
      expect(uncovered).toContain("H-RS20251230-004");
    });
  });

  // ============================================================================
  // Bulk Operations Tests
  // ============================================================================

  describe("getAllTests", () => {
    it("returns all tests across sessions", async () => {
      await storage.saveTest(createTestTestRecord("RS20251230", 1));
      await storage.saveTest(createTestTestRecord("RS20251230", 2));
      await storage.saveTest(createTestTestRecord("RS20251231", 1));

      const all = await storage.getAllTests();
      expect(all).toHaveLength(3);
    });

    it("returns empty array when no tests exist", async () => {
      const all = await storage.getAllTests();
      expect(all).toEqual([]);
    });
  });

  describe("listSessions", () => {
    it("lists all sessions with tests", async () => {
      await storage.saveTest(createTestTestRecord("RS20251230", 1));
      await storage.saveTest(createTestTestRecord("RS20251231", 1));
      await storage.saveTest(createTestTestRecord("CELL-FATE-001", 1));

      const sessions = await storage.listSessions();
      expect(sessions).toHaveLength(3);
      expect(sessions).toContain("RS20251230");
      expect(sessions).toContain("RS20251231");
      expect(sessions).toContain("CELL-FATE-001");
    });

    it("ignores non-matching files in the tests directory", async () => {
      await fs.mkdir(join(tempDir, ".research", "tests"), { recursive: true });
      await fs.writeFile(join(tempDir, ".research", "tests", "NOT_A_SESSION.json"), "{}");

      const sessions = await storage.listSessions();
      expect(sessions).toEqual([]);
    });
  });

  describe("getTestsByPriority", () => {
    it("returns tests sorted by priority", async () => {
      const lowPriority = { ...createTestTestRecord("RS20251230", 1), priority: 10 };
      const highPriority = { ...createTestTestRecord("RS20251230", 2), priority: 1 };
      const mediumPriority = { ...createTestTestRecord("RS20251230", 3), priority: 5 };
      const noPriority = createTestTestRecord("RS20251230", 4); // No priority

      await storage.saveTest(lowPriority);
      await storage.saveTest(highPriority);
      await storage.saveTest(mediumPriority);
      await storage.saveTest(noPriority);

      const prioritized = await storage.getTestsByPriority();
      expect(prioritized).toHaveLength(3); // Excludes noPriority
      expect(prioritized[0].id).toBe(highPriority.id);
      expect(prioritized[1].id).toBe(mediumPriority.id);
      expect(prioritized[2].id).toBe(lowPriority.id);
    });
  });

  describe("getNextTestToExecute", () => {
    it("returns highest priority ready test", async () => {
      const ready1 = {
        ...createTestTestRecord("RS20251230", 1),
        status: "ready" as const,
        priority: 5,
      };
      const ready2 = {
        ...createTestTestRecord("RS20251230", 2),
        status: "ready" as const,
        priority: 1,
      };
      const designed = createTestTestRecord("RS20251230", 3); // Not ready

      await storage.saveTest(ready1);
      await storage.saveTest(ready2);
      await storage.saveTest(designed);

      const next = await storage.getNextTestToExecute();
      expect(next).not.toBeNull();
      expect(next?.id).toBe(ready2.id); // Higher priority (lower number)
    });

    it("returns null when no ready tests", async () => {
      const designed = createTestTestRecord("RS20251230", 1);
      await storage.saveTest(designed);

      const next = await storage.getNextTestToExecute();
      expect(next).toBeNull();
    });

    it("breaks priority ties by createdAt timestamp", async () => {
      const readyEarlier = {
        ...createTestTestRecord("RS20251230", 1),
        status: "ready" as const,
        priority: 1,
        createdAt: "2025-01-01T00:00:00Z",
      };
      const readyLater = {
        ...createTestTestRecord("RS20251230", 2),
        status: "ready" as const,
        priority: 1,
        createdAt: "2025-01-02T00:00:00Z",
      };

      await storage.saveTest(readyLater);
      await storage.saveTest(readyEarlier);

      const next = await storage.getNextTestToExecute();
      expect(next?.id).toBe(readyEarlier.id);
    });
  });

  // ============================================================================
  // Concurrency Tests
  // ============================================================================

  describe("Concurrency", () => {
    it("concurrent saveTest calls do not drop writes", async () => {
      const sessionId = "CONCURRENT";
      const tests = Array.from({ length: 10 }, (_, i) => createTestTestRecord(sessionId, i + 1));

      const concurrencyStorage = new TestStorage({ baseDir: tempDir, autoRebuildIndex: false });
      await Promise.all(tests.map((t) => concurrencyStorage.saveTest(t)));

      const loaded = await concurrencyStorage.loadSessionTests(sessionId);
      expect(loaded).toHaveLength(tests.length);

      const loadedIds = loaded.map((t) => t.id).sort();
      const expectedIds = tests.map((t) => t.id).sort();
      expect(loadedIds).toEqual(expectedIds);
    });
  });
});
