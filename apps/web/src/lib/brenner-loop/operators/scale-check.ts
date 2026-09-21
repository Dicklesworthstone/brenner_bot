/**
 * Scale Check (⊙) Operator
 *
 * Forces consideration of effect sizes, measurement precision, and
 * the distinction between statistical and practical significance.
 *
 * Brenner's Principle: "Is your phenomenon at the right scale? Many
 * effects vanish when you zoom in or out."
 *
 * @see brenner_bot-vw6p.5 (bead)
 * @module brenner-loop/operators/scale-check
 */

import type { HypothesisCard } from "../hypothesis";
import type { OperatorSession, OperatorStepConfig } from "./framework";

// ============================================================================
// Types
// ============================================================================

/**
 * Effect size type (standardized measures)
 */
export type EffectSizeType =
  | "r" // Correlation coefficient
  | "d" // Cohen's d (standardized mean difference)
  | "OR" // Odds ratio
  | "RR" // Risk ratio
  | "percentage" // Percentage change
  | "estimate"; // User's estimate (small/medium/large)

/**
 * Direction of the effect
 */
export type EffectDirection = "increase" | "decrease" | "change";

/**
 * Effect size magnitude estimate
 */
export type EffectMagnitude = "negligible" | "small" | "medium" | "large" | "very_large";

/**
 * Effect size specification
 */
export interface EffectSizeSpec {
  /** Effect size type */
  type: EffectSizeType;
  /** Numeric value (if known) */
  value?: number;
  /** Magnitude estimate (if value not known) */
  estimate?: EffectMagnitude;
  /** Direction of effect */
  direction: EffectDirection;
  /** User's notes about the effect size */
  notes?: string;
}

/**
 * Domain-specific effect size context
 */
export interface DomainContext {
  /** Domain name */
  domain: string;
  /** Typical effect sizes in this domain */
  typicalEffects: TypicalEffect[];
  /** Warning thresholds */
  warningThreshold: number;
  /** Benchmark comparisons */
  benchmarks: Benchmark[];
}

/**
 * A typical effect in a domain
 */
export interface TypicalEffect {
  /** Description of the effect */
  description: string;
  /** Effect size value */
  value: number;
  /** Effect size type */
  type: EffectSizeType;
  /** Citation or source */
  source?: string;
}

/**
 * Benchmark for comparison
 */
export interface Benchmark {
  /** What the benchmark represents */
  label: string;
  /** The effect size value */
  value: number;
  /** How it compares to user's claimed effect */
  comparison?: "smaller" | "similar" | "larger";
}

/**
 * Context comparison result
 */
export interface ContextComparison {
  /** User's effect relative to domain norms */
  relativeToNorm: "below_typical" | "typical" | "above_typical" | "exceptional";
  /** Percentage of variance explained (for r) */
  varianceExplained?: number;
  /** Benchmarks with comparisons */
  benchmarksWithComparisons: Benchmark[];
  /** Warning messages */
  warnings: string[];
  /** Insights generated */
  insights: string[];
}

/**
 * Measurement precision assessment
 */
export interface MeasurementAssessment {
  /** Minimum detectable effect given design */
  minimumDetectableEffect?: number;
  /** Sample size needed to detect claimed effect */
  requiredSampleSize?: number;
  /** Measurement error estimate */
  measurementError?: number;
  /** Whether effect is detectable */
  isDetectable: boolean | null;
  /** Power analysis notes */
  powerNotes: string;
  /** Warnings about precision */
  warnings: string[];
}

/**
 * Practical significance assessment
 */
export interface PracticalSignificance {
  /** Is the effect practically meaningful? */
  isPracticallyMeaningful: boolean | null;
  /** Who would care about this effect? */
  stakeholders: string[];
  /** What threshold would make it actionable? */
  actionableThreshold?: number;
  /** User's reasoning about practical significance */
  reasoning: string;
}

/**
 * Population vs individual consideration
 */
export interface PopulationConsideration {
  /** The consideration type */
  type: "subgroup_variation" | "individual_response" | "distribution" | "heterogeneity";
  /** Description */
  description: string;
  /** Whether user has addressed this */
  addressed: boolean;
  /** User's notes */
  notes?: string;
}

/**
 * Result of the Scale Check operator
 */
