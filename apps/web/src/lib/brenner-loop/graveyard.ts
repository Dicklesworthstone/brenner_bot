/**
 * Hypothesis Graveyard - Learning from Falsification
 *
 * The Graveyard system celebrates falsification as the most informative outcome.
 * When a hypothesis is falsified, this module provides:
 * - Dignified "death ceremony" workflow
 * - Learning extraction prompts
 * - Successor hypothesis tracking
 * - Failure pattern analysis
 *
 * Key Brenner insight: "Being proven wrong is not a failure — it's the most
 * informative outcome. You've eliminated a possibility and narrowed the search space."
 *
 * @see brenner_bot-an1n.7 (bead)
 * @see brenner_bot-an1n (parent epic: Hypothesis Engine)
 * @module brenner-loop/graveyard
 */

import type { EvidenceEntry } from "./evidence";
import type { HypothesisCard } from "./hypothesis";

// ============================================================================
// Death Types
// ============================================================================

/**
 * How a hypothesis met its end.
 *
 * Different death types provide different learning opportunities:
 * - direct_falsification: Strongest signal - impossible observation occurred
 * - mechanism_failure: Proposed pathway doesn't work
 * - effect_size_collapse: Effect is too small to matter (still technically true)
 * - superseded: Better hypothesis emerged (not strictly falsified)
 * - unmeasurable: Can't be tested with current methods (suspended, not dead)
 * - scope_reduction: Valid only in narrow conditions (partial death)
 */
export type DeathType =
  | "direct_falsification" // Impossible observation occurred
  | "mechanism_failure" // Proposed pathway doesn't work
  | "effect_size_collapse" // Effect is too small to matter
  | "superseded" // Better hypothesis emerged
  | "unmeasurable" // Can't be tested with current methods
  | "scope_reduction"; // Valid only in narrow conditions

/**
 * All valid death types for type guard
 */
const VALID_DEATH_TYPES: DeathType[] = [
  "direct_falsification",
  "mechanism_failure",
  "effect_size_collapse",
  "superseded",
  "unmeasurable",
  "scope_reduction",
];

/**
 * Human-readable labels for death types
 */
export const DEATH_TYPE_LABELS: Record<DeathType, string> = {
  direct_falsification: "Direct Falsification",
  mechanism_failure: "Mechanism Failure",
  effect_size_collapse: "Effect Size Collapse",
  superseded: "Superseded",
  unmeasurable: "Unmeasurable",
  scope_reduction: "Scope Reduction",
};

/**
 * Descriptions for each death type (for UI tooltips)
 */
export const DEATH_TYPE_DESCRIPTIONS: Record<DeathType, string> = {
  direct_falsification:
    "An observation occurred that the hypothesis said was impossible. This is the cleanest form of falsification.",
  mechanism_failure:
    "The proposed causal mechanism was tested and found to not work. The effect might exist but not for the hypothesized reason.",
  effect_size_collapse:
    "The effect is too small to be practically meaningful. The hypothesis may be technically true but doesn't matter.",
  superseded:
    "A better hypothesis emerged that explains more with fewer assumptions. The old hypothesis isn't falsified, just outcompeted.",
  unmeasurable:
    "Cannot be tested with current methods or technology. The hypothesis is suspended, not dead.",
  scope_reduction:
    "The hypothesis is valid only under narrow conditions. It's been reduced from a general claim to a specific case.",
};

/**
 * Emoji/icon for each death type
 */
export const DEATH_TYPE_ICONS: Record<DeathType, string> = {
  direct_falsification: "💀", // Definitive death
  mechanism_failure: "⚙️", // Broken mechanism
  effect_size_collapse: "📉", // Shrinking effect
  superseded: "👑", // Crowned successor
  unmeasurable: "❓", // Unknown/uncertain
  scope_reduction: "🔬", // Narrowed scope
};

/**
 * Type guard for DeathType
 */
export function isDeathType(value: unknown): value is DeathType {
  return typeof value === "string" && VALID_DEATH_TYPES.includes(value as DeathType);
}

// ============================================================================
// Brenner Quotes for Falsification
// ============================================================================

/**
 * Brenner quotes about falsification, organized by death type.
 * These provide comfort and context when a hypothesis is falsified.
 */
