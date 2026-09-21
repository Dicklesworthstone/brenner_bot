import { describe, expect, it } from "vitest";
import { isDemoThreadId, normalizeThreadId } from "./demo-mode";

describe("isDemoThreadId", () => {
  it("returns true for demo thread ids", () => {
    expect(isDemoThreadId("demo-test-001")).toBe(true);
    expect(isDemoThreadId("demo-bio-nanochat-001")).toBe(true);
  });

  it("returns false for non-demo ids", () => {
    expect(isDemoThreadId("TKT-123")).toBe(false);
    expect(isDemoThreadId("SESSION-abc")).toBe(false);
    expect(isDemoThreadId("DEMO-upper")).toBe(false);
    expect(isDemoThreadId("")).toBe(false);
  });
});

describe("normalizeThreadId", () => {
  it("returns empty string for missing values", () => {
    expect(normalizeThreadId(undefined)).toBe("");
  });

  it("returns the string thread id directly", () => {
    expect(normalizeThreadId("demo-test-001")).toBe("demo-test-001");
  });

  it("returns the first entry for array values", () => {
    expect(normalizeThreadId(["TKT-123", "TKT-456"])).toBe("TKT-123");
    expect(normalizeThreadId([])).toBe("");
  });
});
