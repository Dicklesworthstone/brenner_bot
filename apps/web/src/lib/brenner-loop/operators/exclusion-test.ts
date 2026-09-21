/**
 * Exclusion Test (⊘) Operator
 *
 * THE key operator in the Brenner approach. Generates discriminative tests
 * that can falsify the hypothesis - not merely weaken it, but definitively
 * rule it out.
 *
 * Brenner's Principle: "What would prove you wrong — not 'less right' — definitively wrong?"
 *
 * @see brenner_bot-vw6p.3 (bead)
 * @module brenner-loop/operators/exclusion-test
 */

import type { HypothesisCard } from "../hypothesis";
import type { OperatorSession, OperatorStepConfig } from "./framework";

// ============================================================================
// Types
// ============================================================================

/**
 * Categories of exclusion tests, ranked by typical discriminative power
 */
export type ExclusionTestCategory =
  | "natural_experiment" // ★★★★★ Find situations where cause varies naturally
  | "cross_context" // ★★★★★ Same cause, different context
  | "mechanism_block" // ★★★★★ Interrupt the proposed mechanism
  | "dose_response" // ★★★☆☆ More cause should mean more effect
  | "temporal_sequence" // ★★★☆☆ Cause must precede effect
  | "specificity" // ★★☆☆☆ Does cause affect only what you predict?
  | "coherence" // ★★☆☆☆ Does relationship fit established knowledge?
  | "custom"; // User-defined test

/**
 * Labels for exclusion test categories
 */
export const EXCLUSION_TEST_CATEGORY_LABELS: Record<ExclusionTestCategory, string> = {
  natural_experiment: "Natural Experiment",
  cross_context: "Cross-Context Test",
  mechanism_block: "Mechanism Block",
  dose_response: "Dose-Response",
  temporal_sequence: "Temporal Sequence",
  specificity: "Specificity",
  coherence: "Coherence",
  custom: "Custom Test",
};

/**
 * Default discriminative power by category
 */
export const CATEGORY_DEFAULT_POWER: Record<ExclusionTestCategory, 1 | 2 | 3 | 4 | 5> = {
  natural_experiment: 5,
  cross_context: 5,
  mechanism_block: 5,
  dose_response: 3,
  temporal_sequence: 3,
  specificity: 2,
  coherence: 2,
  custom: 3,
};

/**
 * Practical feasibility of running a test
 */
export type TestFeasibility = "high" | "medium" | "low";

/**
 * Labels for feasibility levels
 */
export const FEASIBILITY_LABELS: Record<TestFeasibility, string> = {
  high: "High - Can be done with available resources",
  medium: "Medium - Requires some additional resources",
  low: "Low - Difficult to implement",
};

/**
 * An exclusion test that could falsify the hypothesis
 */
export interface ExclusionTest {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Full description of the test */
  description: string;
  /** Category of test */
  category: ExclusionTestCategory;
  /** Discriminative power (1-5 stars) */
  discriminativePower: 1 | 2 | 3 | 4 | 5;
  /** What observation would FALSIFY the hypothesis */
  falsificationCondition: string;
  /** What observation would SUPPORT the hypothesis */
  supportCondition: string;
  /** Why this test is discriminative */
  rationale: string;
  /** Practical feasibility */
  feasibility: TestFeasibility;
  /** Feasibility notes */
  feasibilityNotes?: string;
  /** Whether this test is selected by the user */
  selected?: boolean;
  /** Whether this is a user-created custom test */
  isCustom?: boolean;
}

/**
 * A detailed protocol for running a selected test
 */
export interface TestProtocol {
  /** ID of the test this protocol is for */
  testId: string;
  /** What data would you need? */
  dataRequired: string;
  /** Where might you find this data? */
  dataSources: string[];
  /** What would count as "passing" the test (hypothesis survives)? */
  passingCriteria: string;
  /** What would count as "failing" the test (hypothesis falsified)? */
  failingCriteria: string;
  /** Potential confounds or limitations */
  limitations: string[];
  /** Estimated effort */
  estimatedEffort: "hours" | "days" | "weeks" | "months";
  /** User notes */
  notes?: string;
}

/**
 * Result of the Exclusion Test operator
 */
export interface ExclusionTestResult {
  /** All generated tests */
  generatedTests: ExclusionTest[];
  /** IDs of selected tests */
  selectedTestIds: string[];
  /** Generated protocols for selected tests */
  protocols: TestProtocol[];
  /** The tests that will be recorded in the session */
  testsForSession: ExclusionTest[];
}

// ============================================================================
// Step Configurations
// ============================================================================

/**
 * Step IDs for the Exclusion Test operator
 */
