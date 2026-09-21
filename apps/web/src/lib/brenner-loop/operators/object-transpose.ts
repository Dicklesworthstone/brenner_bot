/**
 * Object Transpose (⟳) Operator
 *
 * Systematically generates alternative explanations for a hypothesis.
 * Forces explicit consideration of reverse causation, third variables,
 * selection effects, and bidirectional relationships.
 *
 * Brenner's Principle: "Flip the question around. What if X doesn't cause Y, but Y causes X?"
 *
 * @see brenner_bot-vw6p.4 (bead)
 * @module brenner-loop/operators/object-transpose
 */

import type { HypothesisCard } from "../hypothesis";
import type { OperatorSession, OperatorStepConfig } from "./framework";

// ============================================================================
// Types
// ============================================================================

/**
 * Types of alternative explanations
 */
export type AlternativeType =
  | "reverse_causation" // Y causes X instead of X causes Y
  | "third_variable" // Z causes both X and Y
  | "selection" // Selection effects distort the relationship
  | "bidirectional" // X and Y cause each other (feedback loop)
  | "coincidence" // No causal relationship, just correlation
  | "other";

/**
 * An alternative explanation for the hypothesis
 */
export interface AlternativeExplanation {
  /** Unique identifier */
  id: string;
  /** Type of alternative */
  type: AlternativeType;
  /** Display name */
  name: string;
  /** Detailed description */
  description: string;
  /** If third variable, what is the proposed Z? */
  proposedZ?: string;
  /** Key implications of this alternative */
  implications: string[];
  /** User-rated plausibility (1-5) */
  plausibility?: number;
  /** How well existing evidence discriminates */
  evidenceDiscrimination?: "poor" | "moderate" | "good";
  /** Whether this alternative is selected for further analysis */
  selected?: boolean;
}

/**
 * A test that could discriminate between hypotheses
 */
export interface DiscriminatingTest {
  /** Unique identifier */
  id: string;
  /** Which alternative this test addresses */
  alternativeId: string;
  /** Description of the test */
  description: string;
  /** What result would support original hypothesis */
  originalSupport: string;
  /** What result would support the alternative */
  alternativeSupport: string;
  /** Feasibility rating */
  feasibility: "easy" | "moderate" | "difficult" | "impractical";
  /** User's priority for this test */
  priority?: number;
}

/**
 * Rating for an alternative explanation
 */
export interface PlausibilityRating {
  /** Alternative ID */
  alternativeId: string;
  /** Plausibility score (1-5) */
  plausibility: number;
  /** Evidence discrimination quality */
  evidenceDiscrimination: "poor" | "moderate" | "good";
  /** User notes */
  notes?: string;
}

/**
 * Result of the Object Transpose operator
 */
export interface ObjectTransposeResult {
  /** All generated alternatives */
  alternatives: AlternativeExplanation[];
  /** User ratings for alternatives */
  userRatings: PlausibilityRating[];
  /** Generated discriminating tests */
  discriminatingTests: DiscriminatingTest[];
  /** IDs of high-priority alternatives (plausibility >= 3) */
  highPriorityAlternativeIds: string[];
  /** IDs of selected tests to pursue */
  selectedTestIds: string[];
}

// ============================================================================
// Step Configurations
// ============================================================================

/**
 * Step IDs for the Object Transpose operator
 */
export const OBJECT_TRANSPOSE_STEP_IDS = {
  STATE_HYPOTHESIS: "state-hypothesis",
  GENERATE_ALTERNATIVES: "generate-alternatives",
  RATE_PLAUSIBILITY: "rate-plausibility",
  IDENTIFY_TESTS: "identify-tests",
} as const;

/**
 * Check if alternatives have been generated
 */
function hasAlternativesGenerated(session: OperatorSession): boolean {
  const alts = session.generatedContent[OBJECT_TRANSPOSE_STEP_IDS.GENERATE_ALTERNATIVES] as
    | AlternativeExplanation[]
    | undefined;
  return Array.isArray(alts) && alts.length > 0;
}

