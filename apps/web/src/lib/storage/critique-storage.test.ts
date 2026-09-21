import { randomUUID } from "node:crypto";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  acceptCritique,
  addressCritique,
  type Critique,
  createCritique,
  createFramingCritique,
  createHypothesisCritique,
  createTestCritique,
  dismissCritique,
} from "../schemas/critique";
import { CritiqueStorage, type SessionCritiqueFile } from "./critique-storage";

/**
 * Tests for Critique Storage Layer
 *
 * @see brenner_bot-f5wy.2 (bead)
 */

// ============================================================================
// Test Helpers
// ============================================================================

let testDir: string;
let storage: CritiqueStorage;

async function createTestCritiqueData(
  overrides: Partial<{
    id: string;
    sessionId: string;
    targetType: "hypothesis" | "test" | "assumption" | "framing" | "methodology";
    targetId: string;
    severity: "minor" | "moderate" | "serious" | "critical";
    status: "active" | "addressed" | "dismissed" | "accepted";
  }> = {},
): Promise<Critique> {
  const sessionId = overrides.sessionId ?? "TEST";
  const id = overrides.id ?? `C-${sessionId}-001`;
  const targetType = overrides.targetType ?? "hypothesis";

  // Generate appropriate targetId based on targetType if not provided
  let targetId: string | undefined;
  if (overrides.targetId !== undefined) {
    targetId = overrides.targetId;
  } else if (targetType === "framing" || targetType === "methodology") {
    targetId = undefined;
  } else if (targetType === "hypothesis") {
    targetId = `H-${sessionId}-001`;
  } else if (targetType === "test") {
    targetId = `T-${sessionId}-001`;
  } else if (targetType === "assumption") {
    targetId = `A-${sessionId}-001`;
  }

  return createCritique({
    id,
    targetType,
    targetId,
    attack: "This is a substantive attack on the target",
    evidenceToConfirm: "Evidence that would confirm this critique",
    severity: overrides.severity ?? "moderate",
    sessionId,
  });
}

beforeEach(async () => {
  // Create a unique temp directory for each test
  testDir = join(tmpdir(), `critique-storage-test-${randomUUID()}`);
  await fs.mkdir(testDir, { recursive: true });
  storage = new CritiqueStorage({ baseDir: testDir, autoRebuildIndex: false });
});

afterEach(async () => {
  // Clean up temp directory to avoid inode exhaustion
  if (testDir) {
    await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
  }
});

// ============================================================================
// Session File Operations Tests
// ============================================================================

describe("Session File Operations", () => {
  test("saves and loads critiques for a session", async () => {
    const critique1 = await createTestCritiqueData({ id: "C-TEST-001" });
    const critique2 = await createTestCritiqueData({ id: "C-TEST-002" });

    await storage.saveSessionCritiques("TEST", [critique1, critique2]);
    const loaded = await storage.loadSessionCritiques("TEST");

    expect(loaded).toHaveLength(2);
    expect(loaded[0].id).toBe("C-TEST-001");
    expect(loaded[1].id).toBe("C-TEST-002");
  });

  test("returns empty array for non-existent session", async () => {
    const loaded = await storage.loadSessionCritiques("NONEXISTENT");
    expect(loaded).toHaveLength(0);
  });

  test("returns empty array for malformed session file JSON", async () => {
    const good = await createTestCritiqueData({ id: "C-GOOD-001", sessionId: "GOOD" });
    await storage.saveSessionCritiques("GOOD", [good]);

    await fs.mkdir(join(testDir, ".research", "critiques"), { recursive: true });
    await fs.writeFile(join(testDir, ".research", "critiques", "BAD-critiques.json"), "not-json");

    const loaded = await storage.loadSessionCritiques("BAD");
    expect(loaded).toEqual([]);

    const index = await storage.rebuildIndex();
    expect(index.entries.map((e) => e.id)).toContain(good.id);
    expect(index.warnings?.some((w) => w.file.includes("BAD-critiques.json"))).toBe(true);
  });

  test("preserves createdAt on update", async () => {
    const critique = await createTestCritiqueData();
    await storage.saveSessionCritiques("TEST", [critique]);

    // Read file to get createdAt
    const filePath = join(testDir, ".research", "critiques", "TEST-critiques.json");
    const content1 = JSON.parse(await fs.readFile(filePath, "utf-8")) as SessionCritiqueFile;
    const originalCreatedAt = content1.createdAt;

    // Wait a bit and update
    await new Promise((r) => setTimeout(r, 10));
    const updatedCritique = { ...critique, notes: "Updated" };
    await storage.saveSessionCritiques("TEST", [updatedCritique]);

    const content2 = JSON.parse(await fs.readFile(filePath, "utf-8")) as SessionCritiqueFile;
    expect(content2.createdAt).toBe(originalCreatedAt);
    expect(content2.updatedAt).not.toBe(content2.createdAt);
  });
});

