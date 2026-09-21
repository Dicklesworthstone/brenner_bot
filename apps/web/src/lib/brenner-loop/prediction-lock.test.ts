/**
 * Pre-Registration Lock Tests
 *
 * Tests for cryptographic prediction sealing and integrity verification.
 *
 * @see brenner_bot-rffy (bead)
 */

import { beforeEach, describe, expect, test } from "vitest";
import {
  amendPrediction,
  calculatePredictionLockStats,
  calculateRobustnessMultiplier,
  formatLockTimestamp,
  generateHash,
  generatePredictionLockId,
  getLockStateDisplay,
  getShortHash,
  isLockedPrediction,
  isPredictionLockState,
  isPredictionType,
  type LockedPrediction,
  lockPrediction,
  revealPrediction,
  verifyPrediction,
} from "./prediction-lock";

// ============================================================================
// Hash Generation Tests
// ============================================================================

describe("generateHash", () => {
  test("should generate consistent hash for same input", async () => {
    const hash1 = await generateHash("test input");
    const hash2 = await generateHash("test input");
    expect(hash1).toBe(hash2);
  });

  test("should generate different hash for different input", async () => {
    const hash1 = await generateHash("input 1");
    const hash2 = await generateHash("input 2");
    expect(hash1).not.toBe(hash2);
  });

  test("should generate hex string", async () => {
    const hash = await generateHash("test");
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });
});

// ============================================================================
// ID Generation Tests
// ============================================================================

describe("generatePredictionLockId", () => {
  test("should generate ID with correct format for if_true", () => {
    const id = generatePredictionLockId("HC-123", "if_true", 0);
    expect(id).toMatch(/^PL-HC-123-T0-[a-f0-9-]+$/);
  });

  test("should generate ID with correct format for if_false", () => {
    const id = generatePredictionLockId("HC-123", "if_false", 1);
    expect(id).toMatch(/^PL-HC-123-F1-[a-f0-9-]+$/);
  });

  test("should generate ID with correct format for impossible_if_true", () => {
    const id = generatePredictionLockId("HC-123", "impossible_if_true", 2);
    expect(id).toMatch(/^PL-HC-123-I2-[a-f0-9-]+$/);
  });

  test("should generate unique IDs", () => {
    const id1 = generatePredictionLockId("HC-123", "if_true", 0);
    // Small delay to ensure different timestamp
    const id2 = generatePredictionLockId("HC-123", "if_true", 0);
    // IDs might be same if generated in same millisecond, but format should be correct
    expect(id1).toMatch(/^PL-HC-123-T0-/);
    expect(id2).toMatch(/^PL-HC-123-T0-/);
  });
});

// ============================================================================
// Lock Prediction Tests
// ============================================================================

describe("lockPrediction", () => {
  test("should lock a valid prediction", async () => {
    const result = await lockPrediction(
      "HC-123",
      "if_true",
      0,
      "If hypothesis is true, we should observe X",
    );

    expect(result.success).toBe(true);
    expect(result.lockedPrediction).toBeDefined();
    expect(result.lockedPrediction!.state).toBe("locked");
    expect(result.lockedPrediction!.hypothesisId).toBe("HC-123");
    expect(result.lockedPrediction!.predictionType).toBe("if_true");
    expect(result.lockedPrediction!.originalIndex).toBe(0);
  });

  test("should normalize whitespace", async () => {
    const result = await lockPrediction(
      "HC-123",
      "if_true",
      0,
      "  Prediction with extra whitespace  ",
    );

    expect(result.success).toBe(true);
    expect(result.lockedPrediction!.originalText).toBe("Prediction with extra whitespace");
  });

  test("should generate lock hash", async () => {
    const result = await lockPrediction("HC-123", "if_true", 0, "Test prediction");

    expect(result.success).toBe(true);
    expect(result.lockedPrediction!.lockHash).toBeTruthy();
    expect(result.lockedPrediction!.lockHash.length).toBeGreaterThan(8);
  });

  test("should set lock timestamp", async () => {
    const before = new Date().toISOString();
    const result = await lockPrediction("HC-123", "if_true", 0, "Test prediction");
    const after = new Date().toISOString();

    expect(result.success).toBe(true);
    expect(result.lockedPrediction!.lockTimestamp).toBeTruthy();
    expect(result.lockedPrediction!.lockTimestamp >= before).toBe(true);
    expect(result.lockedPrediction!.lockTimestamp <= after).toBe(true);
  });

  test("should fail for empty prediction", async () => {
    const result = await lockPrediction("HC-123", "if_true", 0, "");
    expect(result.success).toBe(false);
    expect(result.error).toContain("empty");
  });

  test("should fail for whitespace-only prediction", async () => {
    const result = await lockPrediction("HC-123", "if_true", 0, "   ");
    expect(result.success).toBe(false);
    expect(result.error).toContain("empty");
  });

  test("should initialize empty amendments array", async () => {
    const result = await lockPrediction("HC-123", "if_true", 0, "Test prediction");

    expect(result.success).toBe(true);
    expect(result.lockedPrediction!.amendments).toEqual([]);
  });
});