/**
 * Check if user has rated at least one alternative
 */
function hasRatingsProvided(session: OperatorSession): boolean {
  const ratings = session.userSelections[OBJECT_TRANSPOSE_STEP_IDS.RATE_PLAUSIBILITY] as
    | PlausibilityRating[]
    | undefined;
  return Array.isArray(ratings) && ratings.some((r) => r.plausibility > 0);
}

/**
 * Check if discriminating tests have been identified
 */
function hasTestsIdentified(session: OperatorSession): boolean {
  const tests = session.generatedContent[OBJECT_TRANSPOSE_STEP_IDS.IDENTIFY_TESTS] as
    | DiscriminatingTest[]
    | undefined;
  return Array.isArray(tests) && tests.length > 0;
}

/**
 * Step configurations for the Object Transpose operator
 */
export const OBJECT_TRANSPOSE_STEPS: OperatorStepConfig[] = [
  {
    id: OBJECT_TRANSPOSE_STEP_IDS.STATE_HYPOTHESIS,
    name: "State Current Hypothesis",
    description:
      "Review your current hypothesis: X → Y. We'll now systematically consider alternatives.",
    helpText: `
**Why this matters:**
Before generating alternatives, we need to clearly state what we're questioning.
Your hypothesis proposes that X causes Y. But what if that's not the whole story?

Consider:
- Is the direction of causation clear?
- Could other factors be involved?
- How strong is your evidence for X → Y specifically?
    `.trim(),
    isComplete: () => true, // Display step, always complete
  },
  {
    id: OBJECT_TRANSPOSE_STEP_IDS.GENERATE_ALTERNATIVES,
    name: "Generate Alternatives",
    description:
      "Review the alternative explanations for your hypothesis. Each represents a different causal story.",
    helpText: `
**Alternative Types:**

**Reverse Causation (Y → X):** What if Y causes X instead?
- Example: Depression → Social media use (not the reverse)

**Third Variable (Z → X and Y):** What if both are caused by something else?
- Example: Loneliness causes both social media use AND depression

**Selection Effects:** Who ends up in your study?
- Example: Depressed people may self-select into social media use

**Bidirectional (X ↔ Y):** What if they cause each other?
- Example: A feedback loop between usage and depression
    `.trim(),
    isComplete: hasAlternativesGenerated,
  },
  {
    id: OBJECT_TRANSPOSE_STEP_IDS.RATE_PLAUSIBILITY,
    name: "Rate Plausibility",
    description:
      "For each alternative, rate how plausible it is and how well existing evidence discriminates.",
    helpText: `
**Rating Guide:**

**Plausibility (1-5):**
- 1: Implausible - can be ruled out
- 2: Unlikely - weak possibility
- 3: Moderate - worth considering
- 4: Likely - strong alternative
- 5: Very likely - may be the true explanation

**Evidence Discrimination:**
- Poor: Current evidence doesn't distinguish
- Moderate: Some evidence helps, but not definitive
- Good: Strong evidence favors one explanation
    `.trim(),
    isComplete: hasRatingsProvided,
    validate: (session) => {
      const ratings = session.userSelections[OBJECT_TRANSPOSE_STEP_IDS.RATE_PLAUSIBILITY] as
        | PlausibilityRating[]
        | undefined;
      if (!ratings || !ratings.some((r) => r.plausibility > 0)) {
        return {
          valid: false,
          errors: ["Rate at least one alternative"],
          warnings: [],
        };
      }
      const unrated = (
        (session.generatedContent[
          OBJECT_TRANSPOSE_STEP_IDS.GENERATE_ALTERNATIVES
        ] as AlternativeExplanation[]) || []
      ).filter((alt) => !ratings.find((r) => r.alternativeId === alt.id && r.plausibility > 0));
      if (unrated.length > 0) {
        return {
          valid: true,
          errors: [],
          warnings: [`${unrated.length} alternative(s) not rated`],
        };
      }
      return { valid: true, errors: [], warnings: [] };
    },
  },
  {
    id: OBJECT_TRANSPOSE_STEP_IDS.IDENTIFY_TESTS,
    name: "Identify Tests",
    description:
      "For high-plausibility alternatives, what tests would distinguish them from your original hypothesis?",
    helpText: `
**Discriminating Tests:**
A good test should give different results depending on which explanation is true.

For each high-plausibility alternative, consider:
1. What observation would support the original hypothesis?
2. What observation would support the alternative?
3. Is such an observation feasible?

The best tests have clear, distinguishable predictions for each explanation.
    `.trim(),
    isComplete: hasTestsIdentified,
    canSkip: true,
  },
];