// ============================================================================
// Individual Critique Operations Tests
// ============================================================================

describe("Individual Critique Operations", () => {
  test("getCritiqueById returns critique when found", async () => {
    const critique = await createTestCritiqueData({ id: "C-TEST-001" });
    await storage.saveSessionCritiques("TEST", [critique]);

    const found = await storage.getCritiqueById("C-TEST-001");
    expect(found).not.toBeNull();
    expect(found?.id).toBe("C-TEST-001");
  });

  test("getCritiqueById returns null for invalid ID format", async () => {
    const found = await storage.getCritiqueById("invalid-id");
    expect(found).toBeNull();
  });

  test("getCritiqueById returns null when not found", async () => {
    const found = await storage.getCritiqueById("C-TEST-999");
    expect(found).toBeNull();
  });

  test("saveCritique creates new critique", async () => {
    const critique = await createTestCritiqueData();
    await storage.saveCritique(critique);

    const found = await storage.getCritiqueById(critique.id);
    expect(found).not.toBeNull();
  });

  test("saveCritique updates existing critique", async () => {
    const critique = await createTestCritiqueData();
    await storage.saveCritique(critique);

    const updated = { ...critique, notes: "Updated notes" };
    await storage.saveCritique(updated);

    const found = await storage.getCritiqueById(critique.id);
    expect(found?.notes).toBe("Updated notes");

    // Verify only one critique exists
    const all = await storage.loadSessionCritiques("TEST");
    expect(all).toHaveLength(1);
  });

  test("deleteCritique removes critique", async () => {
    const critique = await createTestCritiqueData();
    await storage.saveCritique(critique);

    const deleted = await storage.deleteCritique(critique.id);
    expect(deleted).toBe(true);

    const found = await storage.getCritiqueById(critique.id);
    expect(found).toBeNull();
  });

  test("deleteCritique returns false for non-existent critique", async () => {
    const deleted = await storage.deleteCritique("C-TEST-999");
    expect(deleted).toBe(false);
  });
});

// ============================================================================
// Index Operations Tests
// ============================================================================

describe("Index Operations", () => {
  test("rebuildIndex creates index from session files", async () => {
    const critique1 = await createTestCritiqueData({ id: "C-S1-001", sessionId: "S1" });
    const critique2 = await createTestCritiqueData({ id: "C-S2-001", sessionId: "S2" });

    await storage.saveSessionCritiques("S1", [critique1]);
    await storage.saveSessionCritiques("S2", [critique2]);

    const index = await storage.rebuildIndex();

    expect(index.entries).toHaveLength(2);
    expect(index.entries.map((e) => e.id)).toContain("C-S1-001");
    expect(index.entries.map((e) => e.id)).toContain("C-S2-001");
  });

  test("loadIndex rebuilds if missing", async () => {
    const critique = await createTestCritiqueData();
    await storage.saveSessionCritiques("TEST", [critique]);

    const index = await storage.loadIndex();
    expect(index.entries).toHaveLength(1);
  });

  test("loadIndex rebuilds if index file is malformed", async () => {
    const critique = await createTestCritiqueData();
    await storage.saveSessionCritiques("TEST", [critique]);

    const indexPath = join(testDir, ".research", "critique-index.json");
    await fs.writeFile(indexPath, "not-json");

    const index = await storage.loadIndex();
    expect(index.entries).toHaveLength(1);
  });

  test("loadIndex returns existing index", async () => {
    const critique = await createTestCritiqueData();
    await storage.saveSessionCritiques("TEST", [critique]);
    await storage.rebuildIndex();

    const index = await storage.loadIndex();
    expect(index.entries).toHaveLength(1);
    expect(index.version).toBe("1.0.0");
  });

  test("index entries contain correct metadata", async () => {
    const critique = createHypothesisCritique({
      id: "C-TEST-001",
      hypothesisId: "H-TEST-001",
      attack: "This hypothesis is fundamentally flawed",
      evidenceToConfirm: "Evidence that would confirm this",
      severity: "critical",
      sessionId: "TEST",
      raisedBy: "TestAgent",
      proposedAlternative: {
        description: "An alternative explanation",
        testable: true,
      },
    });

    await storage.saveCritique(critique);
    const index = await storage.rebuildIndex();

    expect(index.entries).toHaveLength(1);
    const entry = index.entries[0];
    expect(entry.targetType).toBe("hypothesis");
    expect(entry.targetId).toBe("H-TEST-001");
    expect(entry.status).toBe("active");
    expect(entry.severity).toBe("critical");
    expect(entry.hasProposedAlternative).toBe(true);
    expect(entry.raisedBy).toBe("TestAgent");
  });
});