export const EXCLUSION_TEST_STEP_IDS = {
  REVIEW_HYPOTHESIS: "review-hypothesis",
  GENERATE_TESTS: "generate-tests",
  SELECT_TESTS: "select-tests",
  GENERATE_PROTOCOLS: "generate-protocols",
  RECORD_TESTS: "record-tests",
} as const;

/**
 * Check if hypothesis has been reviewed (we always consider this complete
 * since it's informational)
 */
function hasReviewedHypothesis(session: OperatorSession): boolean {
  void session;
  // The review step is informational - always complete
  return true;
}

/**
 * Check if tests have been generated
 */
function hasGeneratedTests(session: OperatorSession): boolean {
  const tests = session.generatedContent[EXCLUSION_TEST_STEP_IDS.GENERATE_TESTS] as
    | ExclusionTest[]
    | undefined;
  return Array.isArray(tests) && tests.length > 0;
}

/**
 * Check if at least one test is selected
 */
function hasSelectedTests(session: OperatorSession): boolean {
  const tests = session.userSelections[EXCLUSION_TEST_STEP_IDS.SELECT_TESTS] as
    | ExclusionTest[]
    | undefined;
  return Array.isArray(tests) && tests.some((t) => t.selected);
}

/**
 * Check if protocols have been generated
 */
function hasProtocols(session: OperatorSession): boolean {
  const protocols = session.generatedContent[EXCLUSION_TEST_STEP_IDS.GENERATE_PROTOCOLS] as
    | TestProtocol[]
    | undefined;
  return Array.isArray(protocols) && protocols.length > 0;
}

/**
 * Check if tests have been confirmed for recording
 */
function hasConfirmedTests(session: OperatorSession): boolean {
  const confirmed = session.userSelections[EXCLUSION_TEST_STEP_IDS.RECORD_TESTS] as
    | boolean
    | undefined;
  return confirmed === true;
}

/**
 * Step configurations for the Exclusion Test operator
 */
export const EXCLUSION_TEST_STEPS: OperatorStepConfig[] = [
  {
    id: EXCLUSION_TEST_STEP_IDS.REVIEW_HYPOTHESIS,
    name: "Review Hypothesis",
    description:
      "Before designing tests, review your hypothesis and what you've predicted would be true if you're right — and if you're wrong.",
    helpText: `
**Why this matters:**
Good exclusion tests flow directly from your predictions. If you claimed
"X causes Y through mechanism M", then blocking M should eliminate Y.

Review your:
- Main hypothesis statement
- Predictions if true
- Predictions if false (especially important!)
- Proposed mechanism
    `.trim(),
    isComplete: hasReviewedHypothesis,
    canSkip: true,
  },
  {
    id: EXCLUSION_TEST_STEP_IDS.GENERATE_TESTS,
    name: "Generate Tests",
    description:
      "The system generates potential falsification tests ranked by discriminative power.",
    helpText: `
**Discriminative Power:**
- ★★★★★ STRONGEST: Natural experiments, cross-context tests, mechanism blocks
- ★★★☆☆ MODERATE: Dose-response, temporal sequence
- ★★☆☆☆ WEAKER: Specificity, coherence checks

**What makes a test strong?**
A strong test can give a CLEAN answer. If you see X, the hypothesis is wrong.
Period. No "well, maybe..." or "it depends..."
    `.trim(),
    isComplete: hasGeneratedTests,
  },
  {
    id: EXCLUSION_TEST_STEP_IDS.SELECT_TESTS,
    name: "Select Tests",
    description: "Choose which tests to pursue. You can also add custom tests.",
    helpText: `
**Selection criteria:**
1. **Discriminative power** - Can it definitively falsify?
2. **Feasibility** - Can you actually run this test?
3. **Information value** - What will you learn?

Don't select too many. Focus on the 2-3 most powerful tests you can
actually conduct.
    `.trim(),
    isComplete: hasSelectedTests,
    validate: (session) => {
      if (!hasSelectedTests(session)) {
        return {
          valid: false,
          errors: ["Select at least one test to pursue"],
          warnings: [],
        };
      }
      const tests = session.userSelections[EXCLUSION_TEST_STEP_IDS.SELECT_TESTS] as ExclusionTest[];
      const selectedCount = tests.filter((t) => t.selected).length;
      if (selectedCount > 5) {
        return {
          valid: true,
          errors: [],
          warnings: ["Consider focusing on fewer tests for practical reasons"],
        };
      }
      return { valid: true, errors: [], warnings: [] };
    },
  },
  {
    id: EXCLUSION_TEST_STEP_IDS.GENERATE_PROTOCOLS,
    name: "Design Protocols",
    description: "For each selected test, define what you'd need to actually run it.",
    helpText: `
**Protocol elements:**
- What data do you need?
- Where can you find it?
- What counts as "passing" vs "failing"?
- What are the limitations?

Be specific. Vague protocols lead to ambiguous results.
    `.trim(),
    isComplete: hasProtocols,
  },
  {
    id: EXCLUSION_TEST_STEP_IDS.RECORD_TESTS,
    name: "Record Tests",
    description: "Confirm the tests to add to your session's test plan.",
    helpText: `
**What happens next:**
These tests become part of your session's test plan. You can:
- Run them and record evidence
- Track which have been completed
- See how results affect confidence

The Evidence Ledger will track your progress.
    `.trim(),
    isComplete: hasConfirmedTests,
    validate: (session) => {
      if (!hasConfirmedTests(session)) {
        return {
          valid: false,
          errors: ["Confirm the tests to record"],
          warnings: [],
        };
      }
      return { valid: true, errors: [], warnings: [] };
    },
  },
];