export interface ScaleCheckResult {
  /** Effect size specification */
  effectSize: EffectSizeSpec;
  /** Context comparison results */
  contextComparison: ContextComparison;
  /** Measurement assessment */
  measurementAssessment: MeasurementAssessment;
  /** Practical significance assessment */
  practicalSignificance: PracticalSignificance;
  /** Population/individual considerations */
  populationConsiderations: PopulationConsideration[];
  /** Overall plausibility verdict */
  overallPlausibility: "plausible" | "questionable" | "implausible" | "needs_more_info";
  /** Summary notes */
  summaryNotes: string;
}

// ============================================================================
// Step Configurations
// ============================================================================

/**
 * Step IDs for the Scale Check operator
 */
export const SCALE_CHECK_STEP_IDS = {
  QUANTIFY: "quantify-effect",
  CONTEXTUALIZE: "contextualize-scale",
  PRECISION: "measurement-precision",
  PRACTICAL: "practical-significance",
  POPULATION: "population-individual",
} as const;

/**
 * Check if effect size has been specified
 */
function hasEffectSize(session: OperatorSession): boolean {
  const effectSize = session.userSelections[SCALE_CHECK_STEP_IDS.QUANTIFY] as
    | EffectSizeSpec
    | undefined;
  if (!effectSize) return false;
  return effectSize.value !== undefined || effectSize.estimate !== undefined;
}

/**
 * Check if context comparison has been reviewed
 */
function hasContextReview(session: OperatorSession): boolean {
  const comparison = session.generatedContent[SCALE_CHECK_STEP_IDS.CONTEXTUALIZE] as
    | ContextComparison
    | undefined;
  return comparison !== undefined;
}

/**
 * Check if measurement precision has been assessed
 */
function hasPrecisionAssessment(session: OperatorSession): boolean {
  const assessment = session.userSelections[SCALE_CHECK_STEP_IDS.PRECISION] as
    | MeasurementAssessment
    | undefined;
  return assessment !== undefined && assessment.powerNotes.length > 0;
}

/**
 * Check if practical significance has been assessed
 */
function hasPracticalAssessment(session: OperatorSession): boolean {
  const assessment = session.userSelections[SCALE_CHECK_STEP_IDS.PRACTICAL] as
    | PracticalSignificance
    | undefined;
  return assessment !== undefined && assessment.reasoning.length > 0;
}

/**
 * Check if population considerations have been addressed
 */
function hasPopulationConsiderations(session: OperatorSession): boolean {
  const considerations = session.userSelections[SCALE_CHECK_STEP_IDS.POPULATION] as
    | PopulationConsideration[]
    | undefined;
  return Array.isArray(considerations) && considerations.some((c) => c.addressed);
}

/**
 * Step configurations for the Scale Check operator
 */
