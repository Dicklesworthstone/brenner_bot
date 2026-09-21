/**
 * Pre-Registration Lock - Prediction Sealing Before Evidence
 *
 * The SINGLE MOST CRITICAL feature for methodological integrity.
 * Without prediction locking, users can always claim post-hoc that they "knew it all along."
 * This defeats the entire purpose of discriminative testing.
 *
 * Core Mechanism:
 * - Lock predictions BEFORE evidence collection
 * - Cryptographic sealing (hash of prediction + timestamp)
 * - Visual lock status (🔒 icons)
 * - Amendment tracking for post-lock modifications
 *
 * @see brenner_bot-rffy (bead)
 * @module brenner-loop/prediction-lock
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Lock state for individual predictions.
 *
 * State semantics:
 * - draft: Prediction can be freely edited
 * - locked: Prediction sealed, waiting for evidence
 * - revealed: Evidence collected, prediction vs. outcome compared
 * - amended: User modified after evidence (flagged, credibility hit)
 */
export type PredictionLockState = "draft" | "locked" | "revealed" | "amended";

/**
 * The type of prediction (what the hypothesis predicts).
 */
export type PredictionType = "if_true" | "if_false" | "impossible_if_true";

/**
 * A sealed prediction with cryptographic integrity.
 *
 * Once locked, the original prediction text is IMMUTABLE.
 * Users CAN add notes/amendments, but original is preserved.
 */
export interface LockedPrediction {
  /** Unique identifier for this prediction */
  id: string;

  /** Which hypothesis this prediction belongs to */
  hypothesisId: string;

  /** The type of prediction */
  predictionType: PredictionType;

  /** Index in the original prediction array (for reference) */
  originalIndex: number;

  /** Current lock state */
  state: PredictionLockState;

  /** The original prediction text (IMMUTABLE once locked) */
  originalText: string;

  /** SHA-256 hash of (originalText + lockTimestamp) - tamper detection */
  lockHash: string;

  /** When the prediction was locked (ISO 8601) */
  lockTimestamp: string;

  /** When the prediction was revealed (ISO 8601, if revealed) */
  revealedAt?: string;

  /** The observed outcome (filled in when revealed) */
  observedOutcome?: string;

  /** Whether the prediction matched the outcome */
  outcomeMatch?: "confirmed" | "refuted" | "inconclusive";

  /** User's notes/amendments AFTER seeing evidence (flagged) */
  amendments?: PredictionAmendment[];
}

/**
 * An amendment made after evidence was seen.
 * Each amendment is tracked and reduces robustness score.
 */
export interface PredictionAmendment {
  /** When the amendment was made */
  amendedAt: string;

  /** The amendment type */
  type: "clarification" | "reinterpretation" | "scope_change" | "retraction";

  /** The amendment text */
  text: string;

  /** Reason given for the amendment */
  reason?: string;
}

/**
 * Result of a lock operation.
 */
export interface LockResult {
  success: boolean;
  lockedPrediction?: LockedPrediction;
  error?: string;
}

/**
 * Result of a reveal operation.
 */
export interface RevealResult {
  success: boolean;
  prediction?: LockedPrediction;
  error?: string;
}

/**
 * Result of hash verification.
 */
export interface VerificationResult {
  valid: boolean;
  prediction: LockedPrediction;
  error?: string;
}

/**
 * Statistics about prediction locking for a hypothesis.
 */
export interface PredictionLockStats {
  totalPredictions: number;
  locked: number;
  revealed: number;
  amended: number;
  confirmed: number;
  refuted: number;
  inconclusive: number;
  integrityScore: number; // 0-100, penalized by amendments
  amendmentCount: number;
}

// ============================================================================
// Cryptographic Functions
// ============================================================================

/**
 * Generate a SHA-256 hash of the input string.
 * Uses Web Crypto API for browser compatibility.
 *
 * @param input - String to hash
 * @returns Promise resolving to hex-encoded hash
 */
export async function generateHash(input: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  throw new Error(
    "Cryptographic capability missing: crypto.subtle is required for prediction locking.",
  );
}

/**
 * Create the seal string from prediction text and timestamp.
 * This is what gets hashed to create the lock hash.
 *
 * @param text - The prediction text
 * @param timestamp - The lock timestamp
 * @returns The string to be hashed
 */
function createSealString(text: string, timestamp: string): string {
  // Normalize text: trim whitespace, normalize unicode
  const normalizedText = text.trim().normalize("NFC");
  return `BRENNER_LOCK_v1|${normalizedText}|${timestamp}`;
}

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generate a unique prediction lock ID.
 *
 * Format: PL-{hypothesisId}-{type}-{index}-{uuid}
 *
 * @param hypothesisId - The parent hypothesis ID
 * @param predictionType - Type of prediction
 * @param index - Index in the prediction array
 * @returns Unique prediction lock ID
 */
