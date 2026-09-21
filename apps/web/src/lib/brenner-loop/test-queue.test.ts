import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExclusionTest } from "./operators/exclusion-test";
import {
  addExclusionTestsToQueue,
  addManualQueueItem,
  clearTestQueue,
  generateQueueItemId,
  getTestQueueStats,
  isPredictionsLocked,
  loadTestQueue,
  lockQueueItemPredictions,
  priorityFromPower,
  saveTestQueue,
  updateQueueItem,
} from "./test-queue";

// ============================================================================//
// Mock localStorage
// ============================================================================//

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

Object.defineProperty(global, "window", {
  value: {
    localStorage: localStorageMock,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
});

// ============================================================================//
// Fixtures
// ============================================================================//

function makeExclusionTest(overrides: Partial<ExclusionTest>): ExclusionTest {
  return {
    id: overrides.id ?? "ET-test-1",
    name: overrides.name ?? "Natural experiment: policy change",
    description: overrides.description ?? "Observe outcome before/after a policy shift.",
    category: overrides.category ?? "natural_experiment",
    discriminativePower: overrides.discriminativePower ?? 5,
    falsificationCondition: overrides.falsificationCondition ?? "No measurable change in outcome.",
    supportCondition: overrides.supportCondition ?? "Large change consistent with mechanism.",
    rationale: overrides.rationale ?? "High leverage because it’s quasi-random.",
    feasibility: overrides.feasibility ?? "high",
    feasibilityNotes: overrides.feasibilityNotes,
    selected: overrides.selected,
    isCustom: overrides.isCustom,
  };
}

// ============================================================================//
// Tests
// ============================================================================//

describe("test-queue", () => {
  const sessionId = "THREAD-TEST-001";
  const hypothesisId = "HC-THREAD-TEST-001-001-v1";

  beforeEach(() => {
    localStorageMock.clear();
  });

  it("maps discriminative power to priority", () => {
    expect(priorityFromPower(5)).toBe("urgent");
    expect(priorityFromPower(4)).toBe("high");
    expect(priorityFromPower(3)).toBe("medium");
    expect(priorityFromPower(2)).toBe("low");
    expect(priorityFromPower(1)).toBe("someday");
  });

  it("adds exclusion tests to queue and de-duplicates by stable ID", () => {
    const tests = [
      makeExclusionTest({ id: "ET-a", discriminativePower: 5 }),
      makeExclusionTest({ id: "ET-b", discriminativePower: 3 }),
    ];

    const first = addExclusionTestsToQueue({
      sessionId,
      hypothesisId,
      tests,
      source: "exclusion_test",
    });
    expect(first).toHaveLength(2);

    const second = addExclusionTestsToQueue({
      sessionId,
      hypothesisId,
      tests,
      source: "exclusion_test",
    });
    expect(second).toHaveLength(2);

    const loaded = loadTestQueue(sessionId);
    expect(loaded).toHaveLength(2);
  });

  it("defaults missing assumptionIds to an empty array", () => {
    const legacyItem = {
      id: "TQ-legacy",
      sessionId,
      hypothesisId,
      test: makeExclusionTest({ id: "ET-legacy" }),
      discriminativePower: 3,
      status: "queued",
      priority: "medium",
      predictionIfTrue: "Supports",
      predictionIfFalse: "Falsifies",
      addedAt: new Date().toISOString(),
      source: "manual",
    };

    localStorageMock.setItem(`brenner-test-queue-${sessionId}`, JSON.stringify([legacyItem]));
    const loaded = loadTestQueue(sessionId);
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.assumptionIds).toEqual([]);
  });

  it("persists linked assumptions across reloads", () => {
    const tests = [makeExclusionTest({ id: "ET-link", discriminativePower: 4 })];

    const items = addExclusionTestsToQueue({
      sessionId,
      hypothesisId,
      tests,
      source: "exclusion_test",
    });

    const item = items[0];
    updateQueueItem(sessionId, item.id, { assumptionIds: ["A-1", "A-2"] });

    const loaded = loadTestQueue(sessionId);
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.assumptionIds).toEqual(["A-1", "A-2"]);
  });

  it("locks predictions and prevents post-hoc edits", () => {
    const tests = [makeExclusionTest({ id: "ET-lock", discriminativePower: 4 })];

    const items = addExclusionTestsToQueue({
      sessionId,
      hypothesisId,
      tests,
      source: "exclusion_test",
    });

    const item = items[0];
    expect(item.predictionsLockedAt).toBeUndefined();

    const locked = lockQueueItemPredictions(sessionId, item.id);
    const lockedItem = locked.find((i) => i.id === item.id);
    expect(lockedItem?.predictionsLockedAt).toBeTruthy();

    const attempted = updateQueueItem(sessionId, item.id, {
      predictionIfTrue: "edited",
      predictionIfFalse: "edited",
    });
    const after = attempted.find((i) => i.id === item.id);
    expect(after?.predictionIfTrue).not.toBe("edited");
    expect(after?.predictionIfFalse).not.toBe("edited");
  });

  it("supports manual queue items and stable de-duplication", () => {
    const test = makeExclusionTest({ id: "ET-manual", discriminativePower: 3 });
    const first = addManualQueueItem({ sessionId, hypothesisId, test, source: "manual" });
    expect(first).toHaveLength(1);

    const second = addManualQueueItem({ sessionId, hypothesisId, test, source: "manual" });
    expect(second).toHaveLength(1);
    expect(second[0]?.assumptionIds).toEqual([]);

    const withAssumptions = addManualQueueItem({
      sessionId,
      hypothesisId,
      test: makeExclusionTest({ id: "ET-manual-2" }),
      assumptionIds: ["A-1"],
      source: "manual",
    });
    expect(withAssumptions[1]?.assumptionIds).toEqual(["A-1"]);
  });

  it("generates unique queue item ids and detects locked predictions", () => {
    const id1 = generateQueueItemId(sessionId);
    const id2 = generateQueueItemId(sessionId);
    expect(id1).toMatch(new RegExp(`^TQ-${sessionId}-`));
    expect(id2).toMatch(new RegExp(`^TQ-${sessionId}-`));
    expect(id1).not.toBe(id2);

    const items = addExclusionTestsToQueue({
      sessionId,
      hypothesisId,
      tests: [makeExclusionTest({ id: "ET-lock-2" })],
      source: "exclusion_test",
    });
    const item = items[0]!;
    expect(isPredictionsLocked(item)).toBe(false);

    const locked = lockQueueItemPredictions(sessionId, item.id);
    expect(isPredictionsLocked(locked[0]!)).toBe(true);
  });

  it("gracefully handles storage failures", () => {
    const originalGetItem = localStorageMock.getItem;
    const originalSetItem = localStorageMock.setItem;
    const originalRemoveItem = localStorageMock.removeItem;

    localStorageMock.getItem = () => {
      throw new Error("boom");
    };
    expect(loadTestQueue(sessionId)).toEqual([]);

    localStorageMock.getItem = originalGetItem;
    localStorageMock.setItem = () => {
      throw new Error("quota exceeded");
    };
    saveTestQueue(sessionId, []);

    localStorageMock.setItem = originalSetItem;
    localStorageMock.removeItem = () => {
      throw new Error("boom");
    };
    clearTestQueue(sessionId);

    localStorageMock.removeItem = originalRemoveItem;
  });

  it("does not lock predictions when they are blank", () => {
    const items = addExclusionTestsToQueue({
      sessionId,
      hypothesisId,
      tests: [makeExclusionTest({ id: "ET-empty" })],
      source: "exclusion_test",
    });

    const item = items[0]!;
    updateQueueItem(sessionId, item.id, { predictionIfTrue: "", predictionIfFalse: "" });

    const next = lockQueueItemPredictions(sessionId, item.id);
    expect(next[0]?.predictionsLockedAt).toBeUndefined();
  });

  it("computes stats", () => {
    addExclusionTestsToQueue({
      sessionId,
      hypothesisId,
      tests: [
        makeExclusionTest({ id: "ET-1", discriminativePower: 5 }),
        makeExclusionTest({ id: "ET-2", discriminativePower: 2 }),
      ],
      source: "exclusion_test",
    });

    const items = loadTestQueue(sessionId);
    const stats = getTestQueueStats(items);
    expect(stats.total).toBe(2);
    expect(stats.byPriority.urgent).toBe(1);
    expect(stats.byPriority.low).toBe(1);
  });
});