export const SCALE_CHECK_STEPS: OperatorStepConfig[] = [
  {
    id: SCALE_CHECK_STEP_IDS.QUANTIFY,
    name: "Quantify the Effect",
    description:
      "How big is the effect you're claiming? Even a rough estimate helps assess plausibility.",
    helpText: `
**Why this matters:**
Most hypotheses are vague about effect magnitude. "X causes Y" doesn't tell us if
it's a 1% effect or a 100% effect. Forcing quantification:
- Reveals hidden assumptions
- Enables comparison to known effects
- Determines what precision you need

**Common effect size metrics:**
- r (correlation): -1 to +1, where 0.1 = small, 0.3 = medium, 0.5 = large
- d (Cohen's d): 0.2 = small, 0.5 = medium, 0.8 = large
- OR (Odds Ratio): 1 = no effect, <1 or >1 = effect
- Percentage: The expected percent change
    `.trim(),
    isComplete: hasEffectSize,
    validate: (session) => {
      if (!hasEffectSize(session)) {
        return {
          valid: false,
          errors: ["Specify an effect size or magnitude estimate"],
          warnings: [],
        };
      }
      return { valid: true, errors: [], warnings: [] };
    },
  },
  {
    id: SCALE_CHECK_STEP_IDS.CONTEXTUALIZE,
    name: "Contextualize the Scale",
    description: "How does your claimed effect compare to typical effects in this domain?",
    helpText: `
**Why this matters:**
A "large" effect in one field might be tiny in another. Context helps you:
- Calibrate expectations
- Identify suspiciously large claims
- Understand what you're actually explaining

**Key insight:**
r = 0.3 means you're explaining only 9% of the variance (r²).
That means 91% is something else.

**Brenner's warning:**
"If your effect size is much larger than anything else in the field,
you're probably measuring something different than you think."
    `.trim(),
    isComplete: hasContextReview,
  },
  {
    id: SCALE_CHECK_STEP_IDS.PRECISION,
    name: "Measurement Precision",
    description: "Can you actually detect an effect of this size with your methods?",
    helpText: `
**Why this matters:**
If your measurement error is larger than your expected effect, you can't
detect the effect even if it exists.

**Key questions:**
- What's the precision of your instruments/measures?
- What sample size would you need?
- What's your minimum detectable effect?

**Rule of thumb:**
For 80% power to detect d = 0.3, you need n ≈ 350 per group.
Many studies are dramatically underpowered.

**Brenner's principle:**
"The effect you can claim is constrained by the precision of your measurement.
If you can't measure it, you can't claim it."
    `.trim(),
    isComplete: hasPrecisionAssessment,
    canSkip: true,
  },
  {
    id: SCALE_CHECK_STEP_IDS.PRACTICAL,
    name: "Practical Significance",
    description: "Even if the effect is statistically real, does it matter in practice?",
    helpText: `
**Why this matters:**
Statistical significance ≠ practical importance. A tiny effect can be
"significant" with enough data but meaningless in practice.

**Key questions:**
- Who would care about an effect of this size?
- At what threshold does this become actionable?
- What decisions would change based on this effect?

**Example:**
A drug that reduces symptom duration by 6 hours (d = 0.15) might be
"statistically significant" but not worth the side effects.

**Brenner's test:**
"Would you change your behavior based on this effect size?
Would anyone?"
    `.trim(),
    isComplete: hasPracticalAssessment,
  },
  {
    id: SCALE_CHECK_STEP_IDS.POPULATION,
    name: "Population vs Individual",
    description: "Does your average effect hide important variation across individuals or groups?",
    helpText: `
**Why this matters:**
Population averages can mask:
- Subgroups with opposite effects
- High responders and non-responders
- Context-dependent effects

**Key considerations:**
1. **Subgroup Variation**: Does the effect differ by age, gender, etc.?
2. **Individual Response**: Are some people harmed while others benefit?
3. **Distribution**: Is the effect uniform or highly variable?
4. **Heterogeneity**: What moderates the effect?

**Brenner's insight:**
"An average effect of zero could mean everyone has zero effect,
or half the people are harmed and half are helped equally.
These are very different realities."
    `.trim(),
    isComplete: hasPopulationConsiderations,
    validate: (session) => {
      if (!hasPopulationConsiderations(session)) {
        return {
          valid: false,
          errors: ["Address at least one population consideration"],
          warnings: [],
        };
      }
      return { valid: true, errors: [], warnings: [] };
    },
  },
];

// ============================================================================
// Effect Size Utilities
// ============================================================================

/**
 * Cohen's conventions for effect sizes
 */
export const EFFECT_SIZE_CONVENTIONS: Record<EffectSizeType, Record<EffectMagnitude, number>> = {
  r: {
    negligible: 0.05,
    small: 0.1,
    medium: 0.3,
    large: 0.5,
    very_large: 0.7,
  },
  d: {
    negligible: 0.1,
    small: 0.2,
    medium: 0.5,
    large: 0.8,
    very_large: 1.2,
  },
  OR: {
    negligible: 1.2,
    small: 1.5,
    medium: 2.0,
    large: 3.0,
    very_large: 5.0,
  },
  RR: {
    negligible: 1.1,
    small: 1.25,
    medium: 1.5,
    large: 2.0,
    very_large: 3.0,
  },
  percentage: {
    negligible: 1,
    small: 5,
    medium: 15,
    large: 30,
    very_large: 50,
  },
  estimate: {
    negligible: 0,
    small: 1,
    medium: 2,
    large: 3,
    very_large: 4,
  },
};

/**
 * Convert effect size estimate to approximate value
 */
export function estimateToValue(estimate: EffectMagnitude, type: EffectSizeType): number {
  return EFFECT_SIZE_CONVENTIONS[type][estimate];
}

/**
 * Classify a numeric effect size into magnitude category
 */