// ============================================================================
// Alternative Generation
// ============================================================================

/**
 * Template for reverse causation alternative
 */
export function generateReverseCausation(hypothesis: HypothesisCard): AlternativeExplanation {
  return {
    id: "alt-reverse",
    type: "reverse_causation",
    name: "Reverse Causation",
    description: `What if the outcome (Y) actually causes the proposed cause (X), rather than the other way around? "${hypothesis.statement}" might have the causal arrow pointing in the wrong direction.`,
    implications: [
      "Interventions targeting X may be ineffective",
      "Need temporal precedence evidence",
      "Look for natural experiments where Y changes first",
      "Consider why we assumed X → Y in the first place",
    ],
  };
}

/**
 * Common third variables by domain
 */
export const THIRD_VARIABLE_TEMPLATES: Record<string, string[]> = {
  psychology: [
    "Pre-existing mental health conditions",
    "Personality traits (e.g., neuroticism)",
    "Genetic predisposition",
    "Early life experiences",
    "Cognitive style",
  ],
  social: [
    "Socioeconomic status",
    "Social support network",
    "Cultural background",
    "Education level",
    "Neighborhood effects",
  ],
  health: [
    "Underlying health conditions",
    "Lifestyle factors",
    "Access to healthcare",
    "Genetic factors",
    "Environmental exposures",
  ],
  technology: [
    "Digital literacy",
    "Age/generational effects",
    "Access to technology",
    "Usage patterns",
    "Platform-specific features",
  ],
  general: [
    "Confounding lifestyle factors",
    "Selection into treatment",
    "Measurement artifacts",
    "Temporal confounds",
    "Unmeasured covariates",
  ],
};

/**
 * Generate third variable alternatives based on hypothesis domain
 */
export function generateThirdVariables(hypothesis: HypothesisCard): AlternativeExplanation[] {
  const alternatives: AlternativeExplanation[] = [];
  const domains = hypothesis.domain.map((d) => d.toLowerCase());

  // Collect relevant third variables
  const relevantVariables: string[] = [];

  for (const domain of domains) {
    if (domain.includes("psych") || domain.includes("mental")) {
      relevantVariables.push(...THIRD_VARIABLE_TEMPLATES.psychology);
    }
    if (domain.includes("social") || domain.includes("socio")) {
      relevantVariables.push(...THIRD_VARIABLE_TEMPLATES.social);
    }
    if (
      domain.includes("health") ||
      domain.includes("medical") ||
      domain.includes("epidemiology")
    ) {
      relevantVariables.push(...THIRD_VARIABLE_TEMPLATES.health);
    }
    if (domain.includes("tech") || domain.includes("digital") || domain.includes("media")) {
      relevantVariables.push(...THIRD_VARIABLE_TEMPLATES.technology);
    }
  }

  // Always include some general variables
  relevantVariables.push(...THIRD_VARIABLE_TEMPLATES.general.slice(0, 2));

  // Deduplicate
  const uniqueVariables = [...new Set(relevantVariables)];

  // Create alternatives for top variables (limit to 4)
  const topVariables = uniqueVariables.slice(0, 4);

  for (let i = 0; i < topVariables.length; i++) {
    const variable = topVariables[i];
    alternatives.push({
      id: `alt-z${i + 1}`,
      type: "third_variable",
      name: `Third Variable: ${variable}`,
      description: `What if "${variable}" causes both X and Y? The observed relationship might be spurious - X and Y may not be causally related, but both caused by this common factor.`,
      proposedZ: variable,
      implications: [
        `Need to control for ${variable}`,
        "Association may disappear after adjustment",
        "Intervention on X would be ineffective",
        `Should measure ${variable} directly`,
      ],
    });
  }

  return alternatives;
}