// ============================================================================
// Query Operations - By Status Tests
// ============================================================================

describe("Query by Status", () => {
  beforeEach(async () => {
    // Set up test data with different statuses
    const active = await createTestCritiqueData({ id: "C-TEST-001" });
    const addressed = addressCritique(await createTestCritiqueData({ id: "C-TEST-002" }), {
      text: "This has been addressed",
    });
    const dismissed = dismissCritique(
      await createTestCritiqueData({ id: "C-TEST-003" }),
      "Invalid critique",
    );
    const accepted = acceptCritique(
      await createTestCritiqueData({ id: "C-TEST-004" }),
      "modified",
      "Changes have been made",
    );

    await storage.saveSessionCritiques("TEST", [active, addressed, dismissed, accepted]);
    await storage.rebuildIndex();
  });

  test("getActiveCritiques returns only active critiques", async () => {
    const active = await storage.getActiveCritiques();
    expect(active).toHaveLength(1);
    expect(active[0].status).toBe("active");
  });

  test("getAddressedCritiques returns only addressed critiques", async () => {
    const addressed = await storage.getAddressedCritiques();
    expect(addressed).toHaveLength(1);
    expect(addressed[0].status).toBe("addressed");
  });

  test("getDismissedCritiques returns only dismissed critiques", async () => {
    const dismissed = await storage.getDismissedCritiques();
    expect(dismissed).toHaveLength(1);
    expect(dismissed[0].status).toBe("dismissed");
  });

  test("getAcceptedCritiques returns only accepted critiques", async () => {
    const accepted = await storage.getAcceptedCritiques();
    expect(accepted).toHaveLength(1);
    expect(accepted[0].status).toBe("accepted");
  });
});

// ============================================================================
// Query Operations - By Severity Tests
// ============================================================================

describe("Query by Severity", () => {
  beforeEach(async () => {
    const minor = await createTestCritiqueData({ id: "C-TEST-001", severity: "minor" });
    const moderate = await createTestCritiqueData({ id: "C-TEST-002", severity: "moderate" });
    const serious = await createTestCritiqueData({ id: "C-TEST-003", severity: "serious" });
    const critical = await createTestCritiqueData({ id: "C-TEST-004", severity: "critical" });

    await storage.saveSessionCritiques("TEST", [minor, moderate, serious, critical]);
    await storage.rebuildIndex();
  });

  test("getCriticalCritiques returns only critical critiques", async () => {
    const critical = await storage.getCriticalCritiques();
    expect(critical).toHaveLength(1);
    expect(critical[0].severity).toBe("critical");
  });

  test("getSeriousCritiques returns only serious critiques", async () => {
    const serious = await storage.getSeriousCritiques();
    expect(serious).toHaveLength(1);
    expect(serious[0].severity).toBe("serious");
  });

  test("getCritiquesBySeverity works for all severity levels", async () => {
    expect(await storage.getCritiquesBySeverity("minor")).toHaveLength(1);
    expect(await storage.getCritiquesBySeverity("moderate")).toHaveLength(1);
    expect(await storage.getCritiquesBySeverity("serious")).toHaveLength(1);
    expect(await storage.getCritiquesBySeverity("critical")).toHaveLength(1);
  });
});

// ============================================================================
// Query Operations - By Target Tests
// ============================================================================