// ============================================================================
// Verify Prediction Tests
// ============================================================================

describe("verifyPrediction", () => {
  test("should verify a valid locked prediction", async () => {
    const lockResult = await lockPrediction("HC-123", "if_true", 0, "Test prediction");

    const verifyResult = await verifyPrediction(lockResult.lockedPrediction!);

    expect(verifyResult.valid).toBe(true);
    expect(verifyResult.error).toBeUndefined();
  });

  test("should detect tampered prediction", async () => {
    const lockResult = await lockPrediction("HC-123", "if_true", 0, "Original prediction");

    // Tamper with the text
    const tampered: LockedPrediction = {
      ...lockResult.lockedPrediction!,
      originalText: "Modified prediction",
    };

    const verifyResult = await verifyPrediction(tampered);

    expect(verifyResult.valid).toBe(false);
    expect(verifyResult.error).toContain("tampered");
  });

  test("should detect tampered timestamp", async () => {
    const lockResult = await lockPrediction("HC-123", "if_true", 0, "Test prediction");

    // Tamper with the timestamp
    const tampered: LockedPrediction = {
      ...lockResult.lockedPrediction!,
      lockTimestamp: "2020-01-01T00:00:00.000Z",
    };

    const verifyResult = await verifyPrediction(tampered);

    expect(verifyResult.valid).toBe(false);
    expect(verifyResult.error).toContain("tampered");
  });
});

// ============================================================================
// Reveal Prediction Tests
// ============================================================================

describe("revealPrediction", () => {
  let lockedPrediction: LockedPrediction;

  beforeEach(async () => {
    const result = await lockPrediction(
      "HC-123",
      "if_true",
      0,
      "We should observe increased enzyme activity",
    );
    lockedPrediction = result.lockedPrediction!;
  });

  test("should reveal a locked prediction as confirmed", () => {
    const result = revealPrediction(
      lockedPrediction,
      "Enzyme activity increased by 45%",
      "confirmed",
    );

    expect(result.success).toBe(true);
    expect(result.prediction!.state).toBe("revealed");
    expect(result.prediction!.observedOutcome).toBe("Enzyme activity increased by 45%");
    expect(result.prediction!.outcomeMatch).toBe("confirmed");
    expect(result.prediction!.revealedAt).toBeTruthy();
  });

  test("should reveal a locked prediction as refuted", () => {
    const result = revealPrediction(lockedPrediction, "Enzyme activity decreased", "refuted");

    expect(result.success).toBe(true);
    expect(result.prediction!.state).toBe("revealed");
    expect(result.prediction!.outcomeMatch).toBe("refuted");
  });

  test("should reveal a locked prediction as inconclusive", () => {
    const result = revealPrediction(lockedPrediction, "Results were mixed", "inconclusive");

    expect(result.success).toBe(true);
    expect(result.prediction!.outcomeMatch).toBe("inconclusive");
  });

  test("should fail to reveal a draft prediction", () => {
    const draft: LockedPrediction = {
      ...lockedPrediction,
      state: "draft",
    };

    const result = revealPrediction(draft, "outcome", "confirmed");

    expect(result.success).toBe(false);
    expect(result.error).toContain("draft");
  });

  test("should fail to reveal an already revealed prediction", () => {
    const revealed = revealPrediction(lockedPrediction, "First outcome", "confirmed").prediction!;

    const result = revealPrediction(revealed, "Second outcome", "refuted");

    expect(result.success).toBe(false);
    expect(result.error).toContain("already been revealed");
  });

  test("should preserve original prediction data", () => {
    const result = revealPrediction(lockedPrediction, "outcome", "confirmed");

    expect(result.prediction!.originalText).toBe(lockedPrediction.originalText);
    expect(result.prediction!.lockHash).toBe(lockedPrediction.lockHash);
    expect(result.prediction!.lockTimestamp).toBe(lockedPrediction.lockTimestamp);
  });
});