export function classifyEffectSize(value: number, type: EffectSizeType): EffectMagnitude {
  const conventions = EFFECT_SIZE_CONVENTIONS[type];

  if (type === "r" || type === "d") {
    // Use absolute value for these
    const absValue = Math.abs(value);
    if (absValue < conventions.small) return "negligible";
    if (absValue < conventions.medium) return "small";
    if (absValue < conventions.large) return "medium";
    if (absValue < conventions.very_large) return "large";
    return "very_large";
  }

  if (type === "OR" || type === "RR") {
    // These are ratios - distance from 1 matters
    const distance = value > 1 ? value : 1 / value;
    if (distance < conventions.small) return "negligible";
    if (distance < conventions.medium) return "small";
    if (distance < conventions.large) return "medium";
    if (distance < conventions.very_large) return "large";
    return "very_large";
  }

  // Percentage
  const absValue = Math.abs(value);
  if (absValue < conventions.small) return "negligible";
  if (absValue < conventions.medium) return "small";
  if (absValue < conventions.large) return "medium";
  if (absValue < conventions.very_large) return "large";
  return "very_large";
}

/**
 * Calculate variance explained from correlation
 */
export function varianceExplained(r: number): number {
  return r * r * 100; // As percentage
}

/**
 * Approximate sample size needed for 80% power
 * This is a simplified calculation for d-type effects
 */
export function approximateSampleSize(d: number, power: number = 0.8): number {
  // Simplified formula: n ≈ 2 * (z_alpha + z_beta)^2 / d^2
  // For 80% power and alpha = 0.05: (1.96 + 0.84)^2 ≈ 7.85
  if (d === 0) return Infinity;
  const factor = power === 0.8 ? 7.85 : power === 0.9 ? 10.5 : 7.85;
  return Math.ceil((2 * factor) / (d * d));
}

// ============================================================================
// Domain Context Generation
// ============================================================================

/**
 * Default domain contexts with typical effect sizes
 */
export const DOMAIN_CONTEXTS: Record<string, DomainContext> = {
  psychology: {
    domain: "Psychology",
    typicalEffects: [
      {
        description: "Stereotype threat on test performance",
        value: 0.26,
        type: "d",
        source: "Meta-analysis",
      },
      {
        description: "Growth mindset interventions",
        value: 0.19,
        type: "d",
        source: "Meta-analysis",
      },
      {
        description: "Therapy for depression (CBT)",
        value: 0.73,
        type: "d",
        source: "Meta-analysis",
      },
    ],
    warningThreshold: 0.8,
    benchmarks: [
      { label: "Small effect (Cohen)", value: 0.2 },
      { label: "Medium effect (Cohen)", value: 0.5 },
      { label: "Large effect (Cohen)", value: 0.8 },
    ],
  },
  medicine: {
    domain: "Medicine",
    typicalEffects: [
      {
        description: "Aspirin for cardiovascular events",
        value: 0.78,
        type: "OR",
        source: "Meta-analysis",
      },
      {
        description: "Statins for cardiovascular events",
        value: 0.75,
        type: "RR",
        source: "Meta-analysis",
      },
      { description: "SSRIs for depression", value: 0.3, type: "d", source: "Meta-analysis" },
    ],
    warningThreshold: 0.5,
    benchmarks: [
      { label: "NNT = 100 (OR ~0.99)", value: 0.99 },
      { label: "NNT = 20 (OR ~0.95)", value: 0.95 },
      { label: "NNT = 10 (OR ~0.90)", value: 0.9 },
    ],
  },
  education: {
    domain: "Education",
    typicalEffects: [
      { description: "Class size reduction", value: 0.21, type: "d", source: "STAR study" },
      { description: "Tutoring interventions", value: 0.36, type: "d", source: "Meta-analysis" },
      { description: "Technology in education", value: 0.15, type: "d", source: "Meta-analysis" },
    ],
    warningThreshold: 0.6,
    benchmarks: [
      { label: "One year of learning", value: 0.4 },
      { label: "Typical intervention", value: 0.2 },
      { label: "Exceptional intervention", value: 0.6 },
    ],
  },
  social_science: {
    domain: "Social Science",
    typicalEffects: [
      { description: "Nudge interventions", value: 0.08, type: "d", source: "Meta-analysis" },
      {
        description: "Media effects on attitudes",
        value: 0.15,
        type: "r",
        source: "Meta-analysis",
      },
      { description: "Economic incentives", value: 0.25, type: "d", source: "Various" },
    ],
    warningThreshold: 0.5,
    benchmarks: [
      { label: "Typical correlation in social science", value: 0.21 },
      { label: "Published effect (often inflated)", value: 0.35 },
    ],
  },
  technology: {
    domain: "Technology/HCI",
    typicalEffects: [
      {
        description: "UI improvement on conversion",
        value: 5,
        type: "percentage",
        source: "Industry",
      },
      {
        description: "Recommendation algorithm impact",
        value: 15,
        type: "percentage",
        source: "Industry",
      },
    ],
    warningThreshold: 30,
    benchmarks: [
      { label: "Minor UI tweak", value: 2 },
      { label: "Major feature change", value: 10 },
      { label: "Paradigm shift", value: 25 },
    ],
  },
  default: {
    domain: "General",
    typicalEffects: [],
    warningThreshold: 0.8,
    benchmarks: [
      { label: "Small effect", value: 0.2 },
      { label: "Medium effect", value: 0.5 },
      { label: "Large effect", value: 0.8 },
    ],
  },
};