/**
 * Generate selection effect alternative
 */
export function generateSelectionEffect(hypothesis: HypothesisCard): AlternativeExplanation {
  return {
    id: "alt-selection",
    type: "selection",
    name: "Selection Effects",
    description: `Who ends up being studied? People who experience X might already be different in ways that affect Y, regardless of X's direct effect. The relationship in "${hypothesis.statement}" might reflect who self-selects into the "treatment" group.`,
    implications: [
      "Need to consider selection mechanisms",
      "Compare similar people who differ only in X",
      "Look for natural experiments with random assignment",
      "Consider survivor bias",
      "Check for differential attrition",
    ],
  };
}

/**
 * Generate bidirectional alternative
 */
export function generateBidirectional(hypothesis: HypothesisCard): AlternativeExplanation {
  void hypothesis;
  return {
    id: "alt-bidirectional",
    type: "bidirectional",
    name: "Bidirectional Causation",
    description: `What if X and Y cause each other in a feedback loop? Rather than a simple X → Y, the relationship might be X ↔ Y, where each reinforces the other over time.`,
    implications: [
      "Interventions on either variable might help",
      "Need longitudinal data with multiple waves",
      "Look for lagged effects in both directions",
      "Consider dynamic systems models",
      "Breaking the cycle at any point may help",
    ],
  };
}

/**
 * Generate coincidence/no relationship alternative
 */
export function generateCoincidence(): AlternativeExplanation {
  return {
    id: "alt-coincidence",
    type: "coincidence",
    name: "Coincidental Correlation",
    description:
      "What if X and Y are not causally related at all? The observed correlation might be a statistical artifact, a result of multiple comparisons, or a coincidence of timing.",
    implications: [
      "Replication in independent samples is crucial",
      "Check for publication bias",
      "Consider the prior probability of the effect",
      "Look for mechanism evidence",
      "Pre-registration of hypotheses",
    ],
  };
}

/**
 * Generate all alternatives for a hypothesis
 */
export function generateAlternatives(hypothesis: HypothesisCard): AlternativeExplanation[] {
  const alternatives: AlternativeExplanation[] = [];

  // Always include reverse causation
  alternatives.push(generateReverseCausation(hypothesis));

  // Add domain-relevant third variables
  alternatives.push(...generateThirdVariables(hypothesis));

  // Always include selection effects
  alternatives.push(generateSelectionEffect(hypothesis));

  // Always include bidirectional
  alternatives.push(generateBidirectional(hypothesis));

  // Include coincidence
  alternatives.push(generateCoincidence());

  return alternatives;
}

// ============================================================================
// Discriminating Test Generation
// ============================================================================

/**
 * Generate discriminating tests for high-plausibility alternatives
 */
export function generateDiscriminatingTests(
  alternatives: AlternativeExplanation[],
  ratings: PlausibilityRating[],
): DiscriminatingTest[] {
  const tests: DiscriminatingTest[] = [];

  // Find high-plausibility alternatives
  const highPlausibility = alternatives.filter((alt) => {
    const rating = ratings.find((r) => r.alternativeId === alt.id);
    return rating && rating.plausibility >= 3;
  });

  for (const alt of highPlausibility) {
    const test = generateTestForAlternative(alt);
    if (test) {
      tests.push(test);
    }
  }

  return tests;
}

/**
 * Generate a discriminating test for a specific alternative
 */
