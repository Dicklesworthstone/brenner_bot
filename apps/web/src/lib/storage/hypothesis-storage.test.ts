import { randomUUID } from "node:crypto";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { beforeEach, describe, expect, test } from "vitest";
import { createHypothesis, type Hypothesis } from "../schemas/hypothesis";
import { HypothesisStorage, type SessionHypothesisFile } from "./hypothesis-storage";

/**
 * Tests for Hypothesis Storage Layer
 *
 * @see brenner_bot-8hv8 (bead)
 */

// ============================================================================
// Test Helpers
// ============================================================================

let testDir: string;
let storage: HypothesisStorage;

function parseJson<T>(value: string): T {
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${String(error)}`);
  }
}

function createTestHypothesisData(
  overrides: Partial<{
    id: string;
    sessionId: string;
    statement: string;
    category: "mechanistic" | "phenomenological" | "boundary" | "auxiliary" | "third_alternative";
    confidence: "high" | "medium" | "low" | "speculative";
    state: "proposed" | "active" | "confirmed" | "refuted" | "superseded" | "deferred";
    mechanism: string;
    tags: string[];
    notes: string;
  }> = {},
): Hypothesis {
  const sessionId = overrides.sessionId ?? "TEST";
  const id = overrides.id ?? `H-${sessionId}-001`;

  const hypothesis = createHypothesis({
    id,
    sessionId,
    statement: overrides.statement ?? "A sufficiently specific hypothesis statement for testing",
    category: overrides.category ?? "mechanistic",
    confidence: overrides.confidence ?? "medium",
    mechanism: overrides.mechanism ?? "Some plausible mechanism",
  });

  return {
    ...hypothesis,
    ...(overrides.state ? { state: overrides.state } : {}),
    ...(overrides.tags ? { tags: overrides.tags } : {}),
    ...(overrides.notes ? { notes: overrides.notes } : {}),
  };
}

beforeEach(async () => {
  testDir = join(tmpdir(), `hypothesis-storage-test-${randomUUID()}`);
  await fs.mkdir(testDir, { recursive: true });
  storage = new HypothesisStorage({ baseDir: testDir, autoRebuildIndex: false });
});

// Note: No cleanup. Repo invariant: do not delete files/dirs without explicit approval.

// ============================================================================
// Session File Operations Tests
// ============================================================================

describe("Session File Operations", () => {
  test("saves and loads hypotheses for a session", async () => {
    const h1 = createTestHypothesisData({ id: "H-TEST-001" });
    const h2 = createTestHypothesisData({ id: "H-TEST-002" });

    await storage.saveSessionHypotheses("TEST", [h1, h2]);
    const loaded = await storage.loadSessionHypotheses("TEST");

    expect(loaded).toHaveLength(2);
    expect(loaded[0].id).toBe("H-TEST-001");
    expect(loaded[1].id).toBe("H-TEST-002");
  });

  test("returns empty array for non-existent session", async () => {
    const loaded = await storage.loadSessionHypotheses("NONEXISTENT");
    expect(loaded).toHaveLength(0);
  });

  test("returns empty array for malformed session file JSON", async () => {
    const good = createTestHypothesisData({ id: "H-GOOD-001", sessionId: "GOOD" });
    await storage.saveSessionHypotheses("GOOD", [good]);

    await fs.mkdir(join(testDir, ".research", "hypotheses"), { recursive: true });
    const filePath = join(testDir, ".research", "hypotheses", "BAD-hypotheses.json");
    await fs.writeFile(filePath, "not-json");

    const loaded = await storage.loadSessionHypotheses("BAD");
    expect(loaded).toEqual([]);

    const index = await storage.rebuildIndex();
    expect(index.entries.map((e) => e.id)).toContain(good.id);
    expect(index.warnings?.some((w) => w.file.includes("BAD-hypotheses.json"))).toBe(true);
  });

  test("returns empty array when hypotheses field is not an array", async () => {
    await fs.mkdir(join(testDir, ".research", "hypotheses"), { recursive: true });
    await fs.writeFile(
      join(testDir, ".research", "hypotheses", "MALFORMED-hypotheses.json"),
      JSON.stringify({
        sessionId: "MALFORMED",
        createdAt: "2025-01-01",
        hypotheses: "not-an-array",
      }),
    );

    const loaded = await storage.loadSessionHypotheses("MALFORMED");
    expect(loaded).toEqual([]);
  });

  test("skips individual invalid hypothesis entries during load", async () => {
    const validHypothesis = createTestHypothesisData({ id: "H-MIXED-001", sessionId: "MIXED" });
    await fs.mkdir(join(testDir, ".research", "hypotheses"), { recursive: true });
    await fs.writeFile(
      join(testDir, ".research", "hypotheses", "MIXED-hypotheses.json"),
      JSON.stringify({
        sessionId: "MIXED",
        createdAt: "2025-01-01",
        updatedAt: "2025-01-01",
        hypotheses: [
          validHypothesis,
          { invalid: "entry", missing: "required fields" },
          { id: "also-invalid" },
        ],
      }),
    );

    const loaded = await storage.loadSessionHypotheses("MIXED");
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe(validHypothesis.id);
  });

  test("preserves createdAt on update", async () => {
    const hypothesis = createTestHypothesisData();
    await storage.saveSessionHypotheses("TEST", [hypothesis]);

    const filePath = join(testDir, ".research", "hypotheses", "TEST-hypotheses.json");
    const content1 = parseJson<SessionHypothesisFile>(await fs.readFile(filePath, "utf-8"));
    const originalCreatedAt = content1.createdAt;

    await new Promise((r) => setTimeout(r, 10));
    const updated = { ...hypothesis, notes: "Updated notes" };
    await storage.saveSessionHypotheses("TEST", [updated]);

    const content2 = parseJson<SessionHypothesisFile>(await fs.readFile(filePath, "utf-8"));
    expect(content2.createdAt).toBe(originalCreatedAt);
    expect(content2.updatedAt).not.toBe(content2.createdAt);
  });

  test("autoRebuildIndex updates index when enabled", async () => {
    const hypothesis = createTestHypothesisData({ id: "H-TEST-001" });
    const autoStorage = new HypothesisStorage({ baseDir: testDir, autoRebuildIndex: true });

    await autoStorage.saveSessionHypotheses("TEST", [hypothesis]);

    const indexPath = join(testDir, ".research", "hypothesis-index.json");
    const content = await fs.readFile(indexPath, "utf-8");
    expect(content).toContain('"version"');
  });
});

// ============================================================================
// Individual Hypothesis Operations Tests
// ============================================================================

describe("Individual Hypothesis Operations", () => {
  test("getHypothesisById returns hypothesis when found", async () => {
    const hypothesis = createTestHypothesisData({ id: "H-TEST-001" });
    await storage.saveSessionHypotheses("TEST", [hypothesis]);

    const found = await storage.getHypothesisById("H-TEST-001");
    expect(found).not.toBeNull();
    expect(found?.id).toBe("H-TEST-001");
  });

  test("getHypothesisById returns hypothesis for simple ID format", async () => {
    const hypothesis = createTestHypothesisData({ id: "H42" });
    await storage.saveSessionHypotheses("TEST", [hypothesis]);

    const found = await storage.getHypothesisById("H42");
    expect(found).not.toBeNull();
    expect(found?.id).toBe("H42");
  });

  test("getHypothesisById returns null for invalid ID format", async () => {
    const found = await storage.getHypothesisById("invalid-id");
    expect(found).toBeNull();
  });

  test("getHypothesisById returns null when not found", async () => {
    const found = await storage.getHypothesisById("H-TEST-999");
    expect(found).toBeNull();
  });

  test("saveHypothesis creates new hypothesis", async () => {
    const hypothesis = createTestHypothesisData({ id: "H-TEST-001" });
    await storage.saveHypothesis(hypothesis);

    const found = await storage.getHypothesisById("H-TEST-001");
    expect(found).not.toBeNull();
  });

  test("saveHypothesis updates existing hypothesis", async () => {
    const hypothesis = createTestHypothesisData({ id: "H-TEST-001" });
    await storage.saveHypothesis(hypothesis);

    const updated = { ...hypothesis, notes: "Updated notes" };
    await storage.saveHypothesis(updated);

    const found = await storage.getHypothesisById("H-TEST-001");
    expect(found?.notes).toBe("Updated notes");

    const all = await storage.loadSessionHypotheses("TEST");
    expect(all).toHaveLength(1);
  });

  test("deleteHypothesis removes hypothesis", async () => {
    const hypothesis = createTestHypothesisData({ id: "H-TEST-001" });
    await storage.saveHypothesis(hypothesis);

    const deleted = await storage.deleteHypothesis("H-TEST-001");
    expect(deleted).toBe(true);

    const found = await storage.getHypothesisById("H-TEST-001");
    expect(found).toBeNull();
  });

  test("deleteHypothesis returns false for non-existent hypothesis", async () => {
    const deleted = await storage.deleteHypothesis("H-TEST-999");
    expect(deleted).toBe(false);
  });

  test("deleteHypothesis returns true when hypothesis is found and filtered out", async () => {
    // This test verifies that deleteHypothesis returns true when the hypothesis
    // is found in the initial lookup and successfully filtered out, even if
    // subsequent storage calls would return different results.
    const hypothesis = createTestHypothesisData({ id: "H-TEST-001" });

    class FlakyStorage extends HypothesisStorage {
      private calls = 0;

      // First call finds hypothesis, subsequent calls return empty.
      // This simulates potential race conditions, but the implementation
      // correctly returns true based on the initial lookup result.
      override async loadSessionHypotheses(sessionId: string) {
        void sessionId;
        this.calls++;
        return this.calls === 1 ? [hypothesis] : [];
      }
    }

    const flaky = new FlakyStorage({ baseDir: testDir, autoRebuildIndex: false });
    const deleted = await flaky.deleteHypothesis("H-TEST-001");
    // Returns true because the hypothesis was found and filtered in the first lookup
    expect(deleted).toBe(true);
  });
});

// ============================================================================
// Concurrency Tests
// ============================================================================

describe("Concurrency", () => {
  test("concurrent saveHypothesis calls do not drop writes", async () => {
    const sessionId = "CONCURRENT";
    const hypotheses = Array.from({ length: 10 }, (_, i) =>
      createTestHypothesisData({
        sessionId,
        id: `H-${sessionId}-${String(i + 1).padStart(3, "0")}`,
        statement: `Hypothesis ${i + 1}`,
      }),
    );

    await Promise.all(hypotheses.map((h) => storage.saveHypothesis(h)));

    const loaded = await storage.loadSessionHypotheses(sessionId);
    expect(loaded).toHaveLength(hypotheses.length);

    const loadedIds = loaded.map((h) => h.id).sort();
    const expectedIds = hypotheses.map((h) => h.id).sort();
    expect(loadedIds).toEqual(expectedIds);
  });
});

// ============================================================================
// Index Operations Tests
// ============================================================================

describe("Index Operations", () => {
  test("rebuildIndex creates index from session files", async () => {
    const h1 = createTestHypothesisData({ id: "H-S1-001", sessionId: "S1" });
    const h2 = createTestHypothesisData({ id: "H-S2-001", sessionId: "S2" });

    await storage.saveSessionHypotheses("S1", [h1]);
    await storage.saveSessionHypotheses("S2", [h2]);

    const index = await storage.rebuildIndex();

    expect(index.entries).toHaveLength(2);
    expect(index.entries.map((e) => e.id)).toContain("H-S1-001");
    expect(index.entries.map((e) => e.id)).toContain("H-S2-001");
  });

  test("loadIndex rebuilds if missing", async () => {
    const hypothesis = createTestHypothesisData({ id: "H-TEST-001" });
    await storage.saveSessionHypotheses("TEST", [hypothesis]);

    const index = await storage.loadIndex();
    expect(index.entries).toHaveLength(1);
  });

  test("loadIndex rebuilds if index file is malformed", async () => {
    const hypothesis = createTestHypothesisData({ id: "H-TEST-001" });
    await storage.saveSessionHypotheses("TEST", [hypothesis]);

    const indexPath = join(testDir, ".research", "hypothesis-index.json");
    await fs.writeFile(indexPath, "not-json");

    const index = await storage.loadIndex();
    expect(index.entries).toHaveLength(1);
  });

  test("loadIndex returns existing index", async () => {
    const hypothesis = createTestHypothesisData({ id: "H-TEST-001" });
    await storage.saveSessionHypotheses("TEST", [hypothesis]);
    await storage.rebuildIndex();

    const index = await storage.loadIndex();
    expect(index.entries).toHaveLength(1);
    expect(index.version).toBe("1.0.0");
  });

  test("loadIndex rebuilds when entries field is not an array", async () => {
    const hypothesis = createTestHypothesisData({ id: "H-TEST-001" });
    await storage.saveSessionHypotheses("TEST", [hypothesis]);

    const indexPath = join(testDir, ".research", "hypothesis-index.json");
    await fs.mkdir(join(testDir, ".research"), { recursive: true });
    await fs.writeFile(indexPath, JSON.stringify({ version: "1.0.0", entries: "not-array" }));

    const index = await storage.loadIndex();
    expect(index.entries).toHaveLength(1);
    expect(Array.isArray(index.entries)).toBe(true);
  });

  test("rebuildIndex records warning for session files with non-array hypotheses field", async () => {
    await fs.mkdir(join(testDir, ".research", "hypotheses"), { recursive: true });
    await fs.writeFile(
      join(testDir, ".research", "hypotheses", "NOARRAY-hypotheses.json"),
      JSON.stringify({ sessionId: "NOARRAY", hypotheses: { not: "an-array" } }),
    );

    const index = await storage.rebuildIndex();
    expect(index.warnings?.some((w) => w.message.includes("missing hypotheses[]"))).toBe(true);
  });

  test("rebuildIndex records warning for session files with invalid hypothesis entries", async () => {
    await fs.mkdir(join(testDir, ".research", "hypotheses"), { recursive: true });
    await fs.writeFile(
      join(testDir, ".research", "hypotheses", "HASINVALID-hypotheses.json"),
      JSON.stringify({
        sessionId: "HASINVALID",
        createdAt: "2025-01-01",
        updatedAt: "2025-01-01",
        hypotheses: [{ invalid: "hypothesis1" }, { invalid: "hypothesis2" }],
      }),
    );

    const index = await storage.rebuildIndex();
    expect(index.warnings?.some((w) => w.message.includes("Skipped 2 invalid hypotheses"))).toBe(
      true,
    );
  });

  test("index entries contain correct metadata", async () => {
    const hypothesis = createTestHypothesisData({
      id: "H-TEST-001",
      sessionId: "TEST",
      category: "mechanistic",
      confidence: "high",
      state: "active",
      mechanism: "Mechanism X",
    });

    await storage.saveHypothesis(hypothesis);
    const index = await storage.rebuildIndex();

    expect(index.entries).toHaveLength(1);
    const entry = index.entries[0];
    expect(entry.category).toBe("mechanistic");
    expect(entry.confidence).toBe("high");
    expect(entry.state).toBe("active");
    expect(entry.hasMechanism).toBe(true);
    expect(entry.unresolvedCritiqueCount).toBe(0);
  });
});

// ============================================================================
// Query Operations Tests
// ============================================================================

describe("Query Operations", () => {
  test("getActiveHypotheses returns only active hypotheses", async () => {
    const active = createTestHypothesisData({ id: "H-TEST-001", state: "active" });
    const proposed = createTestHypothesisData({ id: "H-TEST-002", state: "proposed" });

    await storage.saveSessionHypotheses("TEST", [active, proposed]);
    await storage.rebuildIndex();

    const results = await storage.getActiveHypotheses();
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("H-TEST-001");
  });

  test("searchHypotheses matches statement, mechanism, notes, tags, and id", async () => {
    const h1 = createTestHypothesisData({
      id: "H-S1-001",
      sessionId: "S1",
      statement: "Cell fate is determined by chromatin state",
      mechanism: "Chromatin remodeling machinery",
      tags: ["chromatin", "cell-fate"],
    });
    const h2 = createTestHypothesisData({
      id: "H-S2-001",
      sessionId: "S2",
      statement: "Completely unrelated statement",
      notes: "Contains the magic word: chromatin",
    });

    await storage.saveSessionHypotheses("S1", [h1]);
    await storage.saveSessionHypotheses("S2", [h2]);

    expect(await storage.searchHypotheses("H-S1-001")).toHaveLength(1);
    expect(await storage.searchHypotheses("cell fate")).toHaveLength(1);
    expect(await storage.searchHypotheses("remodeling")).toHaveLength(1);
    expect(await storage.searchHypotheses("magic word")).toHaveLength(1);
    expect(await storage.searchHypotheses("chromatin")).toHaveLength(2);
    expect(await storage.searchHypotheses("   ")).toHaveLength(0);
  });
});

// ============================================================================
// Bulk Operations Tests
// ============================================================================

describe("Bulk Operations", () => {
  test("getAllHypotheses returns all hypotheses across sessions", async () => {
    await storage.saveSessionHypotheses("S1", [
      createTestHypothesisData({ id: "H-S1-001", sessionId: "S1" }),
    ]);
    await storage.saveSessionHypotheses("S2", [
      createTestHypothesisData({ id: "H-S2-001", sessionId: "S2" }),
      createTestHypothesisData({ id: "H-S2-002", sessionId: "S2" }),
    ]);

    const all = await storage.getAllHypotheses();
    expect(all).toHaveLength(3);
  });

  test("listSessions returns all session IDs", async () => {
    await storage.saveSessionHypotheses("S1", [
      createTestHypothesisData({ id: "H-S1-001", sessionId: "S1" }),
    ]);
    await storage.saveSessionHypotheses("S2", [
      createTestHypothesisData({ id: "H-S2-001", sessionId: "S2" }),
    ]);

    const sessions = await storage.listSessions();
    expect(sessions).toHaveLength(2);
    expect(sessions).toContain("S1");
    expect(sessions).toContain("S2");
  });

  test("listSessions returns empty array when hypotheses directory does not exist", async () => {
    // Fresh temp dir with no .research/hypotheses directory
    const freshDir = join(testDir, "fresh-subdir");
    await fs.mkdir(freshDir, { recursive: true });
    const freshStorage = new HypothesisStorage({ baseDir: freshDir, autoRebuildIndex: false });

    const sessions = await freshStorage.listSessions();
    expect(sessions).toEqual([]);
  });

  test("getAllHypotheses returns empty array when hypotheses directory does not exist", async () => {
    const freshDir = join(testDir, "another-fresh-subdir");
    await fs.mkdir(freshDir, { recursive: true });
    const freshStorage = new HypothesisStorage({ baseDir: freshDir, autoRebuildIndex: false });

    const all = await freshStorage.getAllHypotheses();
    expect(all).toEqual([]);
  });
});

// ============================================================================
// Auto-Rebuild Index Tests
// ============================================================================

describe("Auto-Rebuild Index", () => {
  test("autoRebuildIndex=true rebuilds on save", async () => {
    const autoStorage = new HypothesisStorage({ baseDir: testDir, autoRebuildIndex: true });
    const hypothesis = createTestHypothesisData({ id: "H-TEST-001" });

    await autoStorage.saveHypothesis(hypothesis);

    const indexPath = join(testDir, ".research", "hypothesis-index.json");
    const exists = await fs
      .access(indexPath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });

  test("autoRebuildIndex=false does not rebuild on save", async () => {
    const hypothesis = createTestHypothesisData({ id: "H-TEST-001" });
    await storage.saveHypothesis(hypothesis);

    const indexPath = join(testDir, ".research", "hypothesis-index.json");
    const exists = await fs
      .access(indexPath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(false);
  });
});