export const BRENNER_FALSIFICATION_QUOTES: Record<DeathType, string[]> = {
  direct_falsification: [
    "This is not a failure. This is progress. You now know something you didn't before.",
    "The hypothesis was proven wrong - that's the best possible outcome. Ambiguity is the enemy, not falsification.",
    "A decisively killed hypothesis is worth more than ten weakly supported ones.",
  ],
  mechanism_failure: [
    "The effect might be real, but not for the reasons you thought. That's valuable knowledge.",
    "Understanding why something doesn't work teaches you how the world actually works.",
    "Wrong mechanisms are stepping stones to right ones.",
  ],
  effect_size_collapse: [
    "A tiny effect is often worse than no effect - it means the hypothesis wasn't even worth testing.",
    "Effect sizes matter more than statistical significance. You've learned what matters and what doesn't.",
    "Small effects suggest you're looking at the wrong level of explanation.",
  ],
  superseded: [
    "Being replaced by a better idea is the natural lifecycle of hypotheses.",
    "Science progresses when good ideas are replaced by better ones.",
    "The purpose of a hypothesis is to be superseded by a better one.",
  ],
  unmeasurable: [
    "An unmeasurable hypothesis isn't useless - it just needs better tools.",
    "Sometimes the limitation is in our instruments, not our ideas.",
    "Document what would need to exist to test this. Future you will thank you.",
  ],
  scope_reduction: [
    "A narrow truth is still a truth. Most grand theories become specialized tools.",
    "Understanding the boundaries of an idea is as valuable as the idea itself.",
    "General claims that become specific findings are how knowledge accumulates.",
  ],
};

/**
 * Get a random Brenner quote for a death type
 */
export function getRandomBrennerQuote(deathType: DeathType): string {
  const quotes = BRENNER_FALSIFICATION_QUOTES[deathType];
  const index = Math.floor(Math.random() * quotes.length);
  return quotes[index];
}

// ============================================================================
// Core Interfaces
// ============================================================================

/**
 * Learning extracted from a falsification event.
 * This is the key value-add of the graveyard system.
 */
export interface FalsificationLearning {
  /** What we learned from this failure */
  lessonsLearned: string[];

  /** What we now know to be true (or false) */
  whatWeNowKnow: string[];

  /** Questions that remain unanswered */
  whatRemainsOpen: string[];

  /** Ideas for next steps */
  suggestedNextSteps: string[];
}

/**
 * A hypothesis that has been falsified and archived.
 * The "death certificate" for a hypothesis.
 */
export interface FalsifiedHypothesis {
  /** Unique identifier for this graveyard entry */
  id: string;

  /** The hypothesis that was falsified (full HypothesisCard) */
  hypothesis: HypothesisCard;

  /** Session ID where the falsification occurred */
  sessionId: string;

  // === Death Certificate ===

  /** When the hypothesis was falsified */
  falsifiedAt: Date;

  /** The evidence/test that killed it */
  killingBlow: EvidenceEntry;

  /** How the hypothesis died */
  deathType: DeathType;

  /** Brief summary of why it was falsified */
  deathSummary: string;

  // === Learning Extraction ===

  /** Extracted learning from the falsification */
  learning: FalsificationLearning;

  // === Legacy ===

  /** IDs of hypotheses that emerged from this failure */
  successorHypothesisIds: string[];

  /** IDs of other hypotheses informed by this death */
  contributedToIds: string[];

  // === Epitaph ===

  /** User's summary of what was learned (the epitaph) */
  epitaph: string;

  /** Brenner quote selected for this death */
  brennerQuote: string;

  // === Metadata ===

  /** Who archived this hypothesis */
  archivedBy?: string;

  /** Additional notes */
  notes?: string;

  /** Tags for categorization */
  tags?: string[];
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Result of validating a FalsifiedHypothesis
 */
export interface GraveyardValidationResult {
  /** Whether the entry is valid */
  valid: boolean;

  /** List of validation errors */
  errors: GraveyardValidationError[];

  /** List of validation warnings */
  warnings: GraveyardValidationWarning[];
}

/**
 * A validation error for FalsifiedHypothesis
 */
export interface GraveyardValidationError {
  /** Field that failed validation */
  field: string;