describe("Query by Target", () => {
  beforeEach(async () => {
    const h1Critique = createHypothesisCritique({
      id: "C-TEST-001",
      hypothesisId: "H-TEST-001",
      attack: "Attack on hypothesis 1",
      evidenceToConfirm: "Evidence that would confirm this critique",
      severity: "moderate",
      sessionId: "TEST",
    });

    const h2Critique = createHypothesisCritique({
      id: "C-TEST-002",
      hypothesisId: "H-TEST-002",
      attack: "Attack on hypothesis 2",
      evidenceToConfirm: "Evidence that would confirm this critique",
      severity: "serious",
      sessionId: "TEST",
    });

    const testCritique = createTestCritique({
      id: "C-TEST-003",
      testId: "T-TEST-001",
      attack: "Attack on test design",
      evidenceToConfirm: "Evidence that would confirm this critique",
      severity: "moderate",
      sessionId: "TEST",
    });

    const framingCritique = createFramingCritique({
      id: "C-TEST-004",
      attack: "Attack on the research framing",
      evidenceToConfirm: "Evidence that would confirm this critique",
      severity: "critical",
      sessionId: "TEST",
    });

    await storage.saveSessionCritiques("TEST", [
      h1Critique,
      h2Critique,
      testCritique,
      framingCritique,
    ]);
    await storage.rebuildIndex();
  });

  test("getCritiquesForHypothesis returns critiques for specific hypothesis", async () => {
    const critiques = await storage.getCritiquesForHypothesis("H-TEST-001");
    expect(critiques).toHaveLength(1);
    expect(critiques[0].targetId).toBe("H-TEST-001");
  });

  test("getCritiquesForTest returns critiques for specific test", async () => {
    const critiques = await storage.getCritiquesForTest("T-TEST-001");
    expect(critiques).toHaveLength(1);
    expect(critiques[0].targetType).toBe("test");
  });

  test("getFramingCritiques returns all framing critiques", async () => {
    const critiques = await storage.getFramingCritiques();
    expect(critiques).toHaveLength(1);
    expect(critiques[0].targetType).toBe("framing");
  });

  test("getCritiquesForTarget with type only returns all of that type", async () => {
    const critiques = await storage.getCritiquesForTarget("hypothesis");
    expect(critiques).toHaveLength(2);
  });
});

// ============================================================================
// Combined Query Tests
// ============================================================================

describe("Combined Queries", () => {
  beforeEach(async () => {
    const active1 = createHypothesisCritique({
      id: "C-TEST-001",
      hypothesisId: "H-TEST-001",
      attack: "Active serious attack (test fixture)",
      evidenceToConfirm: "Evidence that would confirm this critique",
      severity: "serious",
      sessionId: "TEST",
    });

    const active2 = createHypothesisCritique({
      id: "C-TEST-002",
      hypothesisId: "H-TEST-001",
      attack: "Active critical attack (test fixture)",
      evidenceToConfirm: "Evidence that would confirm this critique",
      severity: "critical",
      sessionId: "TEST",
    });

    const addressed = addressCritique(
      createHypothesisCritique({
        id: "C-TEST-003",
        hypothesisId: "H-TEST-001",
        attack: "This is an addressed attack on the hypothesis",
        evidenceToConfirm: "Evidence that would confirm this critique",
        severity: "serious",
        sessionId: "TEST",
      }),
      { text: "This was addressed" },
    );

    const activeMinor = createHypothesisCritique({
      id: "C-TEST-004",
      hypothesisId: "H-TEST-002",
      attack: "This is an active minor attack",
      evidenceToConfirm: "Evidence that would confirm this critique",
      severity: "minor",
      sessionId: "TEST",
    });

    await storage.saveSessionCritiques("TEST", [active1, active2, addressed, activeMinor]);
    await storage.rebuildIndex();
  });

  test("getActiveCritiquesForTarget returns only active critiques for target", async () => {
    const active = await storage.getActiveCritiquesForTarget("hypothesis", "H-TEST-001");
    expect(active).toHaveLength(2);
    expect(active.every((c) => c.status === "active")).toBe(true);
  });

  test("getBlockingCritiques returns serious or critical active critiques", async () => {
    const blocking = await storage.getBlockingCritiques();
    expect(blocking).toHaveLength(2);
    expect(blocking.every((c) => c.status === "active")).toBe(true);
    expect(blocking.every((c) => c.severity === "serious" || c.severity === "critical")).toBe(true);
  });
});

// ============================================================================
// Statistics Tests
// ============================================================================