export function generatePredictionLockId(
  hypothesisId: string,
  predictionType: PredictionType,
  index: number,
): string {
  const typeCode = predictionType === "if_true" ? "T" : predictionType === "if_false" ? "F" : "I";

  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `PL-${hypothesisId}-${typeCode}${index}-${uuid}`;

  // Fallback if randomUUID is missing (unlikely)
  const timestamp = Date.now().toString(16);
  let random = "";
  const crypto = globalThis.crypto;
  if (crypto?.getRandomValues) {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    random = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } else {
    random = Math.random().toString(16).slice(2, 18).padEnd(16, "0");
  }
  return `PL-${hypothesisId}-${typeCode}${index}-${timestamp}-${random}`;
}

// ============================================================================
// Core Lock Functions
// ============================================================================

/**
 * Lock a prediction, creating a cryptographic seal.
 *
 * This is the key anti-rationalization mechanism:
 * - The prediction text is captured exactly as written
 * - A hash is computed including the timestamp
 * - Once locked, the original cannot be modified
 *
 * @param hypothesisId - The parent hypothesis ID
 * @param predictionType - Type of prediction
 * @param originalIndex - Index in the original array
 * @param predictionText - The text of the prediction
 * @returns Promise resolving to LockResult
 */
export async function lockPrediction(
  hypothesisId: string,
  predictionType: PredictionType,
  originalIndex: number,
  predictionText: string,
): Promise<LockResult> {
  // Validate input
  if (!predictionText || predictionText.trim().length === 0) {
    return {
      success: false,
      error: "Prediction text cannot be empty",
    };
  }

  const normalizedText = predictionText.trim();
  const lockTimestamp = new Date().toISOString();

  // Create cryptographic seal
  const sealString = createSealString(normalizedText, lockTimestamp);
  let lockHash: string;
  try {
    lockHash = await generateHash(sealString);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to compute prediction lock hash";
    return { success: false, error: `Unable to lock prediction: ${message}` };
  }

  const lockedPrediction: LockedPrediction = {
    id: generatePredictionLockId(hypothesisId, predictionType, originalIndex),
    hypothesisId,
    predictionType,
    originalIndex,
    state: "locked",
    originalText: normalizedText,
    lockHash,
    lockTimestamp,
    amendments: [],
  };

  return {
    success: true,
    lockedPrediction,
  };
}

/**
 * Verify the integrity of a locked prediction.
 *
 * Checks that the stored hash matches a freshly computed hash
 * of the prediction text and timestamp. If they don't match,
 * the prediction may have been tampered with.
 *
 * @param prediction - The locked prediction to verify
 * @returns Promise resolving to VerificationResult
 */
export async function verifyPrediction(prediction: LockedPrediction): Promise<VerificationResult> {
  if (prediction.state === "draft") {
    return {
      valid: true,
      prediction,
      error: "Prediction is still in draft state (not locked)",
    };
  }

  const sealString = createSealString(prediction.originalText, prediction.lockTimestamp);
  let computedHash: string;
  try {
    computedHash = await generateHash(sealString);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to verify prediction integrity";
    return { valid: false, prediction, error: message };
  }

  const valid = computedHash === prediction.lockHash;

  return {
    valid,
    prediction,
    error: valid ? undefined : "Hash mismatch - prediction may have been tampered with",
  };
}

/**
 * Reveal a prediction by recording the observed outcome.
 *
 * This is called after evidence has been collected.
 * The prediction is compared against the outcome.
 *
 * @param prediction - The locked prediction to reveal
 * @param observedOutcome - What was actually observed
 * @param outcomeMatch - Whether the prediction was confirmed, refuted, or inconclusive
 * @returns RevealResult
 */
export function revealPrediction(
  prediction: LockedPrediction,
  observedOutcome: string,
  outcomeMatch: "confirmed" | "refuted" | "inconclusive",
): RevealResult {
  if (prediction.state === "draft") {
    return {
      success: false,
      error: "Cannot reveal a draft prediction - it must be locked first",
    };
  }

  if (prediction.state === "revealed" || prediction.state === "amended") {
    return {
      success: false,
      error: "Prediction has already been revealed",
    };
  }

  const revealed: LockedPrediction = {
    ...prediction,
    state: "revealed",
    revealedAt: new Date().toISOString(),
    observedOutcome,
    outcomeMatch,
  };

  return {
    success: true,
    prediction: revealed,
  };
}

/**
 * Add an amendment to a revealed prediction.
 *
 * Amendments are allowed but FLAGGED - they reduce the credibility
 * of the prediction and the robustness score.
 *
 * @param prediction - The revealed prediction to amend
 * @param amendmentType - Type of amendment
 * @param text - The amendment text
 * @param reason - Reason for the amendment
 * @returns The amended prediction
 */
export function amendPrediction(
  prediction: LockedPrediction,
  amendmentType: PredictionAmendment["type"],
  text: string,
  reason?: string,
): LockedPrediction {
  if (prediction.state === "draft" || prediction.state === "locked") {
    throw new Error("Cannot amend a prediction that has not been revealed");
  }

  const amendment: PredictionAmendment = {
    amendedAt: new Date().toISOString(),
    type: amendmentType,
    text: text.trim(),
    reason,
  };

  return {
    ...prediction,
    state: "amended",
    amendments: [...(prediction.amendments || []), amendment],
  };
}