// ============================================================================
// Test Generation
// ============================================================================

/**
 * Template for generating tests by category
 */
interface TestTemplate {
  category: ExclusionTestCategory;
  nameTemplate: string;
  descriptionTemplate: string;
  falsificationTemplate: string;
  supportTemplate: string;
  rationaleTemplate: string;
  defaultFeasibility: TestFeasibility;
}

/**
 * Test generation templates
 */
const TEST_TEMPLATES: TestTemplate[] = [
  // ★★★★★ STRONGEST
  {
    category: "natural_experiment",
    nameTemplate: "Natural Experiment: Variation in {cause}",
    descriptionTemplate:
      "Find a situation where {cause} varies naturally but other factors are held constant. This provides a quasi-experimental test of the causal claim.",
    falsificationTemplate:
      "If {cause} varies naturally but {effect} does not change correspondingly, the hypothesis is falsified.",
    supportTemplate:
      "If {effect} tracks {cause} variation while other factors are controlled, the hypothesis is supported.",
    rationaleTemplate:
      "Natural experiments provide strong evidence because they approximate random assignment without researcher intervention.",
    defaultFeasibility: "medium",
  },
  {
    category: "cross_context",
    nameTemplate: "Cross-Context: {cause} in Different Setting",
    descriptionTemplate:
      "Test whether {cause} produces {effect} in a different context. If the relationship is real, it should hold across contexts.",
    falsificationTemplate:
      "If {cause} is present in a new context but {effect} does not occur, the hypothesis is falsified (unless context-dependency is part of the theory).",
    supportTemplate:
      "If {effect} follows {cause} across different contexts, the hypothesis gains support through generalization.",
    rationaleTemplate:
      "Cross-context replication tests whether the relationship is genuine or an artifact of the original setting.",
    defaultFeasibility: "medium",
  },
  {
    category: "mechanism_block",
    nameTemplate: "Mechanism Block: Interrupt {mechanism}",
    descriptionTemplate:
      "If {cause} works through {mechanism}, then blocking {mechanism} should eliminate {effect}.",
    falsificationTemplate:
      "If blocking {mechanism} does NOT eliminate {effect}, then {mechanism} is not the true pathway — the hypothesis about mechanism is wrong.",
    supportTemplate:
      "If blocking {mechanism} eliminates {effect} as predicted, the mechanistic hypothesis is supported.",
    rationaleTemplate:
      "Mechanism blocks directly test the proposed causal pathway. If the pathway is wrong, the whole theory needs revision.",
    defaultFeasibility: "low",
  },
  // ★★★☆☆ MODERATE
  {
    category: "dose_response",
    nameTemplate: "Dose-Response: More {cause} → More {effect}?",
    descriptionTemplate:
      "If {cause} really causes {effect}, then more {cause} should produce more {effect} (or less, if inverse relationship is predicted).",
    falsificationTemplate:
      "If the dose-response relationship is flat or opposite to prediction, the causal claim is weakened or falsified.",
    supportTemplate:
      "If {effect} scales with {cause} as predicted, the causal hypothesis is supported.",
    rationaleTemplate:
      "Dose-response is a classic criterion for causation. Absence of gradient weakens causal claims.",
    defaultFeasibility: "medium",
  },
  {
    category: "temporal_sequence",
    nameTemplate: "Temporal Check: Does {cause} Precede {effect}?",
    descriptionTemplate:
      "Verify that {cause} occurs before {effect}. Causes cannot follow their effects.",
    falsificationTemplate:
      "If {effect} occurs before or simultaneously with {cause}, causal direction is wrong.",
    supportTemplate:
      "If {cause} consistently precedes {effect} with appropriate lag, temporal ordering is consistent with causation.",
    rationaleTemplate:
      "Temporal precedence is a necessary (but not sufficient) condition for causation.",
    defaultFeasibility: "high",
  },
  // ★★☆☆☆ WEAKER
  {
    category: "specificity",
    nameTemplate: "Specificity: Does {cause} Only Affect {effect}?",
    descriptionTemplate:
      "Check whether {cause} affects only {effect} or many other outcomes as well.",
    falsificationTemplate:
      "If {cause} affects many unrelated outcomes equally, it may be a confounder or indicator rather than true cause.",
    supportTemplate:
      "If {cause} specifically affects {effect} and not unrelated outcomes, specificity supports causation.",
    rationaleTemplate:
      "High specificity is suggestive of true causation, though not required (some causes have broad effects).",
    defaultFeasibility: "medium",
  },
  {
    category: "coherence",
    nameTemplate: "Coherence Check: Fits Known Biology/Physics?",
    descriptionTemplate:
      "Evaluate whether the proposed {cause} → {effect} relationship is coherent with established scientific knowledge.",
    falsificationTemplate:
      "If the proposed relationship violates well-established principles, the hypothesis requires extraordinary evidence.",
    supportTemplate:
      "If the relationship fits known mechanisms and principles, coherence provides weak supporting evidence.",
    rationaleTemplate:
      "Coherence is the weakest criterion — novel findings may violate current knowledge. But incoherence should prompt scrutiny.",
    defaultFeasibility: "high",
  },
];

