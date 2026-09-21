import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const STORAGE_KEY = "brenner-reading-positions";

describe("readingStore", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  test("sanitizes malformed persisted payload and uses a null-prototype positions map", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        positions: {
          good: { scrollOffset: 10, activeSection: 2, lastRead: 100 },
          bad: { scrollOffset: "nope", activeSection: 1, lastRead: 50 },
        },
      }),
    );

    vi.resetModules();
    const mod = await import("./readingStore");

    expect(Object.getPrototypeOf(mod.readingStore.state.positions)).toBe(null);
    expect(mod.getReadingPosition("good")).toEqual({
      scrollOffset: 10,
      activeSection: 2,
      lastRead: 100,
    });
    expect(mod.getReadingPosition("bad")).toBeNull();
  });

  test("prunes old positions and keeps the positions map null-prototype", async () => {
    vi.resetModules();
    const mod = await import("./readingStore");

    let now = 1_000;
    vi.spyOn(Date, "now").mockImplementation(() => {
      now += 1;
      return now;
    });

    for (let i = 0; i < 60; i++) {
      mod.saveReadingPosition(`doc-${i}`, i, i);
    }

    const entries = Object.entries(mod.readingStore.state.positions);
    expect(entries.length).toBeLessThanOrEqual(50);
    expect(Object.getPrototypeOf(mod.readingStore.state.positions)).toBe(null);
  });
});