describe("Statistics", () => {
  beforeEach(async () => {
    const critiques = [
      await createTestCritiqueData({ id: "C-S1-001", sessionId: "S1", severity: "critical" }),
      await createTestCritiqueData({ id: "C-S1-002", sessionId: "S1", severity: "serious" }),
      await createTestCritiqueData({ id: "C-S2-001", sessionId: "S2", severity: "moderate" }),
    ];

    // Add one with alternative
    const withAlt = createHypothesisCritique({
      id: "C-S2-002",
      hypothesisId: "H-S2-001",
      attack: "Attack with alternative",
      evidenceToConfirm: "Evidence that would confirm this critique",
      severity: "minor",
      sessionId: "S2",
      proposedAlternative: {
        description: "An alternative approach",
        testable: true,
      },
    });

    await storage.saveSessionCritiques("S1", [critiques[0], critiques[1]]);
    await storage.saveSessionCritiques("S2", [critiques[2], withAlt]);
    await storage.rebuildIndex();
  });

  test("getStatistics returns correct counts", async () => {
    const stats = await storage.getStatistics();

    expect(stats.total).toBe(4);
    expect(stats.byStatus.active).toBe(4);
    expect(stats.bySeverity.critical).toBe(1);
    expect(stats.bySeverity.serious).toBe(1);
    expect(stats.bySeverity.moderate).toBe(1);
    expect(stats.bySeverity.minor).toBe(1);
    expect(stats.withAlternatives).toBe(1);
    expect(stats.sessionsWithCritiques).toBe(2);
  });

  test("getUnaddressedCount returns correct counts for target", async () => {
    const counts = await storage.getUnaddressedCount("hypothesis", "H-S1-001");
    expect(counts.total).toBe(2);
    expect(counts.bySeverity.critical).toBe(1);
    expect(counts.bySeverity.serious).toBe(1);
  });
});

// ============================================================================
// Bulk Operations Tests
// ============================================================================

describe("Bulk Operations", () => {
  beforeEach(async () => {
    await storage.saveSessionCritiques("S1", [
      await createTestCritiqueData({ id: "C-S1-001", sessionId: "S1" }),
    ]);
    await storage.saveSessionCritiques("S2", [
      await createTestCritiqueData({ id: "C-S2-001", sessionId: "S2" }),
      await createTestCritiqueData({ id: "C-S2-002", sessionId: "S2" }),
    ]);
  });

  test("getAllCritiques returns all critiques across sessions", async () => {
    const all = await storage.getAllCritiques();
    expect(all).toHaveLength(3);
  });

  test("listSessions returns all session IDs", async () => {
    const sessions = await storage.listSessions();
    expect(sessions).toHaveLength(2);
    expect(sessions).toContain("S1");
    expect(sessions).toContain("S2");
  });
});

// ============================================================================
// Targets Under Attack Tests
// ============================================================================

describe("Targets Under Attack", () => {
  beforeEach(async () => {
    // H1 has 3 active critiques (1 critical, 2 serious)
    const h1Critiques = [
      createHypothesisCritique({
        id: "C-TEST-001",
        hypothesisId: "H-TEST-001",
        attack: "Critical attack on H1",
        evidenceToConfirm: "Evidence that would confirm this critique",
        severity: "critical",
        sessionId: "TEST",
      }),
      createHypothesisCritique({
        id: "C-TEST-002",
        hypothesisId: "H-TEST-001",
        attack: "Serious attack 1 on H1",
        evidenceToConfirm: "Evidence that would confirm this critique",
        severity: "serious",
        sessionId: "TEST",
      }),
      createHypothesisCritique({
        id: "C-TEST-003",
        hypothesisId: "H-TEST-001",
        attack: "Serious attack 2 on H1",
        evidenceToConfirm: "Evidence that would confirm this critique",
        severity: "serious",
        sessionId: "TEST",
      }),
    ];

    // H2 has 1 active critique
    const h2Critique = createHypothesisCritique({
      id: "C-TEST-004",
      hypothesisId: "H-TEST-002",
      attack: "Attack on hypothesis H2 that is flawed",
      evidenceToConfirm: "Evidence that would confirm this critique",
      severity: "moderate",
      sessionId: "TEST",
    });

    await storage.saveSessionCritiques("TEST", [...h1Critiques, h2Critique]);
    await storage.rebuildIndex();
  });

  test("getTargetsUnderAttack returns targets sorted by unaddressed count", async () => {
    const targets = await storage.getTargetsUnderAttack();

    expect(targets).toHaveLength(2);
    expect(targets[0].targetId).toBe("H-TEST-001");
    expect(targets[0].unaddressedCount).toBe(3);
    expect(targets[0].criticalCount).toBe(1);
    expect(targets[0].seriousCount).toBe(2);
    expect(targets[1].targetId).toBe("H-TEST-002");
    expect(targets[1].unaddressedCount).toBe(1);
  });
});