/**
 * Generate a unique test ID
 */
export function generateTestId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `ET-${uuid}`;
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 6);
  return `ET-${timestamp}-${random}`;
}

/**
 * Extract key terms from hypothesis for template filling
 */
function extractTerms(hypothesis: HypothesisCard): {
  cause: string;
  effect: string;
  mechanism: string;
} {
  // Simple extraction - in production, could use NLP
  const statement = hypothesis.statement;

  // Try to find "X causes Y" or similar patterns
  const causeMatch = statement.match(
    /^(.+?)\s+(?:causes?|leads?\s+to|produces?|affects?|influences?)\s+(.+?)(?:\s+(?:through|via|by)\s+(.+))?$/i,
  );

  if (causeMatch) {
    return {
      cause: causeMatch[1].trim(),
      effect: causeMatch[2].trim(),
      mechanism: causeMatch[3]?.trim() || hypothesis.mechanism || "the proposed mechanism",
    };
  }

  // Fallback: use first part as cause, rest as effect
  const parts = statement.split(/\s+(?:and|causes?|affects?)\s+/i);
  return {
    cause: parts[0] || "the cause",
    effect: parts[1] || "the effect",
    mechanism: hypothesis.mechanism || "the proposed mechanism",
  };
}

/**
 * Fill a template with hypothesis terms
 */
function fillTemplate(
  template: string,
  terms: { cause: string; effect: string; mechanism: string },
): string {
  return template
    .replace(/\{cause\}/g, terms.cause)
    .replace(/\{effect\}/g, terms.effect)
    .replace(/\{mechanism\}/g, terms.mechanism);
}

/**
 * Generate exclusion tests for a hypothesis
 */
export function generateExclusionTests(hypothesis: HypothesisCard): ExclusionTest[] {
  const terms = extractTerms(hypothesis);
  const tests: ExclusionTest[] = [];

  for (const template of TEST_TEMPLATES) {
    const test: ExclusionTest = {
      id: generateTestId(),
      name: fillTemplate(template.nameTemplate, terms),
      description: fillTemplate(template.descriptionTemplate, terms),
      category: template.category,
      discriminativePower: CATEGORY_DEFAULT_POWER[template.category],
      falsificationCondition: fillTemplate(template.falsificationTemplate, terms),
      supportCondition: fillTemplate(template.supportTemplate, terms),
      rationale: fillTemplate(template.rationaleTemplate, terms),
      feasibility: template.defaultFeasibility,
      selected: false,
      isCustom: false,
    };
    tests.push(test);
  }

  // Sort by discriminative power (highest first)
  tests.sort((a, b) => b.discriminativePower - a.discriminativePower);

  return tests;
}

/**
 * Create a custom exclusion test
 */
export function createCustomTest(
  name: string,
  description: string,
  falsificationCondition: string,
  supportCondition: string,
  discriminativePower: 1 | 2 | 3 | 4 | 5 = 3,
  feasibility: TestFeasibility = "medium",
): ExclusionTest {
  return {
    id: generateTestId(),
    name,
    description,
    category: "custom",
    discriminativePower,
    falsificationCondition,
    supportCondition,
    rationale: "User-defined test",
    feasibility,
    selected: false,
    isCustom: true,
  };
}