function generateTestForAlternative(alt: AlternativeExplanation): DiscriminatingTest | null {
  switch (alt.type) {
    case "reverse_causation":
      return {
        id: `test-${alt.id}`,
        alternativeId: alt.id,
        description: "Examine temporal sequence: Does X reliably precede Y?",
        originalSupport: "X consistently occurs before Y, with appropriate lag",
        alternativeSupport: "Y often precedes X, or they occur simultaneously",
        feasibility: "moderate",
      };

    case "third_variable":
      return {
        id: `test-${alt.id}`,
        alternativeId: alt.id,
        description: `Control for ${alt.proposedZ || "the third variable"}: Does the X-Y relationship persist?`,
        originalSupport: `Relationship remains after controlling for ${alt.proposedZ || "Z"}`,
        alternativeSupport: `Relationship disappears after controlling for ${alt.proposedZ || "Z"}`,
        feasibility: "moderate",
      };

    case "selection":
      return {
        id: `test-${alt.id}`,
        alternativeId: alt.id,
        description: "Find a natural experiment or use instrumental variables to address selection",
        originalSupport: "Exogenous variation in X still predicts Y",
        alternativeSupport: "Effect disappears when using exogenous variation",
        feasibility: "difficult",
      };

    case "bidirectional":
      return {
        id: `test-${alt.id}`,
        alternativeId: alt.id,
        description: "Use cross-lagged panel analysis or similar to test both directions",
        originalSupport: "X(t) → Y(t+1) is stronger than Y(t) → X(t+1)",
        alternativeSupport: "Both directions show similar effects, or Y→X is stronger",
        feasibility: "moderate",
      };

    case "coincidence":
      return {
        id: `test-${alt.id}`,
        alternativeId: alt.id,
        description: "Conduct pre-registered replication with adequate power",
        originalSupport: "Effect replicates consistently across studies",
        alternativeSupport: "Effect fails to replicate or is highly variable",
        feasibility: "moderate",
      };

    default:
      return null;
  }
}

/**
 * Build the complete Object Transpose result from session state
 */
export function buildObjectTransposeResult(
  session: OperatorSession<ObjectTransposeResult>,
): ObjectTransposeResult {
  const alternatives =
    (session.generatedContent[
      OBJECT_TRANSPOSE_STEP_IDS.GENERATE_ALTERNATIVES
    ] as AlternativeExplanation[]) ?? [];
  const ratings =
    (session.userSelections[OBJECT_TRANSPOSE_STEP_IDS.RATE_PLAUSIBILITY] as PlausibilityRating[]) ??
    [];
  const tests =
    (session.generatedContent[OBJECT_TRANSPOSE_STEP_IDS.IDENTIFY_TESTS] as DiscriminatingTest[]) ??
    [];

  // Find high-priority alternatives
  const highPriorityAlternativeIds = ratings
    .filter((r) => r.plausibility >= 3)
    .map((r) => r.alternativeId);

  // Find selected tests (priority > 0 or feasibility is easy/moderate)
  const selectedTestIds = tests
    .filter(
      (t) =>
        (t.priority && t.priority > 0) || t.feasibility === "easy" || t.feasibility === "moderate",
    )
    .map((t) => t.id);

  return {
    alternatives,
    userRatings: ratings,
    discriminatingTests: tests,
    highPriorityAlternativeIds,
    selectedTestIds,
  };
}

// ============================================================================
// Brenner Quotes for Object Transpose
// ============================================================================

/**
 * Quote bank section IDs relevant to Object Transpose
 */
export const OBJECT_TRANSPOSE_QUOTE_ANCHORS = [
  "§58", // Flip the question
  "§59", // Alternative explanations
  "§89", // What would prove you wrong
];

/**
 * Fallback quotes if quote bank is unavailable
 */
export const OBJECT_TRANSPOSE_FALLBACK_QUOTES = [
  {
    sectionId: "§58",
    title: "Flip the Question",
    quote:
      "Flip the question around. What if X doesn't cause Y, but Y causes X? Most people never bother to consider this seriously.",
    context: "Brenner on considering alternative causal directions",
    tags: ["object-transpose", "causation"],
  },
  {
    sectionId: "§59",
    title: "Alternative Explanations",
    quote:
      "For every hypothesis you favor, you should be able to articulate at least three alternative explanations and explain why you've ruled them out.",
    context: "Brenner on the importance of considering alternatives",
    tags: ["object-transpose", "alternatives"],
  },
];