// ============================================================================
// Auto-Rebuild Index Tests
// ============================================================================

describe("Auto-Rebuild Index", () => {
  test("autoRebuildIndex=true rebuilds on save", async () => {
    const autoStorage = new CritiqueStorage({ baseDir: testDir, autoRebuildIndex: true });
    const critique = await createTestCritiqueData();

    await autoStorage.saveCritique(critique);

    // Index should exist
    const indexPath = join(testDir, ".research", "critique-index.json");
    const exists = await fs
      .access(indexPath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });

  test("autoRebuildIndex=false does not rebuild on save", async () => {
    const critique = await createTestCritiqueData();
    await storage.saveCritique(critique);

    // Index should not exist
    const indexPath = join(testDir, ".research", "critique-index.json");
    const exists = await fs
      .access(indexPath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(false);
  });
});

// ============================================================================
// Critiques With Alternatives Tests
// ============================================================================

describe("Critiques With Alternatives", () => {
  test("getCritiquesWithAlternatives returns critiques with proposed alternatives", async () => {
    const withAlt = createHypothesisCritique({
      id: "C-TEST-001",
      hypothesisId: "H-TEST-001",
      attack: "Attack with alternative",
      evidenceToConfirm: "Evidence that would confirm this critique",
      severity: "serious",
      sessionId: "TEST",
      proposedAlternative: {
        description: "A better explanation",
        mechanism: "Through process X",
        testable: true,
        predictions: ["Prediction A"],
      },
    });

    const withoutAlt = createHypothesisCritique({
      id: "C-TEST-002",
      hypothesisId: "H-TEST-002",
      attack: "Attack without alternative",
      evidenceToConfirm: "Evidence that would confirm this critique",
      severity: "moderate",
      sessionId: "TEST",
    });

    await storage.saveSessionCritiques("TEST", [withAlt, withoutAlt]);
    await storage.rebuildIndex();

    const withAlternatives = await storage.getCritiquesWithAlternatives();
    expect(withAlternatives).toHaveLength(1);
    expect(withAlternatives[0].id).toBe("C-TEST-001");
  });
});

// ============================================================================
// Concurrency Tests
// ============================================================================

describe("Concurrency", () => {
  test("concurrent saveCritique calls do not drop writes", async () => {
    const sessionId = "CONCURRENT";
    const critiques = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        createTestCritiqueData({
          sessionId,
          id: `C-${sessionId}-${String(i + 1).padStart(3, "0")}`,
        }),
      ),
    );

    await Promise.all(critiques.map((c) => storage.saveCritique(c)));

    const loaded = await storage.loadSessionCritiques(sessionId);
    expect(loaded).toHaveLength(critiques.length);

    const loadedIds = loaded.map((c) => c.id).sort();
    const expectedIds = critiques.map((c) => c.id).sort();
    expect(loadedIds).toEqual(expectedIds);
  });
});

// ============================================================================
// Critiques By Agent Tests
// ============================================================================

describe("Critiques By Agent", () => {
  test("getCritiquesByAgent returns critiques raised by specific agent", async () => {
    const byAgent1 = createHypothesisCritique({
      id: "C-TEST-001",
      hypothesisId: "H-TEST-001",
      attack: "This is a substantive critique by Agent1",
      evidenceToConfirm: "Evidence that would confirm this critique",
      severity: "moderate",
      sessionId: "TEST",
      raisedBy: "Agent1",
    });

    const byAgent2 = createHypothesisCritique({
      id: "C-TEST-002",
      hypothesisId: "H-TEST-002",
      attack: "This is a substantive critique by Agent2",
      evidenceToConfirm: "Evidence that would confirm this critique",
      severity: "moderate",
      sessionId: "TEST",
      raisedBy: "Agent2",
    });

    await storage.saveSessionCritiques("TEST", [byAgent1, byAgent2]);
    await storage.rebuildIndex();

    const agent1Critiques = await storage.getCritiquesByAgent("Agent1");
    expect(agent1Critiques).toHaveLength(1);
    expect(agent1Critiques[0].raisedBy).toBe("Agent1");
  });
});