// ============================================================================
// Protocol Generation
// ============================================================================

/**
 * Generate a protocol template for a test
 */
export function generateProtocolTemplate(test: ExclusionTest): TestProtocol {
  return {
    testId: test.id,
    dataRequired: "",
    dataSources: [],
    passingCriteria: test.supportCondition,
    failingCriteria: test.falsificationCondition,
    limitations: [],
    estimatedEffort:
      test.feasibility === "high" ? "days" : test.feasibility === "medium" ? "weeks" : "months",
    notes: "",
  };
}

/**
 * Generate protocols for all selected tests
 */
export function generateProtocols(tests: ExclusionTest[]): TestProtocol[] {
  return tests.filter((t) => t.selected).map(generateProtocolTemplate);
}

// ============================================================================
// Result Building
// ============================================================================

/**
 * Build the complete Exclusion Test result from session state
 */
export function buildExclusionTestResult(
  session: OperatorSession<ExclusionTestResult>,
): ExclusionTestResult {
  const generatedTests =
    (session.generatedContent[EXCLUSION_TEST_STEP_IDS.GENERATE_TESTS] as ExclusionTest[]) ?? [];
  const selectedTests =
    (session.userSelections[EXCLUSION_TEST_STEP_IDS.SELECT_TESTS] as ExclusionTest[]) ?? [];
  const protocols =
    (session.generatedContent[EXCLUSION_TEST_STEP_IDS.GENERATE_PROTOCOLS] as TestProtocol[]) ?? [];

  const testsForSession = selectedTests.filter((t) => t.selected);

  return {
    generatedTests,
    selectedTestIds: testsForSession.map((t) => t.id),
    protocols,
    testsForSession,
  };
}

// ============================================================================
// Display Utilities
// ============================================================================

/**
 * Get star rating display for discriminative power
 */
export function getDiscriminativePowerStars(power: 1 | 2 | 3 | 4 | 5): string {
  const filled = "★".repeat(power);
  const empty = "☆".repeat(5 - power);
  return filled + empty;
}

/**
 * Get power level label
 */
export function getDiscriminativePowerLabel(power: 1 | 2 | 3 | 4 | 5): string {
  switch (power) {
    case 5:
      return "Decisive";
    case 4:
      return "Strong";
    case 3:
      return "Moderate";
    case 2:
      return "Weak";
    case 1:
      return "Minimal";
  }
}

/**
 * Get feasibility color class
 */
export function getFeasibilityColor(feasibility: TestFeasibility): string {
  switch (feasibility) {
    case "high":
      return "text-green-600 dark:text-green-400";
    case "medium":
      return "text-yellow-600 dark:text-yellow-400";
    case "low":
      return "text-red-600 dark:text-red-400";
  }
}

/**
 * Get category color class
 */
export function getCategoryColor(category: ExclusionTestCategory): string {
  const power = CATEGORY_DEFAULT_POWER[category];
  if (power >= 5) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  if (power >= 3) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
  return "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300";
}

// ============================================================================
// Brenner Quotes for Exclusion Test
// ============================================================================

/**
 * Quote bank section IDs relevant to Exclusion Test
 */
export const EXCLUSION_TEST_QUOTE_ANCHORS = [
  "§89", // Exclusion and discrimination
  "§90", // Designing tests
  "§91", // Clean answers
];

/**
 * Fallback quotes if quote bank is unavailable
 */
export const EXCLUSION_TEST_FALLBACK_QUOTES = [
  {
    sectionId: "§89",
    title: "The Exclusion Principle",
    quote:
      "What would prove you wrong — not 'less right' — definitively wrong? If you can't answer that, you don't have a real hypothesis.",
    context: "Brenner on the importance of falsifiability",
    tags: ["exclusion-test", "falsification"],
  },
  {
    sectionId: "§90",
    title: "Designing Discriminative Tests",
    quote:
      "The test must be able to give a clean answer. If all possible outcomes are consistent with your theory, it's not a test — it's a ritual.",
    context: "Brenner on what makes a good test",
    tags: ["exclusion-test", "discrimination"],
  },
  {
    sectionId: "§91",
    title: "The Power of Negative Results",
    quote:
      "A negative result that definitively excludes a possibility is worth ten positive results that merely add to a pile of consistent evidence.",
    context: "Brenner on the value of exclusion",
    tags: ["exclusion-test", "negative-results"],
  },
];