// ============================================================================
// Statistics & Scoring
// ============================================================================

/**
 * Calculate prediction lock statistics for a set of predictions.
 *
 * @param predictions - Array of locked predictions
 * @returns PredictionLockStats
 */
export function calculatePredictionLockStats(predictions: LockedPrediction[]): PredictionLockStats {
  const stats: PredictionLockStats = {
    totalPredictions: predictions.length,
    locked: 0,
    revealed: 0,
    amended: 0,
    confirmed: 0,
    refuted: 0,
    inconclusive: 0,
    integrityScore: 100,
    amendmentCount: 0,
  };

  for (const pred of predictions) {
    switch (pred.state) {
      case "locked":
        stats.locked++;
        break;
      case "revealed":
        stats.revealed++;
        break;
      case "amended":
        stats.amended++;
        break;
    }

    if (pred.outcomeMatch === "confirmed") stats.confirmed++;
    if (pred.outcomeMatch === "refuted") stats.refuted++;
    if (pred.outcomeMatch === "inconclusive") stats.inconclusive++;

    stats.amendmentCount += pred.amendments?.length || 0;
  }

  // Calculate integrity score
  // Start at 100, deduct for amendments
  // Each amendment reduces score by 5 points
  // Amended predictions also reduce score by 10 points each
  const amendmentPenalty = stats.amendmentCount * 5;
  const amendedPredictionPenalty = stats.amended * 10;
  stats.integrityScore = Math.max(0, 100 - amendmentPenalty - amendedPredictionPenalty);

  return stats;
}

/**
 * Calculate the robustness impact of prediction lock status.
 *
 * This is used to adjust the overall hypothesis robustness score
 * based on how well predictions were locked and how few amendments were made.
 *
 * @param stats - Prediction lock statistics
 * @returns A multiplier (0.5 - 1.0) to apply to robustness score
 */
export function calculateRobustnessMultiplier(stats: PredictionLockStats): number {
  if (stats.totalPredictions === 0) return 1.0;

  // Base multiplier starts at 1.0
  let multiplier = 1.0;

  // Penalty for having unkeyed predictions (not yet locked)
  const lockedRatio = (stats.locked + stats.revealed + stats.amended) / stats.totalPredictions;
  multiplier *= 0.5 + 0.5 * lockedRatio; // 0.5 if none locked, 1.0 if all locked

  // Penalty for amendments (integrity score maps to 0.5-1.0)
  multiplier *= 0.5 + 0.5 * (stats.integrityScore / 100);

  return Math.max(0.5, Math.min(1.0, multiplier));
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a value is a valid PredictionLockState.
 */
export function isPredictionLockState(value: unknown): value is PredictionLockState {
  return typeof value === "string" && ["draft", "locked", "revealed", "amended"].includes(value);
}

/**
 * Check if a value is a valid PredictionType.
 */
export function isPredictionType(value: unknown): value is PredictionType {
  return typeof value === "string" && ["if_true", "if_false", "impossible_if_true"].includes(value);
}

/**
 * Check if an object is a valid LockedPrediction.
 */
export function isLockedPrediction(obj: unknown): obj is LockedPrediction {
  if (typeof obj !== "object" || obj === null) return false;

  const pred = obj as Record<string, unknown>;

  return (
    typeof pred.id === "string" &&
    typeof pred.hypothesisId === "string" &&
    isPredictionType(pred.predictionType) &&
    typeof pred.originalIndex === "number" &&
    isPredictionLockState(pred.state) &&
    typeof pred.originalText === "string" &&
    typeof pred.lockHash === "string" &&
    typeof pred.lockTimestamp === "string"
  );
}

// ============================================================================
// Display Helpers
// ============================================================================

/**
 * Get display configuration for a lock state.
 */
export interface LockStateDisplay {
  label: string;
  icon: string;
  colorClass: string;
  description: string;
}

/**
 * Display configuration for each lock state.
 */
export const LOCK_STATE_DISPLAY: Record<PredictionLockState, LockStateDisplay> = {
  draft: {
    label: "Draft",
    icon: "pencil",
    colorClass: "text-slate-500",
    description: "This prediction can still be edited",
  },
  locked: {
    label: "Locked",
    icon: "lock",
    colorClass: "text-blue-600",
    description: "Sealed before evidence - cannot be changed",
  },
  revealed: {
    label: "Revealed",
    icon: "eye",
    colorClass: "text-green-600",
    description: "Compared against observed outcome",
  },
  amended: {
    label: "Amended",
    icon: "alert-triangle",
    colorClass: "text-amber-600",
    description: "Modified after seeing evidence (flagged)",
  },
};

/**
 * Get the lock state display configuration.
 */
export function getLockStateDisplay(state: PredictionLockState): LockStateDisplay {
  return LOCK_STATE_DISPLAY[state];
}

/**
 * Format lock timestamp for display.
 */
export function formatLockTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get a short hash display (first 8 chars).
 */
export function getShortHash(hash: string): string {
  return hash.substring(0, 8);
}