/**
 * Get domain context based on hypothesis domains
 */
export function getDomainContext(hypothesis: HypothesisCard): DomainContext {
  const domains = hypothesis.domain.map((d) => d.toLowerCase());

  // Try to match to a known domain
  for (const [key, context] of Object.entries(DOMAIN_CONTEXTS)) {
    if (key === "default") continue;
    if (domains.some((d) => d.includes(key) || key.includes(d))) {
      return context;
    }
  }

  return DOMAIN_CONTEXTS.default;
}

// ============================================================================
// Context Comparison
// ============================================================================

/**
 * Generate context comparison for the effect size
 */
export function generateContextComparison(
  effectSize: EffectSizeSpec,
  domainContext: DomainContext,
): ContextComparison {
  const warnings: string[] = [];
  const insights: string[] = [];

  // Get numeric value
  let value: number;
  if (effectSize.value !== undefined) {
    value = effectSize.value;
  } else if (effectSize.estimate !== undefined) {
    value = estimateToValue(effectSize.estimate, effectSize.type);
  } else {
    return {
      relativeToNorm: "typical",
      benchmarksWithComparisons: [],
      warnings: ["Effect size not fully specified"],
      insights: [],
    };
  }

  // Calculate variance explained for correlations
  let varianceExplainedPct: number | undefined;
  if (effectSize.type === "r") {
    varianceExplainedPct = varianceExplained(value);
    insights.push(
      `An r of ${value.toFixed(2)} explains ${varianceExplainedPct.toFixed(1)}% of the variance. ` +
        `The remaining ${(100 - varianceExplainedPct).toFixed(1)}% is due to other factors.`,
    );
  }

  // Compare to benchmarks
  const benchmarksWithComparisons = domainContext.benchmarks.map((b) => ({
    ...b,
    comparison: (Math.abs(value) < b.value * 0.8
      ? "smaller"
      : Math.abs(value) > b.value * 1.2
        ? "larger"
        : "similar") as "smaller" | "similar" | "larger",
  }));

  // Determine relative to norm
  const magnitude = effectSize.estimate ?? classifyEffectSize(value, effectSize.type);
  let relativeToNorm: ContextComparison["relativeToNorm"];

  if (magnitude === "negligible" || magnitude === "small") {
    relativeToNorm = "below_typical";
  } else if (magnitude === "medium") {
    relativeToNorm = "typical";
  } else if (magnitude === "large") {
    relativeToNorm = "above_typical";
  } else {
    relativeToNorm = "exceptional";
    warnings.push(
      "This effect size is exceptionally large. Effects this big are rare and often indicate " +
        "measurement issues, selection effects, or confounding rather than true causal effects.",
    );
  }

  // Check against domain warning threshold
  if (effectSize.type === "d" || effectSize.type === "r") {
    if (Math.abs(value) > domainContext.warningThreshold) {
      warnings.push(
        `This effect (${value.toFixed(2)}) exceeds typical maximum effects in ${domainContext.domain} ` +
          `(threshold: ${domainContext.warningThreshold}). Consider whether this is truly a direct effect ` +
          `or whether confounds might be inflating the estimate.`,
      );
    }
  }

  return {
    relativeToNorm,
    varianceExplained: varianceExplainedPct,
    benchmarksWithComparisons,
    warnings,
    insights,
  };
}

// ============================================================================
// Population Considerations
// ============================================================================

/**
 * Default population considerations to review
 */
export const DEFAULT_POPULATION_CONSIDERATIONS: Omit<
  PopulationConsideration,
  "addressed" | "notes"