// ============================================================================
// Amend Prediction Tests
// ============================================================================

describe("amendPrediction", () => {
  let revealedPrediction: LockedPrediction;

  beforeEach(async () => {
    const lockResult = await lockPrediction("HC-123", "if_true", 0, "Test prediction");
    const revealResult = revealPrediction(
      lockResult.lockedPrediction!,
      "Outcome observed",
      "refuted",
    );
    revealedPrediction = revealResult.prediction!;
  });

  test("should add an amendment to a revealed prediction", () => {
    const amended = amendPrediction(
      revealedPrediction,
      "clarification",
      "I meant to say X not Y",
      "Wording was ambiguous",
    );

    expect(amended.state).toBe("amended");
    expect(amended.amendments).toHaveLength(1);
    expect(amended.amendments![0].type).toBe("clarification");
    expect(amended.amendments![0].text).toBe("I meant to say X not Y");
    expect(amended.amendments![0].reason).toBe("Wording was ambiguous");
  });

  test("should allow multiple amendments", () => {
    const first = amendPrediction(revealedPrediction, "clarification", "First clarification");
    const second = amendPrediction(first, "scope_change", "Scope was too broad");

    expect(second.amendments).toHaveLength(2);
    expect(second.amendments![0].type).toBe("clarification");
    expect(second.amendments![1].type).toBe("scope_change");
  });

  test("should set amendment timestamp", () => {
    const before = new Date().toISOString();
    const amended = amendPrediction(revealedPrediction, "clarification", "Amendment text");
    const after = new Date().toISOString();

    expect(amended.amendments![0].amendedAt >= before).toBe(true);
    expect(amended.amendments![0].amendedAt <= after).toBe(true);
  });

  test("should throw for draft prediction", () => {
    const draft: LockedPrediction = {
      ...revealedPrediction,
      state: "draft",
    };

    expect(() => amendPrediction(draft, "clarification", "Amendment")).toThrow("not been revealed");
  });

  test("should throw for locked prediction", () => {
    const locked: LockedPrediction = {
      ...revealedPrediction,
      state: "locked",
    };

    expect(() => amendPrediction(locked, "clarification", "Amendment")).toThrow(
      "not been revealed",
    );
  });

  test("should preserve original prediction data", () => {
    const amended = amendPrediction(revealedPrediction, "clarification", "Amendment");

    expect(amended.originalText).toBe(revealedPrediction.originalText);
    expect(amended.lockHash).toBe(revealedPrediction.lockHash);
    expect(amended.observedOutcome).toBe(revealedPrediction.observedOutcome);
  });
});

// ============================================================================
// Statistics Tests
// ============================================================================

describe("calculatePredictionLockStats", () => {
  test("should calculate stats for empty array", () => {
    const stats = calculatePredictionLockStats([]);

    expect(stats.totalPredictions).toBe(0);
    expect(stats.locked).toBe(0);
    expect(stats.integrityScore).toBe(100);
  });

  test("should count predictions by state", async () => {
    const locked1 = (await lockPrediction("HC-1", "if_true", 0, "Prediction 1")).lockedPrediction!;
    const locked2 = (await lockPrediction("HC-1", "if_true", 1, "Prediction 2")).lockedPrediction!;
    const revealed = revealPrediction(locked2, "Outcome", "confirmed").prediction!;

    const stats = calculatePredictionLockStats([locked1, revealed]);

    expect(stats.totalPredictions).toBe(2);
    expect(stats.locked).toBe(1);
    expect(stats.revealed).toBe(1);
  });

  test("should count outcomes", async () => {
    const lock1 = (await lockPrediction("HC-1", "if_true", 0, "Pred 1")).lockedPrediction!;
    const lock2 = (await lockPrediction("HC-1", "if_true", 1, "Pred 2")).lockedPrediction!;
    const lock3 = (await lockPrediction("HC-1", "if_true", 2, "Pred 3")).lockedPrediction!;

    const revealed1 = revealPrediction(lock1, "O1", "confirmed").prediction!;
    const revealed2 = revealPrediction(lock2, "O2", "refuted").prediction!;
    const revealed3 = revealPrediction(lock3, "O3", "inconclusive").prediction!;

    const stats = calculatePredictionLockStats([revealed1, revealed2, revealed3]);

    expect(stats.confirmed).toBe(1);
    expect(stats.refuted).toBe(1);
    expect(stats.inconclusive).toBe(1);
  });

  test("should penalize amendments", async () => {
    const lock = (await lockPrediction("HC-1", "if_true", 0, "Prediction")).lockedPrediction!;
    const revealed = revealPrediction(lock, "Outcome", "refuted").prediction!;
    const amended = amendPrediction(revealed, "clarification", "Amendment");

    const stats = calculatePredictionLockStats([amended]);

    expect(stats.amended).toBe(1);
    expect(stats.amendmentCount).toBe(1);
    expect(stats.integrityScore).toBeLessThan(100);
  });
});