  /** Error message */
  message: string;

  /** Error code */
  code: GraveyardValidationErrorCode;
}

/**
 * A validation warning for FalsifiedHypothesis
 */
export interface GraveyardValidationWarning {
  /** Field with the warning */
  field: string;

  /** Warning message */
  message: string;

  /** Warning code */
  code: GraveyardValidationWarningCode;
}

/**
 * Error codes for graveyard validation
 */
export type GraveyardValidationErrorCode =
  | "MISSING_REQUIRED"
  | "INVALID_TYPE"
  | "INVALID_FORMAT"
  | "HYPOTHESIS_INVALID"
  | "EVIDENCE_INVALID";

/**
 * Warning codes for graveyard validation
 */
export type GraveyardValidationWarningCode =
  | "NO_LESSONS"
  | "NO_EPITAPH"
  | "NO_SUCCESSORS"
  | "SHORT_DEATH_SUMMARY";

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Check if a value is a valid Date or ISO date string.
 */
function isValidDateOrString(value: unknown): boolean {
  if (value instanceof Date) {
    return !isNaN(value.getTime());
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return !isNaN(parsed);
  }
  return false;
}

/**
 * Validate a FalsifiedHypothesis for completeness and correctness.
 *
 * @param entry - The FalsifiedHypothesis to validate
 * @returns GraveyardValidationResult with errors and warnings
 */
export function validateFalsifiedHypothesis(entry: FalsifiedHypothesis): GraveyardValidationResult {
  const errors: GraveyardValidationError[] = [];
  const warnings: GraveyardValidationWarning[] = [];

  // === Required String Fields ===

  if (!entry.id || entry.id.trim().length === 0) {
    errors.push({
      field: "id",
      message: "ID is required",
      code: "MISSING_REQUIRED",
    });
  }

  if (!entry.sessionId || entry.sessionId.trim().length === 0) {
    errors.push({
      field: "sessionId",
      message: "Session ID is required",
      code: "MISSING_REQUIRED",
    });
  }

  // === Death Type ===

  if (!isDeathType(entry.deathType)) {
    errors.push({
      field: "deathType",
      message: `Death type must be one of: ${VALID_DEATH_TYPES.join(", ")}`,
      code: "INVALID_TYPE",
    });
  }

  // === Death Summary ===

  if (!entry.deathSummary || entry.deathSummary.trim().length === 0) {
    errors.push({
      field: "deathSummary",
      message: "Death summary is required",
      code: "MISSING_REQUIRED",
    });
  } else if (entry.deathSummary.trim().length < 20) {
    warnings.push({
      field: "deathSummary",
      message: "Consider providing a more detailed death summary",
      code: "SHORT_DEATH_SUMMARY",
    });
  }

  // === Date ===

  if (!isValidDateOrString(entry.falsifiedAt)) {
    errors.push({
      field: "falsifiedAt",
      message: "falsifiedAt must be a valid Date or ISO date string",
      code: "INVALID_TYPE",
    });
  }

  // === Hypothesis (basic check) ===

  if (!entry.hypothesis || typeof entry.hypothesis !== "object") {
    errors.push({
      field: "hypothesis",
      message: "Hypothesis is required",
      code: "HYPOTHESIS_INVALID",
    });
  }

  // === Killing Blow (basic check) ===

  if (!entry.killingBlow || typeof entry.killingBlow !== "object") {
    errors.push({
      field: "killingBlow",
      message: "Killing blow evidence is required",
      code: "EVIDENCE_INVALID",
    });
  }

  // === Learning ===

  if (!entry.learning || typeof entry.learning !== "object") {
    errors.push({
      field: "learning",
      message: "Learning object is required",
      code: "MISSING_REQUIRED",
    });
  } else {
    const l = entry.learning;
    if (!l.lessonsLearned || l.lessonsLearned.length === 0) {
      warnings.push({
        field: "learning.lessonsLearned",
        message: "Consider documenting what you learned from this falsification",
        code: "NO_LESSONS",
      });
    }
  }

  // === Epitaph ===

  if (!entry.epitaph || entry.epitaph.trim().length === 0) {
    warnings.push({
      field: "epitaph",
      message: "Consider writing an epitaph summarizing what was learned",
      code: "NO_EPITAPH",
    });
  }

  // === Successors ===

  if (
    (!entry.successorHypothesisIds || entry.successorHypothesisIds.length === 0) &&
    entry.deathType !== "unmeasurable"
  ) {
    warnings.push({
      field: "successorHypothesisIds",
      message: "Consider identifying what hypotheses should be explored next",
      code: "NO_SUCCESSORS",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if an unknown value is a valid FalsifiedHypothesis.
 */
export function isFalsifiedHypothesis(obj: unknown): obj is FalsifiedHypothesis {
  if (typeof obj !== "object" || obj === null) return false;

  const entry = obj as Record<string, unknown>;

  // Check required string fields
  if (typeof entry.id !== "string") return false;
  if (typeof entry.sessionId !== "string") return false;
  if (typeof entry.deathSummary !== "string") return false;
  if (typeof entry.epitaph !== "string") return false;
  if (typeof entry.brennerQuote !== "string") return false;

  // Check death type
  if (!isDeathType(entry.deathType)) return false;

  // Check date
  if (!isValidDateOrString(entry.falsifiedAt)) return false;

  // Check objects exist (deep validation done separately)
  if (typeof entry.hypothesis !== "object" || entry.hypothesis === null) return false;
  if (typeof entry.killingBlow !== "object" || entry.killingBlow === null) return false;
  if (typeof entry.learning !== "object" || entry.learning === null) return false;

  // Check arrays
  if (!Array.isArray(entry.successorHypothesisIds)) return false;
  if (!Array.isArray(entry.contributedToIds)) return false;

  return true;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Pattern for Graveyard IDs.
 * Format: GY-{sessionId}-{sequence}
 */
export const GRAVEYARD_ID_PATTERN = /^GY-[A-Za-z0-9][A-Za-z0-9-]*-\d{3}$/;

/**
 * Generate a new graveyard entry ID.
 *
 * @param sessionId - The session this entry belongs to
 * @param sequence - The sequence number within the session
 * @returns A formatted graveyard ID
 */
export function generateGraveyardId(sessionId: string, sequence: number): string {
  if (!sessionId || !/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(sessionId)) {
    throw new Error(
      `Invalid sessionId: must be alphanumeric with optional hyphens (got "${sessionId}")`,
    );
  }

  if (!Number.isInteger(sequence) || sequence < 0 || sequence > 999) {
    throw new Error(`Invalid sequence: must be an integer from 0-999 (got ${sequence})`);
  }

  const paddedSeq = sequence.toString().padStart(3, "0");
  return `GY-${sessionId}-${paddedSeq}`;
}

/**
 * Create a new FalsifiedHypothesis entry.
 *
 * @param input - The input fields for the new graveyard entry
 * @returns A fully populated FalsifiedHypothesis
 */
export function createFalsifiedHypothesis(input: {
  id: string;
  hypothesis: HypothesisCard;
  sessionId: string;
  killingBlow: EvidenceEntry;
  deathType: DeathType;
  deathSummary: string;
  learning?: Partial<FalsificationLearning>;
  successorHypothesisIds?: string[];
  contributedToIds?: string[];
  epitaph?: string;
  brennerQuote?: string;
  archivedBy?: string;
  notes?: string;
  tags?: string[];
}): FalsifiedHypothesis {
  const entry: FalsifiedHypothesis = {
    id: input.id,
    hypothesis: input.hypothesis,
    sessionId: input.sessionId,
    falsifiedAt: new Date(),
    killingBlow: input.killingBlow,
    deathType: input.deathType,
    deathSummary: input.deathSummary,
    learning: {
      lessonsLearned: input.learning?.lessonsLearned ?? [],
      whatWeNowKnow: input.learning?.whatWeNowKnow ?? [],
      whatRemainsOpen: input.learning?.whatRemainsOpen ?? [],
      suggestedNextSteps: input.learning?.suggestedNextSteps ?? [],
    },
    successorHypothesisIds: input.successorHypothesisIds ?? [],
    contributedToIds: input.contributedToIds ?? [],
    epitaph: input.epitaph ?? "",
    brennerQuote: input.brennerQuote ?? getRandomBrennerQuote(input.deathType),
    archivedBy: input.archivedBy,
    notes: input.notes,
    tags: input.tags,
  };

  // Validate the created entry
  const result = validateFalsifiedHypothesis(entry);
  if (!result.valid) {
    const errorMessages = result.errors.map((e) => `${e.field}: ${e.message}`);
    throw new Error(`Invalid FalsifiedHypothesis: ${errorMessages.join("; ")}`);
  }

  return entry;
}

// ============================================================================
// Graveyard Operations
// ============================================================================

/**
 * Add a successor hypothesis link.
 */
export function addSuccessor(entry: FalsifiedHypothesis, successorId: string): FalsifiedHypothesis {
  if (entry.successorHypothesisIds.includes(successorId)) {
    return entry;
  }

  return {
    ...entry,
    successorHypothesisIds: [...entry.successorHypothesisIds, successorId],
  };
}

/**
 * Add a "contributed to" link.
 */
export function addContributedTo(
  entry: FalsifiedHypothesis,
  hypothesisId: string,
): FalsifiedHypothesis {
  if (entry.contributedToIds.includes(hypothesisId)) {
    return entry;
  }

  return {
    ...entry,
    contributedToIds: [...entry.contributedToIds, hypothesisId],
  };
}

/**
 * Update the epitaph.
 */
export function updateEpitaph(entry: FalsifiedHypothesis, epitaph: string): FalsifiedHypothesis {
  return {
    ...entry,
    epitaph,
  };
}

/**
 * Update the learning section.
 */
export function updateLearning(
  entry: FalsifiedHypothesis,
  learning: Partial<FalsificationLearning>,
): FalsifiedHypothesis {
  return {
    ...entry,
    learning: {
      lessonsLearned: learning.lessonsLearned ?? entry.learning.lessonsLearned,
      whatWeNowKnow: learning.whatWeNowKnow ?? entry.learning.whatWeNowKnow,
      whatRemainsOpen: learning.whatRemainsOpen ?? entry.learning.whatRemainsOpen,
      suggestedNextSteps: learning.suggestedNextSteps ?? entry.learning.suggestedNextSteps,
    },
  };
}

// ============================================================================
// Statistics & Analysis
// ============================================================================

/**
 * Statistics about the graveyard.
 */
export interface GraveyardStats {
  /** Total number of falsified hypotheses */
  totalFalsified: number;

  /** Breakdown by death type */
  byDeathType: Record<DeathType, number>;

  /** Average number of lessons learned per falsification */
  avgLessonsPerFalsification: number;

  /** Number of falsifications that led to successor hypotheses */
  withSuccessors: number;

  /** Number of falsifications with epitaphs */
  withEpitaphs: number;

  /** Domains most affected by falsification */
  topDomains: { domain: string; count: number }[];
}

/**
 * Calculate statistics for a set of graveyard entries.
 */
export function calculateGraveyardStats(entries: FalsifiedHypothesis[]): GraveyardStats {
  const byDeathType: Record<DeathType, number> = {
    direct_falsification: 0,
    mechanism_failure: 0,
    effect_size_collapse: 0,
    superseded: 0,
    unmeasurable: 0,
    scope_reduction: 0,
  };

  let totalLessons = 0;
  let withSuccessors = 0;
  let withEpitaphs = 0;
  const domainCounts: Record<string, number> = {};

  for (const entry of entries) {
    // Count by death type
    if (isDeathType(entry.deathType)) {
      byDeathType[entry.deathType]++;
    }

    // Count lessons
    totalLessons += entry.learning.lessonsLearned.length;

    // Count successors
    if (entry.successorHypothesisIds.length > 0) {
      withSuccessors++;
    }

    // Count epitaphs
    if (entry.epitaph && entry.epitaph.trim().length > 0) {
      withEpitaphs++;
    }

    // Count domains
    for (const domain of entry.hypothesis.domain) {
      domainCounts[domain] = (domainCounts[domain] ?? 0) + 1;
    }
  }

  // Sort domains by count
  const topDomains = Object.entries(domainCounts)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalFalsified: entries.length,
    byDeathType,
    avgLessonsPerFalsification: entries.length > 0 ? totalLessons / entries.length : 0,
    withSuccessors,
    withEpitaphs,
    topDomains,
  };
}

/**
 * Failure pattern analysis result.
 */
export interface FailurePattern {
  /** Pattern name */
  name: string;

  /** How often this pattern occurs (percentage) */
  frequency: number;

  /** Description of the pattern */
  description: string;

  /** Entries that match this pattern */
  matchingEntryIds: string[];
}

/**
 * Analyze failure patterns across graveyard entries.
 */
export function analyzeFailurePatterns(entries: FalsifiedHypothesis[]): FailurePattern[] {
  if (entries.length === 0) return [];

  const patterns: FailurePattern[] = [];

  // Pattern: Most common death type
  const deathTypeCounts: Record<DeathType, string[]> = {
    direct_falsification: [],
    mechanism_failure: [],
    effect_size_collapse: [],
    superseded: [],
    unmeasurable: [],
    scope_reduction: [],
  };

  for (const entry of entries) {
    if (isDeathType(entry.deathType)) {
      deathTypeCounts[entry.deathType].push(entry.id);
    }
  }

  // Find most common death type
  const sortedDeathTypes = Object.entries(deathTypeCounts)
    .filter(([, ids]) => ids.length > 0)
    .sort((a, b) => b[1].length - a[1].length);

  if (sortedDeathTypes.length > 0) {
    const [topType, topIds] = sortedDeathTypes[0];
    const freq = (topIds.length / entries.length) * 100;

    if (freq >= 30) {
      patterns.push({
        name: `Frequent ${DEATH_TYPE_LABELS[topType as DeathType]}`,
        frequency: freq,
        description: `${freq.toFixed(0)}% of hypotheses fail due to ${DEATH_TYPE_LABELS[topType as DeathType].toLowerCase()}. Consider addressing this pattern earlier in the hypothesis development process.`,
        matchingEntryIds: topIds,
      });
    }
  }

  // Pattern: Hypotheses that led to successors
  const withSuccessors = entries.filter((e) => e.successorHypothesisIds.length > 0);
  if (withSuccessors.length > 0) {
    const successorRate = (withSuccessors.length / entries.length) * 100;
    patterns.push({
      name: "Productive Failures",
      frequency: successorRate,
      description: `${successorRate.toFixed(0)}% of falsified hypotheses led to new hypotheses. This is a healthy sign of learning from failure.`,
      matchingEntryIds: withSuccessors.map((e) => e.id),
    });
  }

  // Pattern: Missing epitaphs (not learning enough)
  const withoutEpitaphs = entries.filter((e) => !e.epitaph || e.epitaph.trim().length === 0);
  if (withoutEpitaphs.length > entries.length * 0.5) {
    patterns.push({
      name: "Unprocessed Failures",
      frequency: (withoutEpitaphs.length / entries.length) * 100,
      description: `${((withoutEpitaphs.length / entries.length) * 100).toFixed(0)}% of falsifications lack epitaphs. Consider spending more time documenting lessons learned.`,
      matchingEntryIds: withoutEpitaphs.map((e) => e.id),
    });
  }

  return patterns;
}

// ============================================================================
// Display Helpers
// ============================================================================

/**
 * Get the display configuration for a death type.
 */
export function getDeathTypeDisplay(deathType: DeathType): {
  label: string;
  description: string;
  icon: string;
  color: string;
} {
  const colorMap: Record<DeathType, string> = {
    direct_falsification: "red",
    mechanism_failure: "orange",
    effect_size_collapse: "yellow",
    superseded: "purple",
    unmeasurable: "gray",
    scope_reduction: "blue",
  };

  return {
    label: DEATH_TYPE_LABELS[deathType],
    description: DEATH_TYPE_DESCRIPTIONS[deathType],
    icon: DEATH_TYPE_ICONS[deathType],
    color: colorMap[deathType],
  };
}

/**
 * Format a falsification date for display.
 */
export function formatFalsificationDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Get a summary string for a graveyard entry.
 */
export function summarizeFalsification(entry: FalsifiedHypothesis): string {
  const icon = DEATH_TYPE_ICONS[entry.deathType];
  const label = DEATH_TYPE_LABELS[entry.deathType];
  const date = formatFalsificationDate(entry.falsifiedAt);

  return `${icon} ${label} on ${date}: ${entry.deathSummary}`;
}