>[] = [
  {
    type: "subgroup_variation",
    description:
      "Could the effect differ substantially across subgroups (age, gender, demographics, etc.)?",
  },
  {
    type: "individual_response",
    description: "Might some individuals be harmed while others benefit, yielding a null average?",
  },
  {
    type: "distribution",
    description: "Is the effect uniformly distributed or highly variable across individuals?",
  },
  {
    type: "heterogeneity",
    description: "What factors might moderate the effect (context, timing, dosage)?",
  },
];

/**
 * Generate initial population considerations
 */
export function generatePopulationConsiderations(): PopulationConsideration[] {
  return DEFAULT_POPULATION_CONSIDERATIONS.map((c) => ({
    ...c,
    addressed: false,
    notes: "",
  }));
}

// ============================================================================
// Result Building
// ============================================================================

/**
 * Build the complete Scale Check result from session state
 */
export function buildScaleCheckResult(
  session: OperatorSession<ScaleCheckResult>,
): ScaleCheckResult {
  const effectSize = (session.userSelections[SCALE_CHECK_STEP_IDS.QUANTIFY] as EffectSizeSpec) ?? {
    type: "estimate" as const,
    estimate: "medium" as EffectMagnitude,
    direction: "change" as EffectDirection,
  };

  const contextComparison = (session.generatedContent[
    SCALE_CHECK_STEP_IDS.CONTEXTUALIZE
  ] as ContextComparison) ?? {
    relativeToNorm: "typical",
    benchmarksWithComparisons: [],
    warnings: [],
    insights: [],
  };

  const measurementAssessment = (session.userSelections[
    SCALE_CHECK_STEP_IDS.PRECISION
  ] as MeasurementAssessment) ?? {
    isDetectable: null,
    powerNotes: "",
    warnings: [],
  };

  const practicalSignificance = (session.userSelections[
    SCALE_CHECK_STEP_IDS.PRACTICAL
  ] as PracticalSignificance) ?? {
    isPracticallyMeaningful: null,
    stakeholders: [],
    reasoning: "",
  };

  const populationConsiderations =
    (session.userSelections[SCALE_CHECK_STEP_IDS.POPULATION] as PopulationConsideration[]) ?? [];

  // Determine overall plausibility
  let overallPlausibility: ScaleCheckResult["overallPlausibility"] = "plausible";

  const hasWarnings =
    contextComparison.warnings.length > 0 || measurementAssessment.warnings.length > 0;
  const isDetectable = measurementAssessment.isDetectable;
  const isPractical = practicalSignificance.isPracticallyMeaningful;

  if (isDetectable === false || isPractical === false) {
    overallPlausibility = "implausible";
  } else if (hasWarnings || contextComparison.relativeToNorm === "exceptional") {
    overallPlausibility = "questionable";
  } else if (isDetectable === null || isPractical === null) {
    overallPlausibility = "needs_more_info";
  }

  return {
    effectSize,
    contextComparison,
    measurementAssessment,
    practicalSignificance,
    populationConsiderations,
    overallPlausibility,
    summaryNotes: session.notes ?? "",
  };
}

// ============================================================================
// Brenner Quotes for Scale Check
// ============================================================================

/**
 * Quote bank section IDs relevant to Scale Check
 */
export const SCALE_CHECK_QUOTE_ANCHORS = [
  "§31", // Effect sizes
  "§33", // Measurement precision
  "§58", // Practical significance
];

/**
 * Fallback quotes if quote bank is unavailable
 */
export const SCALE_CHECK_FALLBACK_QUOTES = [
  {
    sectionId: "§31",
    title: "Effect Sizes",
    quote: "Is your phenomenon at the right scale? Many effects vanish when you zoom in or out.",
    context: "Brenner on the importance of quantifying effects",
    tags: ["scale-check", "effect-size"],
  },
  {
    sectionId: "§33",
    title: "Measurement Precision",
    quote:
      "The effect you can claim is constrained by the precision of your measurement. If you can't measure it, you can't claim it.",
    context: "On the relationship between measurement and claims",
    tags: ["scale-check", "precision"],
  },
  {
    sectionId: "§58",
    title: "Practical Significance",
    quote: "Would you change your behavior based on this effect size? Would anyone?",
    context: "The test for practical vs statistical significance",
    tags: ["scale-check", "practical-significance"],
  },
];