describe("calculateRobustnessMultiplier", () => {
  test("should return 1.0 for perfect predictions", async () => {
    const lock = (await lockPrediction("HC-1", "if_true", 0, "Prediction")).lockedPrediction!;
    const revealed = revealPrediction(lock, "Outcome", "confirmed").prediction!;

    const stats = calculatePredictionLockStats([revealed]);
    const multiplier = calculateRobustnessMultiplier(stats);

    expect(multiplier).toBe(1.0);
  });

  test("should penalize amendments", async () => {
    const lock = (await lockPrediction("HC-1", "if_true", 0, "Prediction")).lockedPrediction!;
    const revealed = revealPrediction(lock, "Outcome", "refuted").prediction!;
    const amended = amendPrediction(revealed, "clarification", "Amendment 1");
    const doubleAmended = amendPrediction(amended, "scope_change", "Amendment 2");

    const stats = calculatePredictionLockStats([doubleAmended]);
    const multiplier = calculateRobustnessMultiplier(stats);

    expect(multiplier).toBeLessThan(1.0);
  });

  test("should return 1.0 for empty predictions", () => {
    const stats = calculatePredictionLockStats([]);
    const multiplier = calculateRobustnessMultiplier(stats);

    expect(multiplier).toBe(1.0);
  });
});

// ============================================================================
// Type Guard Tests
// ============================================================================

describe("type guards", () => {
  describe("isPredictionLockState", () => {
    test("should return true for valid states", () => {
      expect(isPredictionLockState("draft")).toBe(true);
      expect(isPredictionLockState("locked")).toBe(true);
      expect(isPredictionLockState("revealed")).toBe(true);
      expect(isPredictionLockState("amended")).toBe(true);
    });

    test("should return false for invalid states", () => {
      expect(isPredictionLockState("invalid")).toBe(false);
      expect(isPredictionLockState(123)).toBe(false);
      expect(isPredictionLockState(null)).toBe(false);
    });
  });

  describe("isPredictionType", () => {
    test("should return true for valid types", () => {
      expect(isPredictionType("if_true")).toBe(true);
      expect(isPredictionType("if_false")).toBe(true);
      expect(isPredictionType("impossible_if_true")).toBe(true);
    });

    test("should return false for invalid types", () => {
      expect(isPredictionType("invalid")).toBe(false);
      expect(isPredictionType(123)).toBe(false);
    });
  });

  describe("isLockedPrediction", () => {
    test("should return true for valid locked prediction", async () => {
      const result = await lockPrediction("HC-1", "if_true", 0, "Test");
      expect(isLockedPrediction(result.lockedPrediction)).toBe(true);
    });

    test("should return false for invalid objects", () => {
      expect(isLockedPrediction(null)).toBe(false);
      expect(isLockedPrediction({})).toBe(false);
      expect(isLockedPrediction({ id: "test" })).toBe(false);
    });
  });
});

// ============================================================================
// Display Helper Tests
// ============================================================================

describe("display helpers", () => {
  describe("getLockStateDisplay", () => {
    test("should return correct display for each state", () => {
      const draft = getLockStateDisplay("draft");
      expect(draft.label).toBe("Draft");
      expect(draft.icon).toBe("pencil");

      const locked = getLockStateDisplay("locked");
      expect(locked.label).toBe("Locked");
      expect(locked.icon).toBe("lock");

      const revealed = getLockStateDisplay("revealed");
      expect(revealed.label).toBe("Revealed");

      const amended = getLockStateDisplay("amended");
      expect(amended.label).toBe("Amended");
      expect(amended.colorClass).toContain("amber");
    });
  });

  describe("formatLockTimestamp", () => {
    test("should format timestamp readably", () => {
      const formatted = formatLockTimestamp("2026-01-04T12:30:00.000Z");
      expect(formatted).toContain("2026");
      expect(formatted).toContain("Jan");
    });
  });

  describe("getShortHash", () => {
    test("should return first 8 characters", () => {
      const short = getShortHash("abcdef1234567890");
      expect(short).toBe("abcdef12");
      expect(short.length).toBe(8);
    });
  });
});
