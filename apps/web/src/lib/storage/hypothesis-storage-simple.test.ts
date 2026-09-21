import { promises as fs } from "fs";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHypothesis } from "../schemas/hypothesis";
import { HypothesisStorage } from "./hypothesis-storage";

const TEST_DIR = "/tmp/brenner_hypothesis_test_simple";

describe("HypothesisStorage Simple IDs", () => {
  let storage: HypothesisStorage;

  beforeEach(async () => {
    await fs.mkdir(join(TEST_DIR, ".research", "hypotheses"), { recursive: true });
    storage = new HypothesisStorage({ baseDir: TEST_DIR });
  });

  afterEach(async () => {
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch {}
  });

  it("finds hypothesis by simple ID scanning all sessions", async () => {
    const h1 = createHypothesis({
      id: "H1",
      statement: "Simple ID Hypothesis",
      sessionId: "SESSION_A",
      category: "mechanistic",
      mechanism: "Mechanism",
    });

    await storage.saveSessionHypotheses("SESSION_A", [h1]);

    const found = await storage.getHypothesisById("H1");
    expect(found).not.toBeNull();
    expect(found?.id).toBe("H1");
    expect(found?.sessionId).toBe("SESSION_A");
  });

  it("finds hypothesis by simple ID with explicit session ID", async () => {
    const h1 = createHypothesis({
      id: "H1",
      statement: "Simple ID Hypothesis",
      sessionId: "SESSION_A",
      category: "mechanistic",
      mechanism: "Mechanism",
    });

    await storage.saveSessionHypotheses("SESSION_A", [h1]);

    const found = await storage.getHypothesisById("H1", "SESSION_A");
    expect(found).not.toBeNull();
    expect(found?.id).toBe("H1");
  });

  it("prioritizes explicit session ID over scan", async () => {
    const h1A = createHypothesis({
      id: "H1",
      statement: "Session A Hypothesis",
      sessionId: "SESSION_A",
      category: "mechanistic",
      mechanism: "Mechanism A",
    });

    const h1B = createHypothesis({
      id: "H1",
      statement: "Session B Hypothesis",
      sessionId: "SESSION_B",
      category: "mechanistic",
      mechanism: "Mechanism B",
    });

    await storage.saveSessionHypotheses("SESSION_A", [h1A]);
    await storage.saveSessionHypotheses("SESSION_B", [h1B]);

    const foundA = await storage.getHypothesisById("H1", "SESSION_A");
    expect(foundA?.statement).toBe("Session A Hypothesis");

    const foundB = await storage.getHypothesisById("H1", "SESSION_B");
    expect(foundB?.statement).toBe("Session B Hypothesis");
  });
});
